import notifee, {
  TimestampTrigger,
  TriggerType,
  EventType,
  AndroidImportance,
} from '@notifee/react-native';
import {navigate} from '../navigation/RootNavigation';

// Schedules a check-in notification after `hours`
export async function scheduleCheckInNotification(hours) {
  const trigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: Date.now() + hours * 60 * 60 * 1000, // hours → ms
  };

  await notifee.createTriggerNotification(
    {
      title: 'Time to Check-In',
      body: 'Tap to confirm you are safe.',
      android: {
        channelId: 'checkin-channel',
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        lightUpScreen: true,
        sound: 'default',
        importance: AndroidImportance.HIGH,
        ongoing: true,
        autoCancel: false,
      },
    },
    trigger,
  );

  console.log(
    '[NotificationHandler] Notification scheduled in',
    hours,
    'hours',
  );
}

// Cancel only scheduled notifications, keep displayed ones
export async function cancelCheckInNotification() {
  await notifee.cancelTriggerNotifications();
  console.log(
    '[NotificationHandler] Scheduled notifications cancelled (displayed remain)',
  );
}

// Handle notification clicks → navigate to CheckInScreen
export function registerNotificationListeners() {
  notifee.onForegroundEvent(({type}) => {
    if (type === EventType.PRESS) {
      console.log('[NotificationHandler] Notification pressed (foreground)');
      navigate('CheckInScreen');
    }
  });

  notifee.onBackgroundEvent(async ({type}) => {
    if (type === EventType.PRESS) {
      console.log('[NotificationHandler] Notification pressed (background)');
      navigate('CheckInScreen');
    }
  });
}
