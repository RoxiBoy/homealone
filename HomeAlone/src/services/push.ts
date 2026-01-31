import messaging from '@react-native-firebase/messaging';
import { apiFetch } from '../config/api';
import { emitCheckInPush } from './checkInEvents';

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
  m.onMessage(remoteMessage => {
    console.log('[push] Foreground FCM message', remoteMessage.notification, remoteMessage.data);

    const type = remoteMessage.data?.type;

    if (type === 'checkin') {
      // Notify CheckInContext so it can fetch the active session and show the in-app
      // "Are you okay?" modal. The OS-level notification will already be shown by FCM
      // when the app is backgrounded/killed; this just wires the foreground case.
      emitCheckInPush();
      return;
    }

    // While in foreground, we silence all other notifications (no in-app Alert).
    // Keep the console log so we can still debug payloads.
    return;
  });
}
