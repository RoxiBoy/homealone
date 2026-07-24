import { Platform } from 'react-native';
import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
} from '@notifee/react-native';

// Versioned channel ID forces Android to create a fresh channel with sound settings.
// Existing channels keep old settings and cannot be mutated reliably.
const CHECKIN_CHANNEL_ID = 'checkin-alerts-alarm-v4';
const CHECKIN_SILENT_CHANNEL_ID = 'checkin-alerts-silent-v2';
export const CHECKIN_NOTIFICATION_ID = 'homealone-checkin-alert';
const DEFAULT_ALARM_RING_MS = 120_000;
const MIN_ALARM_RING_MS = 10_000;
const MAX_ALARM_RING_MS = 120_000;
const VIBRATION_VIBRATE_MS = 300;
const VIBRATION_PAUSE_MS = 600;

let alarmStopTimer: ReturnType<typeof setTimeout> | null = null;

function normalizeAlarmRingMs(value?: number): number {
  if (!Number.isFinite(value || NaN)) {
    return DEFAULT_ALARM_RING_MS;
  }

  return Math.max(MIN_ALARM_RING_MS, Math.min(Number(value), MAX_ALARM_RING_MS));
}

function buildVibrationPattern(alarmRingMs: number): number[] {
  const cycleMs = VIBRATION_VIBRATE_MS + VIBRATION_PAUSE_MS;
  const cycles = Math.max(1, Math.ceil(alarmRingMs / cycleMs));
  const pattern: number[] = [];
  for (let i = 0; i < cycles; i++) {
    pattern.push(VIBRATION_VIBRATE_MS, VIBRATION_PAUSE_MS);
  }
  return pattern;
}

function clearAlarmStopTimer() {
  if (alarmStopTimer) {
    clearTimeout(alarmStopTimer);
    alarmStopTimer = null;
  }
}

export async function ensureCheckInChannel(): Promise<string> {
  if (Platform.OS !== 'android') {
    return CHECKIN_CHANNEL_ID;
  }

  await notifee.createChannel({
    id: CHECKIN_CHANNEL_ID,
    name: 'Check-in Alerts',
    description: 'Critical HomeAlone check-in alerts',
    importance: AndroidImportance.HIGH,
    sound: 'alarm',
    vibration: true,
    lights: true,
  });

  return CHECKIN_CHANNEL_ID;
}

async function ensureSilentCheckInChannel(): Promise<string> {
  if (Platform.OS !== 'android') {
    return CHECKIN_SILENT_CHANNEL_ID;
  }

  await notifee.createChannel({
    id: CHECKIN_SILENT_CHANNEL_ID,
    name: 'Check-in Alerts Silent',
    description: 'Persistent HomeAlone check-in alerts after the alarm finishes',
    importance: AndroidImportance.LOW,
    vibration: false,
    lights: false,
  });

  return CHECKIN_SILENT_CHANNEL_ID;
}

async function keepCheckInNotificationVisible(sessionId?: string): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const channelId = await ensureSilentCheckInChannel();

  await notifee.displayNotification({
    id: CHECKIN_NOTIFICATION_ID,
    title: 'HomeAlone check-in',
    body: 'Are you okay? Tap to respond now.',
    data: {
      type: 'checkin',
      sessionId: sessionId || '',
    },
    android: {
      channelId,
      importance: AndroidImportance.LOW,
      visibility: AndroidVisibility.PUBLIC,
      pressAction: {
        id: 'default',
        launchActivity: 'default',
      },
      autoCancel: false,
      ongoing: true,
      smallIcon: 'ic_launcher',
    },
  });
}

export async function showFullScreenCheckInAlert(
  sessionId?: string,
  options?: { alarmRingMs?: number },
): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const channelId = await ensureCheckInChannel();
  const alarmRingMs = normalizeAlarmRingMs(options?.alarmRingMs);
  clearAlarmStopTimer();

  await notifee.displayNotification({
    id: CHECKIN_NOTIFICATION_ID,
    title: 'HomeAlone check-in',
    body: 'Are you okay? Tap to respond now.',
    data: {
      type: 'checkin',
      sessionId: sessionId || '',
    },
    android: {
      channelId,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      pressAction: {
        id: 'default',
        launchActivity: 'default',
      },
      fullScreenAction: {
        id: 'default',
      },
      sound: 'alarm',
      vibrationPattern: buildVibrationPattern(alarmRingMs),
      timestamp: Date.now(),
      showTimestamp: true,
      loopSound: true,
      autoCancel: false,
      ongoing: true,
      smallIcon: 'ic_launcher',
      lightUpScreen: true,
    },
  });

  alarmStopTimer = setTimeout(() => {
    alarmStopTimer = null;
    keepCheckInNotificationVisible(sessionId).catch(() => {});
  }, alarmRingMs);
}

export async function clearFullScreenCheckInAlert(): Promise<void> {
  clearAlarmStopTimer();

  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await notifee.cancelNotification(CHECKIN_NOTIFICATION_ID);
  } catch {
    // no-op
  }
}
