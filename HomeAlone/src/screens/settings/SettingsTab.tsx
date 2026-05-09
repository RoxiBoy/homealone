import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { View, Text, Button, YStack, XStack } from 'tamagui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../config/api';

const ACTIVITY_SETTINGS_KEY = '@homealone/activity-settings';

const CHECK_IN_OPTIONS = [1, 2, 4, 6, 8, 12, 24];
const COUNTDOWN_OPTIONS = [1, 2, 5, 10, 15, 30, 60];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => index);

type DndReason = 'manual' | 'sleep' | null;

type ActivitySettings = {
  checkInTime: number;
  countdownTime: number;
  dnd: boolean;
  sleepTimerEnabled: boolean;
  sleepStartHour: number;
  sleepEndHour: number;
  sleepTimezone: string;
  effectiveDnd: boolean;
  dndReason: DndReason;
};

const getDeviceTimezone = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone || 'UTC';
  } catch (error) {
    return 'UTC';
  }
};

const DEFAULT_SETTINGS: ActivitySettings = {
  checkInTime: 2,
  countdownTime: 2,
  dnd: false,
  sleepTimerEnabled: false,
  sleepStartHour: 21,
  sleepEndHour: 7,
  sleepTimezone: getDeviceTimezone(),
  effectiveDnd: false,
  dndReason: null,
};

const formatHourLabel = (hour: number) => {
  const normalized = ((hour % 24) + 24) % 24;
  const suffix = normalized >= 12 ? 'PM' : 'AM';
  const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${hour12} ${suffix}`;
};

const buildSettingsFromPayload = (
  payload: Partial<{
    checkInIntervalHours: number;
    emergencyCountdownMinutes: number;
    dnd: boolean;
    sleepTimerEnabled: boolean;
    sleepStartHour: number;
    sleepEndHour: number;
    sleepTimezone: string;
    effectiveDnd: boolean;
    dndReason: DndReason;
  }>,
  fallback: ActivitySettings,
): ActivitySettings => ({
  checkInTime:
    typeof payload.checkInIntervalHours === 'number'
      ? payload.checkInIntervalHours
      : fallback.checkInTime,
  countdownTime:
    typeof payload.emergencyCountdownMinutes === 'number'
      ? payload.emergencyCountdownMinutes
      : fallback.countdownTime,
  dnd: typeof payload.dnd === 'boolean' ? payload.dnd : fallback.dnd,
  sleepTimerEnabled:
    typeof payload.sleepTimerEnabled === 'boolean'
      ? payload.sleepTimerEnabled
      : fallback.sleepTimerEnabled,
  sleepStartHour:
    Number.isInteger(payload.sleepStartHour) ? payload.sleepStartHour! : fallback.sleepStartHour,
  sleepEndHour:
    Number.isInteger(payload.sleepEndHour) ? payload.sleepEndHour! : fallback.sleepEndHour,
  sleepTimezone:
    typeof payload.sleepTimezone === 'string' && payload.sleepTimezone
      ? payload.sleepTimezone
      : fallback.sleepTimezone,
  effectiveDnd:
    typeof payload.effectiveDnd === 'boolean' ? payload.effectiveDnd : fallback.effectiveDnd,
  dndReason:
    payload.dndReason === 'manual' || payload.dndReason === 'sleep'
      ? payload.dndReason
      : fallback.dndReason,
});

const SettingsTab: React.FC = () => {
  const { token, notificationsEnabled, user, updateUser } = useAuth();
  const [settings, setSettings] = useState<ActivitySettings>({
    ...DEFAULT_SETTINGS,
    dnd: user?.dnd ?? DEFAULT_SETTINGS.dnd,
    sleepTimerEnabled: user?.sleepTimerEnabled ?? DEFAULT_SETTINGS.sleepTimerEnabled,
    sleepStartHour: user?.sleepStartHour ?? DEFAULT_SETTINGS.sleepStartHour,
    sleepEndHour: user?.sleepEndHour ?? DEFAULT_SETTINGS.sleepEndHour,
    sleepTimezone: user?.sleepTimezone ?? DEFAULT_SETTINGS.sleepTimezone,
    effectiveDnd: user?.effectiveDnd ?? user?.dnd ?? DEFAULT_SETTINGS.effectiveDnd,
    dndReason: user?.dndReason ?? DEFAULT_SETTINGS.dndReason,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (token) {
          try {
            const profile = await apiFetch<{
              checkInIntervalHours?: number;
              emergencyCountdownMinutes?: number;
              dnd?: boolean;
              sleepTimerEnabled?: boolean;
              sleepStartHour?: number;
              sleepEndHour?: number;
              sleepTimezone?: string;
              effectiveDnd?: boolean;
              dndReason?: DndReason;
            }>('/users/profile', {
              method: 'GET',
              token,
            });

            setSettings(prev => buildSettingsFromPayload(profile, prev));
          } catch (serverError) {
            console.warn('[SettingsTab] Failed to load settings from server', serverError);
          }
        }

        const stored = await AsyncStorage.getItem(ACTIVITY_SETTINGS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<ActivitySettings>;
          setSettings(current => ({
            ...current,
            checkInTime: parsed.checkInTime ?? current.checkInTime,
            countdownTime: parsed.countdownTime ?? current.countdownTime,
            dnd: parsed.dnd ?? current.dnd,
            sleepTimerEnabled: parsed.sleepTimerEnabled ?? current.sleepTimerEnabled,
            sleepStartHour: parsed.sleepStartHour ?? current.sleepStartHour,
            sleepEndHour: parsed.sleepEndHour ?? current.sleepEndHour,
            sleepTimezone: parsed.sleepTimezone ?? current.sleepTimezone,
          }));
        }
      } catch (error) {
        console.warn('[SettingsTab] Failed to load settings', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [token]);

  const dndStatusText = useMemo(() => {
    if (!settings.effectiveDnd) {
      return 'Check-in alerts are currently active.';
    }

    if (settings.dndReason === 'sleep') {
      return 'Check-in alerts are currently silenced by your sleep timer.';
    }

    return 'Check-in alerts are currently silenced manually.';
  }, [settings.dndReason, settings.effectiveDnd]);

  const persistSettings = async (next: ActivitySettings) => {
    setSettings(next);

    const localSettings = {
      checkInTime: next.checkInTime,
      countdownTime: next.countdownTime,
      dnd: next.dnd,
      sleepTimerEnabled: next.sleepTimerEnabled,
      sleepStartHour: next.sleepStartHour,
      sleepEndHour: next.sleepEndHour,
      sleepTimezone: next.sleepTimezone || getDeviceTimezone(),
    };

    try {
      await AsyncStorage.setItem(ACTIVITY_SETTINGS_KEY, JSON.stringify(localSettings));
    } catch (error) {
      console.warn('[SettingsTab] Failed to save settings locally', error);
    }

    if (!token) {
      updateUser({
        dnd: next.dnd,
        sleepTimerEnabled: next.sleepTimerEnabled,
        sleepStartHour: next.sleepStartHour,
        sleepEndHour: next.sleepEndHour,
        sleepTimezone: next.sleepTimezone,
        effectiveDnd: next.effectiveDnd,
        dndReason: next.dndReason,
      });
      return;
    }

    try {
      const updatedUser = await apiFetch<any>('/users/settings', {
        method: 'PUT',
        token,
        body: JSON.stringify({
          checkInIntervalHours: next.checkInTime,
          emergencyCountdownMinutes: next.countdownTime,
          dnd: next.dnd,
          sleepTimerEnabled: next.sleepTimerEnabled,
          sleepStartHour: next.sleepStartHour,
          sleepEndHour: next.sleepEndHour,
          sleepTimezone: next.sleepTimezone || getDeviceTimezone(),
        }),
      });

      const merged = buildSettingsFromPayload(updatedUser, next);
      setSettings(merged);
      await updateUser({
        checkInIntervalHours: merged.checkInTime,
        emergencyCountdownMinutes: merged.countdownTime,
        dnd: merged.dnd,
        sleepTimerEnabled: merged.sleepTimerEnabled,
        sleepStartHour: merged.sleepStartHour,
        sleepEndHour: merged.sleepEndHour,
        sleepTimezone: merged.sleepTimezone,
        effectiveDnd: merged.effectiveDnd,
        dndReason: merged.dndReason,
      });
    } catch (error) {
      console.warn('[SettingsTab] Failed to save settings on server', error);
    }
  };

  const updateSettingsPartial = (patch: Partial<ActivitySettings>) => {
    persistSettings({
      ...settings,
      ...patch,
      sleepTimezone: patch.sleepTimezone || settings.sleepTimezone || getDeviceTimezone(),
    });
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      <YStack space="$4" padding="$4">
        <View backgroundColor="$backgroundStrong" borderRadius="$4" padding="$4">
          <XStack alignItems="center" justifyContent="space-between">
            <YStack flex={1} marginRight="$3">
              <Text fontSize="$6" fontWeight="600">
                Manual Do Not Disturb
              </Text>
              <Text fontSize="$3" color="$color11">
                When enabled, HomeAlone will not send check-in alerts until you turn it off again.
              </Text>
            </YStack>

            <Button
              size="$3"
              variant={settings.dnd ? 'solid' : 'outlined'}
              onPress={() => updateSettingsPartial({ dnd: !settings.dnd })}
            >
              <Text color="$color12">{settings.dnd ? 'On' : 'Off'}</Text>
            </Button>
          </XStack>

          <Text fontSize="$3" color="$color11" marginTop="$2">
            {dndStatusText}
          </Text>
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
                    onPress={() => updateSettingsPartial({ checkInTime: hours })}
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
                    onPress={() => updateSettingsPartial({ countdownTime: minutes })}
                  >
                    <Text color="$color12">
                      {minutes} {minutes === 1 ? 'minute' : 'minutes'}
                    </Text>
                  </Button>
                ))}
              </XStack>
            </View>

            <View backgroundColor="$backgroundStrong" borderRadius="$4" padding="$4" marginTop="$4">
              <XStack alignItems="center" justifyContent="space-between" marginBottom="$3">
                <YStack flex={1} marginRight="$3">
                  <Text fontSize="$6" fontWeight="600">
                    Sleep timer
                  </Text>
                  <Text fontSize="$3" color="$color11">
                    Silence check-in alerts automatically while you usually sleep.
                  </Text>
                </YStack>

                <Button
                  size="$3"
                  variant={settings.sleepTimerEnabled ? 'solid' : 'outlined'}
                  onPress={() =>
                    updateSettingsPartial({
                      sleepTimerEnabled: !settings.sleepTimerEnabled,
                      sleepTimezone: getDeviceTimezone(),
                    })
                  }
                >
                  <Text color="$color12">{settings.sleepTimerEnabled ? 'On' : 'Off'}</Text>
                </Button>
              </XStack>

              <Text fontSize="$3" color="$color11" marginBottom="$3">
                Current timezone: {settings.sleepTimezone}
              </Text>

              <Text fontSize="$5" fontWeight="600" marginBottom="$2">
                Sleep starts
              </Text>
              <XStack flexWrap="wrap" gap="$2" marginBottom="$4">
                {HOUR_OPTIONS.map(hour => (
                  <Button
                    key={`sleep-start-${hour}`}
                    size="$2"
                    variant={settings.sleepStartHour === hour ? 'solid' : 'outlined'}
                    onPress={() =>
                      updateSettingsPartial({
                        sleepStartHour: hour,
                        sleepTimezone: getDeviceTimezone(),
                      })
                    }
                  >
                    <Text color="$color12">{formatHourLabel(hour)}</Text>
                  </Button>
                ))}
              </XStack>

              <Text fontSize="$5" fontWeight="600" marginBottom="$2">
                Sleep ends
              </Text>
              <XStack flexWrap="wrap" gap="$2">
                {HOUR_OPTIONS.map(hour => (
                  <Button
                    key={`sleep-end-${hour}`}
                    size="$2"
                    variant={settings.sleepEndHour === hour ? 'solid' : 'outlined'}
                    onPress={() =>
                      updateSettingsPartial({
                        sleepEndHour: hour,
                        sleepTimezone: getDeviceTimezone(),
                      })
                    }
                  >
                    <Text color="$color12">{formatHourLabel(hour)}</Text>
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
              <Text fontSize="$3" color="$color11" marginBottom="$1">
                3. Manual DND silences alerts until you turn it off.
              </Text>
              <Text fontSize="$3" color="$color11">
                4. The sleep timer silences alerts automatically during your chosen sleep hours.
              </Text>
            </View>
          </>
        )}
      </YStack>
    </ScrollView>
  );
};

export default SettingsTab;
