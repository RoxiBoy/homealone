/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundFetch from 'react-native-background-fetch';
import App from './App';
import { name as appName } from './app.json';
import {
  CHECKIN_NOTIFICATION_ID,
  showFullScreenCheckInAlert,
} from './src/services/fullScreenCheckIn';
import { activityResetHeadlessTask } from './src/services/activityResetWorker';

const PENDING_CHECKIN_KEY = '@homealone/pendingCheckin';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  const type = remoteMessage?.data?.type;
  console.log(
    '[index][bg-message] received',
    JSON.stringify({
      type,
      hasNotification: !!remoteMessage?.notification,
      data: remoteMessage?.data || {},
    }),
  );
  if (type === 'checkin') {
    // If server accidentally sends notification+data, Android may auto-display once.
    // Skip local display in that case to avoid duplicate alerts.
    if (remoteMessage?.notification) {
      console.log('[index][bg-message] skipping local full-screen (notification payload already present)');
      return;
    }
    await AsyncStorage.setItem(
      PENDING_CHECKIN_KEY,
      JSON.stringify({ timestamp: Date.now() }),
    );
    await showFullScreenCheckInAlert(remoteMessage?.data?.sessionId);
    console.log('[index][bg-message] local full-screen check-in alert displayed');
  }
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log(
    '[index][notifee-bg-event]',
    JSON.stringify({
      type,
      notificationId: detail.notification?.id || '',
      payloadType: detail.notification?.data?.type || '',
    }),
  );
  if (type === EventType.PRESS && detail.notification?.data?.type === 'checkin') {
    await notifee.cancelNotification(CHECKIN_NOTIFICATION_ID);
    await AsyncStorage.setItem(
      PENDING_CHECKIN_KEY,
      JSON.stringify({ timestamp: Date.now() }),
    );
    console.log('[index][notifee-bg-event] canceled check-in notification after press');
  }
});

BackgroundFetch.registerHeadlessTask(activityResetHeadlessTask);

AppRegistry.registerComponent(appName, () => App);
