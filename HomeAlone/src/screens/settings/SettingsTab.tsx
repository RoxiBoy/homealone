import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { View, Text, Button, YStack, XStack } from 'tamagui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../config/api';

const ACTIVITY_SETTINGS_KEY = '@homealone/activity-settings';

const CHECK_IN_OPTIONS = [1, 2, 4, 6, 8, 12, 24]; // hours
const COUNTDOWN_OPTIONS = [1, 2, 5, 10, 15, 30, 60]; // minutes

type ActivitySettings = {
  checkInTime: number; // hours
  countdownTime: number; // minutes
};

const DEFAULT_SETTINGS: ActivitySettings = {
  checkInTime: 4,
  countdownTime: 5,
};

const SettingsTab: React.FC = () => {
  const { token } = useAuth();
  const [settings, setSettings] = useState<ActivitySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Prefer server values if available
        if (token) {
          try {
            const profile = await apiFetch<{
              checkInIntervalHours?: number;
              emergencyCountdownMinutes?: number;
            }>('/users/profile', {
              method: 'GET',
              token,
            });

            setSettings(prev => ({
              checkInTime:
                typeof profile.checkInIntervalHours === 'number'
                  ? profile.checkInIntervalHours
                  : prev.checkInTime,
              countdownTime:
                typeof profile.emergencyCountdownMinutes === 'number'
                  ? profile.emergencyCountdownMinutes
                  : prev.countdownTime,
            }));
          } catch (serverError) {
            console.warn('[SettingsTab] Failed to load settings from server', serverError);
          }
        }

        // Always try to merge in local overrides last
        const stored = await AsyncStorage.getItem(ACTIVITY_SETTINGS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<ActivitySettings>;
          setSettings(current => ({
            checkInTime: parsed.checkInTime ?? current.checkInTime,
            countdownTime: parsed.countdownTime ?? current.countdownTime,
          }));
        }
      } catch (e) {
        console.warn('[SettingsTab] Failed to load settings', e);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [token]);

  const persistSettings = async (next: ActivitySettings) => {
    setSettings(next);
    try {
      await AsyncStorage.setItem(ACTIVITY_SETTINGS_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('[SettingsTab] Failed to save settings locally', e);
    }

    // Also sync to server when logged in
    if (token) {
      try {
        await apiFetch('/users/settings', {
          method: 'PUT',
          token,
          body: JSON.stringify({
            checkInIntervalHours: next.checkInTime,
            emergencyCountdownMinutes: next.countdownTime,
          }),
        });
      } catch (e) {
        console.warn('[SettingsTab] Failed to save settings on server', e);
      }
    }
  };

  const handleSelectCheckIn = (hours: number) => {
    persistSettings({ ...settings, checkInTime: hours });
  };

  const handleSelectCountdown = (minutes: number) => {
    persistSettings({ ...settings, countdownTime: minutes });
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      <YStack space="$4" padding="$4">
        <Text fontSize="$7" fontWeight="700">
          Check-in Settings
        </Text>
        <Text fontSize="$4" color="$color11">
          Configure how often the app checks on you and how long to wait before triggering the
          emergency protocol.
        </Text>

        {loading ? (
          <Text marginTop="$4">Loading settings...</Text>
        ) : (
          <>
            <View
              backgroundColor="$backgroundStrong"
              borderRadius="$4"
              padding="$4"
              marginTop="$2"
            >
              <Text fontSize="$6" fontWeight="600" marginBottom="$2">
                Check-in interval
              </Text>
              <Text fontSize="$3" color="$color11" marginBottom="$3">
                How long after your last activity we should wait before checking in on you.
              </Text>

              <XStack flexWrap="wrap" gap="$2">
                {CHECK_IN_OPTIONS.map(hours => (
                  <Button
                    key={hours}
                    size="$3"
                    variant={settings.checkInTime === hours ? 'solid' : 'outlined'}
                    onPress={() => handleSelectCheckIn(hours)}
                  >
                    <Text color="$color12">
                      {hours} {hours === 1 ? 'hour' : 'hours'}
                    </Text>
                  </Button>
                ))}
              </XStack>
            </View>

            <View
              backgroundColor="$backgroundStrong"
              borderRadius="$4"
              padding="$4"
              marginTop="$4"
            >
              <Text fontSize="$6" fontWeight="600" marginBottom="$2">
                Emergency countdown
              </Text>
              <Text fontSize="$3" color="$color11" marginBottom="$3">
                How long to wait for your response after a check-in before triggering emergency
                contacts.
              </Text>

              <XStack flexWrap="wrap" gap="$2">
                {COUNTDOWN_OPTIONS.map(minutes => (
                  <Button
                    key={minutes}
                    size="$3"
                    variant={settings.countdownTime === minutes ? 'solid' : 'outlined'}
                    onPress={() => handleSelectCountdown(minutes)}
                  >
                    <Text color="$color12">
                      {minutes} {minutes === 1 ? 'minute' : 'minutes'}
                    </Text>
                  </Button>
                ))}
              </XStack>
            </View>

            <View
              backgroundColor="$backgroundStrong"
              borderRadius="$4"
              padding="$4"
              marginTop="$4"
            >
              <Text fontSize="$5" fontWeight="600" marginBottom="$2">
                How it works
              </Text>
              <Text fontSize="$3" color="$color11" marginBottom="$1">
                1. The app monitors your activity (for example, screen unlocks).
              </Text>
              <Text fontSize="$3" color="$color11" marginBottom="$1">
                2. If no activity is detected for the check-in interval, you will receive a
                notification asking if you are okay.
              </Text>
              <Text fontSize="$3" color="$color11">
                3. If you do not respond within the countdown window, your emergency contacts can be
                notified.
              </Text>
            </View>
          </>
        )}
      </YStack>
    </ScrollView>
  );
};

export default SettingsTab;
