import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundFetch, { HeadlessEvent } from 'react-native-background-fetch';
import { apiFetch } from '../config/api';
import {
  getMostRecentForegroundUsage,
  getRecentForegroundUsage,
  hasUsageAccess,
  hasUsageModule,
  openUsageAccessSettings,
} from './usageStats';

const AUTH_TOKEN_KEY = '@homealone/token';
const USAGE_ACCESS_PROMPTED_KEY = '@homealone/usage-access-prompted';
const LAST_USAGE_RESET_KEY = '@homealone/last-usage-reset-ms';
const FAST_TASK_ID = 'homealone-activity-reset-fast';
export const ACTIVE_USAGE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const BACKGROUND_USAGE_THRESHOLD_MS = 20 * 60 * 1000; // 20 minutes for delayed background callbacks
const BACKGROUND_MIN_GAP_MS = 45 * 1000;
const ATTEMPT_INFLIGHT_TIMEOUT_MS = 15 * 1000;
const NOISE_PACKAGE_PATTERNS = [
  'launcher',
  'systemui',
  'keyguard',
  'permissioncontroller',
  'com.google.android.gms',
  'com.google.android.gsf',
];

let workerConfigured = false;
let lastBackgroundAttemptAtMs = 0;
let attemptInFlight = false;
let attemptInFlightStartedAtMs = 0;
let lastUsageResetMsCache: number | null = null;
let lastUsageResetMsLoaded = false;

async function getLastUsageResetMs(): Promise<number | null> {
  if (lastUsageResetMsLoaded) return lastUsageResetMsCache;
  try {
    const raw = await AsyncStorage.getItem(LAST_USAGE_RESET_KEY);
    const parsed = raw ? Number(raw) : NaN;
    lastUsageResetMsCache = Number.isFinite(parsed) ? parsed : null;
  } catch (e) {
    console.log('[activityResetWorker] failed to read last usage reset', e);
    lastUsageResetMsCache = null;
  } finally {
    lastUsageResetMsLoaded = true;
  }
  return lastUsageResetMsCache;
}

async function setLastUsageResetMs(value: number | null): Promise<void> {
  lastUsageResetMsCache = value;
  lastUsageResetMsLoaded = true;
  try {
    if (value == null) {
      await AsyncStorage.removeItem(LAST_USAGE_RESET_KEY);
    } else {
      await AsyncStorage.setItem(LAST_USAGE_RESET_KEY, String(value));
    }
  } catch (e) {
    console.log('[activityResetWorker] failed to persist last usage reset', e);
  }
}

export type ActivityResetResult = {
  active: boolean;
  resetSent: boolean;
  reason?: string;
  attemptId?: string;
  serverReason?: string;
};

export type RunActivityResetOptions = {
  tokenOverride?: string;
  forceActive?: boolean;
  source?: string;
};

export async function runActivityResetCheck(
  options: RunActivityResetOptions = {},
): Promise<ActivityResetResult> {
  const { tokenOverride, forceActive = false, source = 'unknown' } = options;
  const attemptId = `ar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[activityResetWorker][${attemptId}] start source=${source} forceActive=${forceActive}`);

  const isBackgroundSource = source.startsWith('background-fetch:') || source.startsWith('headless:');
  const thresholdMs = isBackgroundSource
    ? BACKGROUND_USAGE_THRESHOLD_MS
    : ACTIVE_USAGE_THRESHOLD_MS;

  if (isBackgroundSource) {
    const nowMs = Date.now();
    if (lastBackgroundAttemptAtMs && nowMs - lastBackgroundAttemptAtMs < BACKGROUND_MIN_GAP_MS) {
      console.log(
        `[activityResetWorker][${attemptId}] skip reason=background-throttled gapMs=${
          nowMs - lastBackgroundAttemptAtMs
        } minGapMs=${BACKGROUND_MIN_GAP_MS}`,
      );
      return { active: false, resetSent: false, reason: 'background-throttled', attemptId };
    }
    lastBackgroundAttemptAtMs = nowMs;
  }

  if (attemptInFlight) {
    const nowMs = Date.now();
    if (attemptInFlightStartedAtMs && nowMs - attemptInFlightStartedAtMs > ATTEMPT_INFLIGHT_TIMEOUT_MS) {
      console.log(
        `[activityResetWorker][${attemptId}] clearing stale attempt-in-flight ageMs=${
          nowMs - attemptInFlightStartedAtMs
        } timeoutMs=${ATTEMPT_INFLIGHT_TIMEOUT_MS}`,
      );
      attemptInFlight = false;
      attemptInFlightStartedAtMs = 0;
    }
  }

  if (attemptInFlight) {
    console.log(`[activityResetWorker][${attemptId}] skip reason=attempt-in-flight`);
    return { active: false, resetSent: false, reason: 'attempt-in-flight', attemptId };
  }
  attemptInFlight = true;
  attemptInFlightStartedAtMs = Date.now();

  try {
    const token = tokenOverride || (await AsyncStorage.getItem(AUTH_TOKEN_KEY));
    if (!token) {
      console.log(`[activityResetWorker][${attemptId}] abort reason=no-token`);
      return { active: false, resetSent: false, reason: 'no-token', attemptId };
    }

    const moduleAvailable = hasUsageModule();
    console.log(`[activityResetWorker][${attemptId}] usageModuleAvailable=${moduleAvailable}`);

    let snapshot: Awaited<ReturnType<typeof getMostRecentForegroundUsage>> | null = null;
    let chosenSnapshot: Awaited<ReturnType<typeof getMostRecentForegroundUsage>> | null = null;
    let usageActive = false;
    let usageRecent = false;
    let permissionGranted = false;
    let usageIsNew = true;

    if (moduleAvailable) {
      permissionGranted = await hasUsageAccess();
      console.log(`[activityResetWorker][${attemptId}] usageAccessGranted=${permissionGranted}`);

      if (permissionGranted) {
        snapshot = await getMostRecentForegroundUsage();
        chosenSnapshot = snapshot;
        if (snapshot?.lastTimeUsed) {
          const now = Date.now();
          const ageMs = now - snapshot.lastTimeUsed;
          const packageName = (snapshot.packageName || '').toLowerCase();
          const isNoisePackage = NOISE_PACKAGE_PATTERNS.some(pattern => packageName.includes(pattern));
          const lastResetMs = await getLastUsageResetMs();
          usageIsNew = !(lastResetMs && snapshot.lastTimeUsed <= lastResetMs);
          if (!usageIsNew) {
            console.log(
              `[activityResetWorker][${attemptId}] usage not new lastTimeUsed=${snapshot.lastTimeUsed} lastResetMs=${lastResetMs}`,
            );
          }
          usageRecent = !isNoisePackage && ageMs < thresholdMs;
          usageActive = usageRecent && usageIsNew;
          console.log(
            `[activityResetWorker][${attemptId}] usageSnapshot package=${snapshot.packageName || 'n/a'} lastTimeUsed=${new Date(
              snapshot.lastTimeUsed,
            ).toISOString()} ageMs=${ageMs} thresholdMs=${thresholdMs} isNoisePackage=${isNoisePackage} usageRecent=${usageRecent} usageIsNew=${usageIsNew} usageActive=${usageActive}`,
          );
          if (isNoisePackage) {
            console.log(`[activityResetWorker][${attemptId}] package treated as idle/noise`);
            const recent = await getRecentForegroundUsage(3);
            if (recent.length) {
              console.log(
                `[activityResetWorker][${attemptId}] recentUsageTop3=${JSON.stringify(recent)}`,
              );
              const fallback = recent.find(entry => {
                const pkg = (entry.packageName || '').toLowerCase();
                const noise = NOISE_PACKAGE_PATTERNS.some(pattern => pkg.includes(pattern));
                const entryAgeMs = now - entry.lastTimeUsed;
                return !noise && entryAgeMs < thresholdMs;
              });
              if (fallback) {
                chosenSnapshot = fallback;
                const fallbackAgeMs = now - fallback.lastTimeUsed;
                const fallbackPackage = (fallback.packageName || '').toLowerCase();
                const fallbackNoise = NOISE_PACKAGE_PATTERNS.some(pattern =>
                  fallbackPackage.includes(pattern),
                );
                const fallbackUsageIsNew = !(lastResetMs && fallback.lastTimeUsed <= lastResetMs);
                usageRecent = !fallbackNoise && fallbackAgeMs < thresholdMs;
                usageIsNew = fallbackUsageIsNew;
                usageActive = usageRecent && usageIsNew;
                console.log(
                  `[activityResetWorker][${attemptId}] fallbackSnapshot package=${fallback.packageName} lastTimeUsed=${new Date(
                    fallback.lastTimeUsed,
                  ).toISOString()} ageMs=${fallbackAgeMs} usageRecent=${usageRecent} usageIsNew=${fallbackUsageIsNew}`,
                );
              }
            }
          }
        } else {
          console.log(`[activityResetWorker][${attemptId}] usageSnapshot missing or has no lastTimeUsed`);
        }
      }
    }

    const active = forceActive || usageRecent;
    const shouldReset = usageActive;
    console.log(
      `[activityResetWorker][${attemptId}] activeDecision forceActive=${forceActive} usageRecent=${usageRecent} usageIsNew=${usageIsNew} active=${active} shouldReset=${shouldReset}`,
    );

    if (!shouldReset) {
      if (!moduleAvailable) {
        console.log(`[activityResetWorker][${attemptId}] abort reason=usage-module-unavailable`);
        return {
          active,
          resetSent: false,
          reason: 'usage-module-unavailable',
          attemptId,
        };
      }
      if (!permissionGranted) {
        console.log(`[activityResetWorker][${attemptId}] abort reason=usage-access-not-granted`);
        return {
          active,
          resetSent: false,
          reason: 'usage-access-not-granted',
          attemptId,
        };
      }
      if (!snapshot || !snapshot.lastTimeUsed) {
        console.log(`[activityResetWorker][${attemptId}] abort reason=no-usage-snapshot`);
        return { active, resetSent: false, reason: 'no-usage-snapshot', attemptId };
      }
      if (!usageIsNew) {
        console.log(`[activityResetWorker][${attemptId}] abort reason=usage-not-new`);
        return { active, resetSent: false, reason: 'usage-not-new', attemptId };
      }
      if (!usageRecent) {
        console.log(`[activityResetWorker][${attemptId}] abort reason=idle`);
        return { active, resetSent: false, reason: 'idle', attemptId };
      }
      console.log(`[activityResetWorker][${attemptId}] abort reason=idle`);
      return { active, resetSent: false, reason: 'idle', attemptId };
    }

    const payload = {
      requestId: attemptId,
      source,
      lastTimeUsed: chosenSnapshot?.lastTimeUsed || snapshot?.lastTimeUsed || Date.now(),
      packageName: chosenSnapshot?.packageName || snapshot?.packageName || 'com.homealone',
      thresholdMs,
      forceActive,
    };

    console.log(
      `[activityResetWorker][${attemptId}] sending /users/check-in-reset payload`,
      JSON.stringify(payload),
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await apiFetch<{
        ok?: boolean;
        ignored?: boolean;
        reason?: string;
        nextCheckInAt?: string | null;
        hardDeadlineAt?: string | null;
        requestId?: string;
      }>('/users/check-in-reset', {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      console.log(
        `[activityResetWorker][${attemptId}] /users/check-in-reset response`,
        JSON.stringify(response),
      );

      const lastUsageTime = chosenSnapshot?.lastTimeUsed || snapshot?.lastTimeUsed;
      if (lastUsageTime && (response?.ok === true || response?.ignored === true)) {
        await setLastUsageResetMs(lastUsageTime);
      }

      return {
        active: true,
        resetSent: response?.ok === true,
        reason: response?.reason,
        attemptId,
        serverReason: response?.reason,
      };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.log(`[activityResetWorker][${attemptId}] /users/check-in-reset aborted`);
      }
      console.log(
        `[activityResetWorker][${attemptId}] /users/check-in-reset failed`,
        error?.message || String(error),
      );
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  } finally {
    attemptInFlight = false;
    attemptInFlightStartedAtMs = 0;
  }
}

export async function configureActivityResetWorker(): Promise<void> {
  if (workerConfigured) {
    console.log('[activityResetWorker] configure skipped (already configured)');
    return;
  }

  console.log('[activityResetWorker] configure start');
  workerConfigured = true;

  try {
    await BackgroundFetch.configure(
      {
        minimumFetchInterval: 15,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
        requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
      },
      async taskId => {
        console.log(`[activityResetWorker] BackgroundFetch event taskId=${taskId}`);
        try {
          await runActivityResetCheck({ source: `background-fetch:${taskId}` });
        } finally {
          BackgroundFetch.finish(taskId);
        }
      },
      taskId => {
        console.log(`[activityResetWorker] BackgroundFetch timeout taskId=${taskId}`);
        BackgroundFetch.finish(taskId);
      },
    );

    // Add a faster alarm-based task on Android to reduce inactivity-detection lag.
    // This does not bypass all OS throttling, but improves cadence over the default fetch window.
    await BackgroundFetch.scheduleTask({
      taskId: FAST_TASK_ID,
      delay: 60 * 1000,
      periodic: true,
      forceAlarmManager: true,
      stopOnTerminate: false,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    });
    console.log(
      `[activityResetWorker] configure success minimumFetchInterval=15 fastTaskId=${FAST_TASK_ID} delayMs=60000`,
    );
    await BackgroundFetch.start();
    console.log('[activityResetWorker] BackgroundFetch started');
  } catch (error) {
    console.log('[activityResetWorker] Failed to configure background fetch', error);
  }
}

export async function ensureUsageAccessOrPrompt(): Promise<void> {
  if (!hasUsageModule()) {
    console.log('[activityResetWorker] ensureUsageAccessOrPrompt skipped (usage module unavailable)');
    return;
  }
  const allowed = await hasUsageAccess();
  if (!allowed) {
    console.log('[activityResetWorker] usage access missing');
    const prompted = await AsyncStorage.getItem(USAGE_ACCESS_PROMPTED_KEY);
    if (prompted === '1') {
      console.log('[activityResetWorker] usage settings prompt already shown before; skipping');
      return;
    }
    await AsyncStorage.setItem(USAGE_ACCESS_PROMPTED_KEY, '1');
    console.log('[activityResetWorker] opening Android usage access settings');
    openUsageAccessSettings();
  } else {
    console.log('[activityResetWorker] usage access already granted');
    await AsyncStorage.removeItem(USAGE_ACCESS_PROMPTED_KEY);
  }
}

export const activityResetHeadlessTask = async (event: HeadlessEvent) => {
  const { taskId, timeout } = event;
  console.log(`[activityResetWorker] headless task received taskId=${taskId} timeout=${timeout}`);

  if (timeout) {
    BackgroundFetch.finish(taskId);
    return;
  }

  try {
    await runActivityResetCheck({ source: `headless:${taskId}` });
  } finally {
    BackgroundFetch.finish(taskId);
    console.log(`[activityResetWorker] headless task finished taskId=${taskId}`);
  }
};
