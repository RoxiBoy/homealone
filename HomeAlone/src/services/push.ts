import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform } from 'react-native';
import { apiFetch } from '../config/api';
import { emitCheckInPush } from './checkInEvents';
import {
  CHECKIN_NOTIFICATION_ID,
  ensureCheckInChannel,
  showFullScreenCheckInAlert,
} from './fullScreenCheckIn';

let handlersBound = false;

const REMINDER_CHANNEL_ID = 'reminder-alerts';

async function ensureReminderChannel(): Promise<string> {
  if (Platform.OS !== 'android') {
    return REMINDER_CHANNEL_ID;
  }

  try {
    await notifee.createChannel({
      id: REMINDER_CHANNEL_ID,
      name: 'Reminder Alerts',
      description: 'Medication and appointment reminders',
      importance: AndroidImportance.DEFAULT,
      vibration: true,
    });
  } catch {
    // channel may already exist
  }

  return REMINDER_CHANNEL_ID;
}

export type InitPushResult = {
  enabled: boolean;
  reason?:
    | 'no-token'
    | 'native-module-unavailable'
    | 'permission-denied'
    | 'no-fcm-token'
    | 'error';
};

function getMessagingSafe() {
  try {
    // This is where the RNFBA native-module error would normally be thrown
    return messaging();
  } catch (e) {
    console.log('[push] Firebase messaging native module not available; running in degraded mode.', e);
    return null;
  }
}

// Ask for notification permission and get FCM token.
// Never throws: always resolves with a result so the app does not crash
// even if Firebase is not fully configured yet.
export async function initPush(token: string | null): Promise<InitPushResult> {
  if (!token) {
    return { enabled: false, reason: 'no-token' };
  }

  const m = getMessagingSafe();
  if (!m) {
    return { enabled: false, reason: 'native-module-unavailable' };
  }

  try {
    await notifee.requestPermission();

    const authStatus = await m.requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('[push] Notifications not authorized');
      return { enabled: false, reason: 'permission-denied' };
    }

    const fcmToken = await m.getToken();
    if (!fcmToken) {
      console.log('[push] Failed to obtain FCM token');
      return { enabled: false, reason: 'no-fcm-token' };
    }

    console.log('[push] FCM token', fcmToken);

    await ensureCheckInChannel();

    await apiFetch('/users/device-token', {
      method: 'PUT',
      token,
      body: JSON.stringify({ fcmToken }),
    });

    console.log('[push] Registered device token with backend');

    // Optional: handle token refresh
    m.onTokenRefresh(async newToken => {
      console.log('[push] FCM token refreshed', newToken);
      try {
        await apiFetch('/users/device-token', {
          method: 'PUT',
          token,
          body: JSON.stringify({ fcmToken: newToken }),
        });
      } catch (e) {
        console.log('[push] Error updating refreshed token', e);
      }
    });

    return { enabled: true };
  } catch (e) {
    console.log('[push] Error initializing push notifications', e);
    return { enabled: false, reason: 'error' };
  }
}

// Optional helpers to inspect how app was opened from a notification.
export function setupNotificationOpenHandlers() {
  const m = getMessagingSafe();
  if (!m) return;

  if (handlersBound) {
    return;
  }
  handlersBound = true;

  const maybeEmitCheckInOpen = (remoteMessage: any, source: string) => {
    const type = remoteMessage?.data?.type;
    if (type === 'checkin') {
      console.log(`[push] Check-in notification opened app (${source})`, remoteMessage.data);
      emitCheckInPush();
    }
  };

  // When app is opened from a quit state via notification
  m.getInitialNotification().then(remoteMessage => {
    if (remoteMessage) {
      console.log('[push] App opened from quit state by notification', remoteMessage.data);
      maybeEmitCheckInOpen(remoteMessage, 'quit');
    }
  });

  // When app is in background and user taps notification
  m.onNotificationOpenedApp(remoteMessage => {
    console.log('[push] Notification opened app from background', remoteMessage.data);
    maybeEmitCheckInOpen(remoteMessage, 'background');
  });

  // When app is in foreground and an FCM message arrives
  m.onMessage(async remoteMessage => {
    console.log('[push] Foreground FCM message', remoteMessage.notification, remoteMessage.data);

    const type = remoteMessage.data?.type;

    if (type === 'checkin') {
      const sessionId =
        typeof remoteMessage.data?.sessionId === 'string'
          ? remoteMessage.data.sessionId
          : undefined;
      // Foreground does not auto-show FCM notifications on Android; show explicit full-screen alert.
      await showFullScreenCheckInAlert(sessionId);
      // Notify CheckInContext so it can fetch the active session and show the in-app
      // "Are you okay?" modal.
      emitCheckInPush();
      return;
    }

    if (type === 'test') {
      const channelId = await ensureCheckInChannel();
      await notifee.displayNotification({
        title: remoteMessage.notification?.title || 'HomeAlone test notification',
        body:
          remoteMessage.notification?.body ||
          'If you see this, FCM is configured correctly.',
        data: {
          type: 'test',
        },
        android: {
          channelId,
          sound: 'alarm',
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
        },
      });
      return;
    }

    if (type === 'reminder') {
      const reminderTitle =
        typeof remoteMessage.data?.title === 'string'
          ? remoteMessage.data.title
          : 'Reminder';
      const reminderBody =
        typeof remoteMessage.data?.body === 'string'
          ? remoteMessage.data.body
          : '';
      const reminderType = remoteMessage.data?.reminderType;
      const context = remoteMessage.data?.context;

      const channelId = await ensureReminderChannel();

      await notifee.displayNotification({
        title: reminderTitle,
        body: reminderBody,
        data: {
          type: 'reminder',
          reminderType: reminderType || '',
          context: context || '',
        },
        android: {
          channelId,
          smallIcon: 'ic_notification',
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
        },
      });
      return;
    }

    // For other foreground messages, keep silent and just log.
    return;
  });

  if (Platform.OS === 'android') {
    notifee.onForegroundEvent(({ type, detail }: any) => {
      if (type === EventType.PRESS) {
        const payloadType = detail.notification?.data?.type;
        if (payloadType === 'checkin') {
          notifee.cancelNotification(CHECKIN_NOTIFICATION_ID).catch(() => {});
          emitCheckInPush();
        }
      }
      // When fullScreenAction brings the activity to foreground (warm start),
      // the notification is re-displayed in the foreground context.
      // This fires emitCheckInPush() in the UI context where the
      // CheckInContext's onCheckInPush listener is registered.
      if (type === EventType.DISPLAYED) {
        const payloadType = detail.notification?.data?.type;
        if (payloadType === 'checkin') {
          emitCheckInPush();
        }
      }
    });

    notifee.getInitialNotification().then((initial: any) => {
      const payloadType = initial?.notification?.data?.type;
      if (payloadType === 'checkin') {
        emitCheckInPush();
      }
    });
  }
}
