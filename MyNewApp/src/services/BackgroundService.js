import BackgroundFetch from 'react-native-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {
  AndroidImportance,
  EventType,
  TriggerType,
} from '@notifee/react-native';
import {navigationRef} from '../navigation/RootNavigation';

// The background task executed by BackgroundFetch
export const backgroundTask = async taskId => {
  try {
    const settingsStr = await AsyncStorage.getItem('activitySettings');
    if (!settingsStr) {
      return BackgroundFetch.finish(taskId);
    }

    const settings = JSON.parse(settingsStr);
    if (settings.doNotDisturb) {
      return BackgroundFetch.finish(taskId);
    }

    const lastCheckStr = await AsyncStorage.getItem('lastCheckIn');
    const lastCheck = lastCheckStr
      ? new Date(parseInt(lastCheckStr))
      : new Date(0);
    const now = new Date();
    const hoursDiff = (now - lastCheck) / (1000 * 60 * 60);

    console.log('[BackgroundService] Hours since last check-in:', hoursDiff);

    if (hoursDiff >= settings.checkInTime) {
      console.log('[BackgroundService] Threshold met, scheduling notification');

      // Ensure the channel exists
      const channelId = await notifee.createChannel({
        id: 'checkin-channel',
        name: 'Check-In Notifications',
        importance: AndroidImportance.HIGH,
      });

      // Schedule notification 1 second from now to ensure delivery
      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + 1000,
        alarmManager: true, // wakes device if asleep
      };

      await notifee.createTriggerNotification(
        {
          title: 'Check-In Reminder',
          body: 'You have missed your check-in. Tap to open CheckIn screen.',
          android: {
            channelId,
            pressAction: {id: 'default', launchActivity: 'default'},
            smallIcon: 'ic_launcher',
            importance: AndroidImportance.HIGH,
          },
          data: {screen: 'CheckIn'},
        },
        trigger,
      );

      console.log('[BackgroundService] Notification scheduled');
    }
  } catch (e) {
    console.error('[BackgroundService] Error:', e);
  } finally {
    BackgroundFetch.finish(taskId);
  }
};

// Configure background fetch and Notifee events
export const configureBackgroundTask = () => {
  BackgroundFetch.configure(
    {
      minimumFetchInterval: 15, // minutes
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_NONE,
    },
    backgroundTask,
    taskId => BackgroundFetch.finish(taskId),
  );

  BackgroundFetch.start()
    .then(() => console.log('[BackgroundService] Background fetch started'))
    .catch(err => console.error('[BackgroundService] Start error:', err));

  // Handle foreground notification taps
  notifee.onForegroundEvent(({type, detail}) => {
    if (type === EventType.PRESS) {
      console.log('[Notifee] Notification pressed:', detail.notification);
      if (navigationRef.isReady() && detail.notification?.data?.screen) {
        navigationRef.navigate(detail.notification.data.screen);
      }
    }
  });

  // Handle background notification taps
  notifee.onBackgroundEvent(async ({type, detail}) => {
    try {
      const {notification, pressAction} = detail;

      if (type === EventType.PRESS && pressAction.id === 'default') {
        console.log('[Notifee] Background notification pressed');

        const now = new Date();
        await AsyncStorage.setItem('lastCheckIn', now.getTime().toString());

        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          await fetch(`${API_URL}/users/check-in`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({timestamp: now.toISOString()}),
          });
        }

        if (notification?.id) {
          await notifee.cancelNotification(notification.id);
        }
      }
    } catch (error) {
      console.error('[Notifee] Background press error:', error);
    }
  });
};
