/* global jest */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-firebase/messaging', () => {
  const messaging = jest.fn(() => ({
    requestPermission: jest.fn(async () => messaging.AuthorizationStatus.AUTHORIZED),
    getToken: jest.fn(async () => 'test-fcm-token'),
    onTokenRefresh: jest.fn(),
    getInitialNotification: jest.fn(async () => null),
    onNotificationOpenedApp: jest.fn(),
    onMessage: jest.fn(),
  }));

  messaging.AuthorizationStatus = {
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  };

  return messaging;
});

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn(async () => ({})),
    createChannel: jest.fn(async () => 'homealone-checkin'),
    displayNotification: jest.fn(async () => undefined),
    cancelNotification: jest.fn(async () => undefined),
    onForegroundEvent: jest.fn(),
    getInitialNotification: jest.fn(async () => null),
  },
  AndroidImportance: {
    HIGH: 4,
  },
  AndroidCategory: {
    ALARM: 'alarm',
  },
  EventType: {
    PRESS: 1,
  },
}));

jest.mock('react-native-background-fetch', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(async () => 0),
    scheduleTask: jest.fn(async () => true),
    finish: jest.fn(),
    status: jest.fn(async () => 0),
  },
}));
