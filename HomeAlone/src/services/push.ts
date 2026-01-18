import messaging from '@react-native-firebase/messaging';
import { apiFetch } from '../config/api';

// Ask for notification permission and get FCM token.
export async function initPush(token: string | null) {
  if (!token) return;

  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('[push] Notifications not authorized');
      return;
    }

    const fcmToken = await messaging().getToken();
    console.log('[push] FCM token', fcmToken);

    await apiFetch('/users/device-token', {
      method: 'PUT',
      token,
      body: JSON.stringify({ fcmToken }),
    });

    console.log('[push] Registered device token with backend');

    // Optional: handle token refresh
    messaging().onTokenRefresh(async newToken => {
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
  } catch (e) {
    console.log('[push] Error initializing push notifications', e);
  }
}

// Optional helpers to inspect how app was opened from a notification.
export function setupNotificationOpenHandlers() {
  // When app is opened from a quit state via notification
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('[push] App opened from quit state by notification', remoteMessage.data);
      }
    });

  // When app is in background and user taps notification
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('[push] Notification opened app from background', remoteMessage.data);
  });
}
