import { Platform } from 'react-native';
import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
} from '@notifee/react-native';

// Versioned channel ID forces Android to create a fresh channel with sound settings.
// Existing channels keep old settings and cannot be mutated reliably.
const CHECKIN_CHANNEL_ID = 'checkin-alerts-alarm-v2';
export const CHECKIN_NOTIFICATION_ID = 'homealone-checkin-alert';

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

export async function showFullScreenCheckInAlert(sessionId?: string): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const channelId = await ensureCheckInChannel();

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
      vibrationPattern: [300, 600, 300, 600],
      timestamp: Date.now(),
      showTimestamp: true,
      loopSound: true,
      autoCancel: false,
      ongoing: true,
      smallIcon: 'ic_launcher',
      lightUpScreen: true,
    },
  });
}

export async function clearFullScreenCheckInAlert(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await notifee.cancelNotification(CHECKIN_NOTIFICATION_ID);
  } catch {
    // no-op
  }
}
