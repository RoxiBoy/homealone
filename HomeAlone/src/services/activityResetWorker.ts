import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundFetch, { HeadlessEvent } from 'react-native-background-fetch';
import { apiFetch } from '../config/api';
import {
  getForegroundUsageWithTime,
  getMostRecentForegroundUsage,
  getRecentForegroundUsage,
  hasUsageAccess,
  hasUsageModule,
  openUsageAccessSettings,
} from './usageStats';

const AUTH_TOKEN_KEY = '@homealone/token';
const USAGE_ACCESS_PROMPTED_KEY = '@homealone/usage-access-prompted';
const LAST_USAGE_RESET_KEY = '@homealone/last-usage-reset-ms';
const FG_SNAPSHOT_KEY = '@homealone/last-foreground-snapshot';
const FAST_TASK_ID = 'homealone-activity-reset-fast';
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

async function setLastUsageResetMs(value: number | null): Promise<void> {
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

type ForegroundSnapshot = {
  packageName: string;
  totalTimeInForeground: number;
  polledAt: number;
};

let fgSnapshotCache: ForegroundSnapshot | null = null;
let fgSnapshotLoaded = false;

async function getLastForegroundSnapshot(): Promise<ForegroundSnapshot | null> {
  if (fgSnapshotLoaded) return fgSnapshotCache;
  try {
    const raw = await AsyncStorage.getItem(FG_SNAPSHOT_KEY);
    fgSnapshotCache = raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.log('[activityResetWorker] failed to read foreground snapshot', e);
    fgSnapshotCache = null;
  } finally {
    fgSnapshotLoaded = true;
  }
  return fgSnapshotCache;
}

async function setLastForegroundSnapshot(value: ForegroundSnapshot | null): Promise<void> {
  fgSnapshotCache = value;
  fgSnapshotLoaded = true;
  try {
    if (value == null) {
      await AsyncStorage.removeItem(FG_SNAPSHOT_KEY);
    } else {
      await AsyncStorage.setItem(FG_SNAPSHOT_KEY, JSON.stringify(value));
    }
  } catch (e) {
    console.log('[activityResetWorker] failed to persist foreground snapshot', e);
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

    let chosenSnapshot: Awaited<ReturnType<typeof getMostRecentForegroundUsage>> | null = null;
    let genuinelyActiveNow = false;
    let permissionGranted = false;

    if (moduleAvailable) {
      permissionGranted = await hasUsageAccess();
      console.log(`[activityResetWorker][${attemptId}] usageAccessGranted=${permissionGranted}`);

      if (permissionGranted) {
        const fgSnapshot = await getForegroundUsageWithTime();
        const prevSnapshot = await getLastForegroundSnapshot();

        if (fgSnapshot && fgSnapshot.packageName) {
          const packageName = fgSnapshot.packageName.toLowerCase();
          const isNoisePackage = NOISE_PACKAGE_PATTERNS.some(pattern => packageName.includes(pattern));

          if (isNoisePackage) {
            console.log(`[activityResetWorker][${attemptId}] primary package is noise: ${fgSnapshot.packageName}`);
            const recent = await getRecentForegroundUsage(3);
            const fallback = recent.find(entry => {
              const pkg = (entry.packageName || '').toLowerCase();
              return !NOISE_PACKAGE_PATTERNS.some(pattern => pkg.includes(pattern));
            });
            if (fallback) {
              chosenSnapshot = fallback;
              if (!prevSnapshot) {
                genuinelyActiveNow = true;
                console.log(`[activityResetWorker][${attemptId}] fallback first-tick — treating as active`);
              } else if (prevSnapshot.packageName === fallback.packageName) {
                const deltaMs = (fallback.totalTimeInForeground || 0) - prevSnapshot.totalTimeInForeground;
                genuinelyActiveNow = deltaMs > 0;
                console.log(
                  `[activityResetWorker][${attemptId}] fallback delta pkg=${fallback.packageName} prev=${prevSnapshot.totalTimeInForeground} current=${fallback.totalTimeInForeground} deltaMs=${deltaMs} active=${genuinelyActiveNow}`,
                );
              } else {
                genuinelyActiveNow = true;
                console.log(
                  `[activityResetWorker][${attemptId}] fallback app-switch from ${prevSnapshot.packageName} to ${fallback.packageName} — treating as active`,
                );
              }
            } else {
              console.log(`[activityResetWorker][${attemptId}] no non-noise fallback found`);
            }
          } else {
            chosenSnapshot = fgSnapshot;
            if (!prevSnapshot) {
              genuinelyActiveNow = true;
              console.log(`[activityResetWorker][${attemptId}] first tick, no previous snapshot — treating as active`);
            } else if (prevSnapshot.packageName !== fgSnapshot.packageName) {
              genuinelyActiveNow = true;
              console.log(
                `[activityResetWorker][${attemptId}] app-switch from ${prevSnapshot.packageName} to ${fgSnapshot.packageName} — treating as active`,
              );
            } else {
              const deltaMs = fgSnapshot.totalTimeInForeground - prevSnapshot.totalTimeInForeground;
              genuinelyActiveNow = deltaMs > 0;
              console.log(
                `[activityResetWorker][${attemptId}] delta pkg=${fgSnapshot.packageName} prev=${prevSnapshot.totalTimeInForeground} current=${fgSnapshot.totalTimeInForeground} deltaMs=${deltaMs} active=${genuinelyActiveNow}`,
              );
            }

            await setLastForegroundSnapshot({
              packageName: fgSnapshot.packageName,
              totalTimeInForeground: fgSnapshot.totalTimeInForeground,
              polledAt: Date.now(),
            });
          }

          if (chosenSnapshot && chosenSnapshot !== fgSnapshot && chosenSnapshot.packageName !== fgSnapshot?.packageName) {
            await setLastForegroundSnapshot({
              packageName: chosenSnapshot.packageName,
              totalTimeInForeground: (chosenSnapshot as any).totalTimeInForeground || 0,
              polledAt: Date.now(),
            });
          }
        } else {
          console.log(`[activityResetWorker][${attemptId}] no foreground usage snapshot available`);
        }
      }
    }

    const active = forceActive || genuinelyActiveNow;
    const shouldReset = genuinelyActiveNow || forceActive;
    console.log(
      `[activityResetWorker][${attemptId}] activeDecision forceActive=${forceActive} genuinelyActiveNow=${genuinelyActiveNow} active=${active} shouldReset=${shouldReset}`,
    );

    if (!shouldReset) {
      if (!moduleAvailable) {
        console.log(`[activityResetWorker][${attemptId}] abort reason=usage-module-unavailable`);
        return { active, resetSent: false, reason: 'usage-module-unavailable', attemptId };
      }
      if (!permissionGranted) {
        console.log(`[activityResetWorker][${attemptId}] abort reason=usage-access-not-granted`);
        return { active, resetSent: false, reason: 'usage-access-not-granted', attemptId };
      }
      if (!fgSnapshot) {
        console.log(`[activityResetWorker][${attemptId}] abort reason=no-usage-snapshot`);
        return { active, resetSent: false, reason: 'no-usage-snapshot', attemptId };
      }
      console.log(`[activityResetWorker][${attemptId}] abort reason=idle`);
      return { active, resetSent: false, reason: 'idle', attemptId };
    }

    const payload = {
      requestId: attemptId,
      source,
      packageName: chosenSnapshot?.packageName || 'com.homealone',
      totalTimeInForeground: (chosenSnapshot as any)?.totalTimeInForeground || 0,
      polledAt: Date.now(),
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

      if (response?.ok === true || response?.ignored === true) {
        await setLastUsageResetMs(Date.now());
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
