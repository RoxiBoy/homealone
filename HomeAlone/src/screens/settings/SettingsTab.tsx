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
  dnd: boolean;
};

const DEFAULT_SETTINGS: ActivitySettings = {
  checkInTime: 2,
  countdownTime: 2,
  dnd: false,
};

const SettingsTab: React.FC = () => {
  const { token, notificationsEnabled, user, updateUser } = useAuth();
  const [settings, setSettings] = useState<ActivitySettings>({
    ...DEFAULT_SETTINGS,
    dnd: user?.dnd ?? false,
  });
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
              dnd?: boolean;
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
              dnd: typeof profile.dnd === 'boolean' ? profile.dnd : prev.dnd,
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
            dnd: parsed.dnd ?? current.dnd,
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
            dnd: next.dnd,
          }),
        });
      } catch (e) {
        console.warn('[SettingsTab] Failed to save settings on server', e);
      }
    }

    // Update auth user snapshot so other parts of the app can react to DND immediately
    updateUser({ dnd: next.dnd });
  };

  const handleSelectCheckIn = (hours: number) => {
    persistSettings({ ...settings, checkInTime: hours });
  };

  const handleSelectCountdown = (minutes: number) => {
    persistSettings({ ...settings, countdownTime: minutes });
  };

  const persistDnd = async (nextDnd: boolean) => {
    const next: ActivitySettings = { ...settings, dnd: nextDnd };
    setSettings(next);

    try {
      await AsyncStorage.setItem(ACTIVITY_SETTINGS_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('[SettingsTab] Failed to save settings locally', e);
    }

    // Sync only the DND flag so we don't accidentally overwrite interval/countdown
    // (especially if settings haven't loaded yet).
    if (token) {
      try {
        await apiFetch('/users/settings', {
          method: 'PUT',
          token,
          body: JSON.stringify({ dnd: nextDnd }),
        });
      } catch (e) {
        console.warn('[SettingsTab] Failed to save DND on server', e);
      }
    }

    updateUser({ dnd: nextDnd });
  };

  const handleToggleDnd = () => {
    persistDnd(!settings.dnd);
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      <YStack space="$4" padding="$4">
        {/* DND toggle at top */}
        <View backgroundColor="$backgroundStrong" borderRadius="$4" padding="$4">
          <XStack alignItems="center" justifyContent="space-between">
            <YStack flex={1} marginRight="$3">
              <Text fontSize="$6" fontWeight="600">
                Do Not Disturb
              </Text>
              <Text fontSize="$3" color="$color11">
                When enabled, HomeAlone will not send check-in alerts.
              </Text>
            </YStack>

            <Button size="$3" variant={settings.dnd ? 'solid' : 'outlined'} onPress={handleToggleDnd}>
              <Text color="$color12">{settings.dnd ? 'On' : 'Off'}</Text>
            </Button>
          </XStack>

          {settings.dnd ? (
            <Text fontSize="$3" color="$color11" marginTop="$2">
              DND is enabled: check-in alerts are silenced.
            </Text>
          ) : null}
        </View>

        {notificationsEnabled === false && (
          <View backgroundColor="#330000" borderRadius="$4" padding="$3">
            <Text color="red" fontWeight="600" marginBottom="$1">
              Notifications are disabled or not available.
            </Text>
            <Text fontSize="$3" color="$color11">
              Check-ins will not be reliable unless you enable notifications for HomeAlone in your
              device settings.
            </Text>
          </View>
        )}

        {/* Foreground silencing info */}
        {user?.isActive ? (
          <View backgroundColor="$backgroundStrong" borderRadius="$4" padding="$3">
            <Text fontSize="$3" color="$color11">
              App is active: check-in alerts are currently silenced while you use HomeAlone.
            </Text>
          </View>
        ) : null}

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
            <View backgroundColor="$backgroundStrong" borderRadius="$4" padding="$4" marginTop="$2">
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

            <View backgroundColor="$backgroundStrong" borderRadius="$4" padding="$4" marginTop="$4">
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

            <View backgroundColor="$backgroundStrong" borderRadius="$4" padding="$4" marginTop="$4">
              <Text fontSize="$5" fontWeight="600" marginBottom="$2">
                How it works
              </Text>
              <Text fontSize="$3" color="$color11" marginBottom="$1">
                1. If no activity is detected for the check-in interval, you will receive a
                notification asking if you are okay.
              </Text>
              <Text fontSize="$3" color="$color11" marginBottom="$1">
                2. If you do not respond within the countdown window, your emergency contacts can be
                notified.
              </Text>
              <Text fontSize="$3" color="$color11">
                3. When DND is enabled or you are actively using the app, check-in alerts are
                silenced.
              </Text>
            </View>
          </>
        )}
      </YStack>
    </ScrollView>
  );
};

export default SettingsTab;
