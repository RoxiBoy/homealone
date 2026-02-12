/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import {
  CHECKIN_NOTIFICATION_ID,
  showFullScreenCheckInAlert,
} from './src/services/fullScreenCheckIn';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  const type = remoteMessage?.data?.type;
  if (type === 'checkin') {
    await showFullScreenCheckInAlert(remoteMessage?.data?.sessionId);
  }
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS && detail.notification?.data?.type === 'checkin') {
    await notifee.cancelNotification(CHECKIN_NOTIFICATION_ID);
  }
});

AppRegistry.registerComponent(appName, () => App);
