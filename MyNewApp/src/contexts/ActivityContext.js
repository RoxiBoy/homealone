import React, {createContext, useState, useEffect, useContext} from 'react';
import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthContext} from './AuthContext';
import axios from 'axios';
import {API_URL} from '../config/constants';
import {
  scheduleCheckInNotification,
  cancelCheckInNotification,
  registerNotificationListeners,
} from '../services/NotificationHandler';

const {ActivityDetectionModule} = NativeModules;
export const ActivityContext = createContext();

export const ActivityProvider = ({children}) => {
  const {userToken} = useContext(AuthContext);

  const [checkInTime, setCheckInTime] = useState(4); // default 4 hours
  const [countdownTime, setCountdownTime] = useState(5); // default 5 minutes
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState(null);
  const [emergencyContacts, setEmergencyContacts] = useState([]);

  useEffect(() => {
    loadSettings();
    registerNotificationListeners();
  }, []);

  useEffect(() => {
    if (userToken) {
      fetchEmergencyContacts();
    }
  }, [userToken]);

  useEffect(() => {
    if (Platform.OS === 'android' && ActivityDetectionModule) {
      ActivityDetectionModule.startListening();
      const emitter = new NativeEventEmitter(ActivityDetectionModule);

      const screenLockedSubscription = emitter.addListener(
        'screenLocked',
        () => {
          console.log('[ActivityContext] Screen locked');
          if (!doNotDisturb && userToken) {
            updateLastCheckIn();
            scheduleCheckInNotification(checkInTime);
          }
        },
      );

      const screenUnlockedSubscription = emitter.addListener(
        'screenUnlocked',
        () => {
          console.log('[ActivityContext] Screen unlocked');
          if (!doNotDisturb && userToken) {
            updateLastCheckIn();
            cancelCheckInNotification();
          }
        },
      );

      return () => {
        screenLockedSubscription.remove();
        screenUnlockedSubscription.remove();
        ActivityDetectionModule.stopListening();
      };
    }
  }, [userToken, doNotDisturb, checkInTime]);

  const loadSettings = async () => {
    try {
      const settingsStr = await AsyncStorage.getItem('activitySettings');
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        setCheckInTime(settings.checkInTime ?? 4);
        setCountdownTime(settings.countdownTime ?? 5);
        setDoNotDisturb(settings.doNotDisturb ?? false);
      }
      const lastCheckStr = await AsyncStorage.getItem('lastCheckIn');
      if (lastCheckStr) {
        setLastCheckIn(new Date(parseInt(lastCheckStr)));
      }
    } catch (e) {
      console.log('[ActivityContext] Failed to load settings', e);
    }
  };

  const fetchEmergencyContacts = async () => {
    try {
      const response = await axios.get(`${API_URL}/friends`);
      setEmergencyContacts(response.data);
      console.log(emergencyContacts);
    } catch (e) {
      console.log('[ActivityContext] Failed to load emergency contacts', e);
    }
  };

  const updateLastCheckIn = async () => {
    if (!userToken || doNotDisturb) {
      return;
    }
    const now = new Date();
    setLastCheckIn(now);
    await AsyncStorage.setItem('lastCheckIn', now.getTime().toString());

    try {
      await axios.post(`${API_URL}/users/check-in`, {
        timestamp: now.toISOString(),
      });
    } catch (e) {
      console.log('[ActivityContext] Failed to update check-in on server', e);
    }
  };

  const toggleDoNotDisturb = async () => {
    const newValue = !doNotDisturb;
    setDoNotDisturb(newValue);
    if (!newValue) {
      updateLastCheckIn();
    }
    await AsyncStorage.setItem(
      'activitySettings',
      JSON.stringify({checkInTime, countdownTime, doNotDisturb: newValue}),
    );
  };

  const updateCheckInTime = async hours => {
    setCheckInTime(hours);
    await AsyncStorage.setItem(
      'activitySettings',
      JSON.stringify({checkInTime: hours, countdownTime, doNotDisturb}),
    );
  };

  const updateCountdownTime = async minutes => {
    setCountdownTime(minutes);
    await AsyncStorage.setItem(
      'activitySettings',
      JSON.stringify({checkInTime, countdownTime: minutes, doNotDisturb}),
    );
  };

  return (
    <ActivityContext.Provider
      value={{
        checkInTime,
        countdownTime,
        doNotDisturb,
        lastCheckIn,
        updateCheckInTime,
        updateCountdownTime,
        toggleDoNotDisturb,
        updateLastCheckIn,
        emergencyContacts,
      }}>
      {children}
    </ActivityContext.Provider>
  );
};
