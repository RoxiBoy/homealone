import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { View, Text, Button, YStack, XStack } from 'tamagui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../config/api';
import { AppCard } from '../../components/AppCard';
import { AppToggle } from '../../components/AppToggle';
import { AppSectionHeader } from '../../components/AppSectionHeader';
import { TimerWheel } from '../../components/TimerWheel';
import { colors } from '../../theme/colors';

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

const formatters = {
  interval: (h: number) => `${h} ${h === 1 ? 'hour' : 'hours'}`,
  countdown: (m: number) => `${m} ${m === 1 ? 'min' : 'mins'}`,
  hour: (h: number) => formatHourLabel(h),
};

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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <YStack padding={16} space={16}>
        <AppSectionHeader
          title="Settings"
          subtitle="Customize your safety check-in preferences."
        />

        {notificationsEnabled === false && (
          <AppCard accent="danger">
            <Text fontSize={15} fontWeight="600" color={colors.accent.danger}>
              Notifications are disabled or not available.
            </Text>
            <Text fontSize={13} color={colors.text.secondary} marginTop={4}>
              Check-ins will not be reliable unless you enable notifications for HomeAlone in your
              device settings.
            </Text>
          </AppCard>
        )}

        {user?.isActive ? (
          <AppCard>
            <Text fontSize={15} color={colors.text.secondary}>
              App is active: check-in alerts are currently silenced while you use HomeAlone.
            </Text>
          </AppCard>
        ) : null}

        {/* DND Card */}
        <AppCard>
          <XStack alignItems="center" justifyContent="space-between">
            <YStack flex={1} marginRight={12}>
              <Text fontSize={19} fontWeight="600" color={colors.text.primary}>
                Do Not Disturb
              </Text>
              <Text fontSize={13} color={colors.text.secondary} marginTop={2}>
                Temporarily silence all check-in alerts.
              </Text>
            </YStack>
            <AppToggle
              checked={settings.dnd}
              onCheckedChange={(val) =>
                updateSettingsPartial({ dnd: val })
              }
            />
          </XStack>
          <Text fontSize={13} color={colors.text.tertiary} marginTop={8}>
            {dndStatusText}
          </Text>
        </AppCard>

        {loading ? (
          <Text fontSize={15} color={colors.text.secondary} textAlign="center" marginTop={16}>
            Loading settings...
          </Text>
        ) : (
          <>
            {/* Check-in Interval */}
            <AppSectionHeader
              title="Check-in interval"
              subtitle="How long after your last activity we should wait before checking in on you."
            />
            <AppCard accent="primary">
              <Text fontSize={26} fontWeight="700" color={colors.primary.base} textAlign="center" marginBottom={8}>
                {formatters.interval(settings.checkInTime)}
              </Text>
              <TimerWheel
                options={CHECK_IN_OPTIONS}
                value={settings.checkInTime}
                onValueChange={(val) => updateSettingsPartial({ checkInTime: val })}
                formatLabel={formatters.interval}
              />
            </AppCard>

            {/* Emergency Countdown */}
            <AppSectionHeader
              title="Emergency countdown"
              subtitle="How long to wait for your response after a check-in before triggering emergency contacts."
            />
            <AppCard accent="warning">
              <Text fontSize={26} fontWeight="700" color={colors.accent.warning} textAlign="center" marginBottom={8}>
                {formatters.countdown(settings.countdownTime)}
              </Text>
              <TimerWheel
                options={COUNTDOWN_OPTIONS}
                value={settings.countdownTime}
                onValueChange={(val) => updateSettingsPartial({ countdownTime: val })}
                formatLabel={formatters.countdown}
              />
            </AppCard>

            {/* Sleep Timer */}
            <AppSectionHeader
              title="Sleep timer"
              subtitle="Silence check-in alerts automatically while you usually sleep."
            />

            <AppCard accent="info">
              <XStack alignItems="center" justifyContent="space-between" marginBottom={12}>
                <YStack flex={1} marginRight={12}>
                  <Text fontSize={17} fontWeight="600" color={colors.text.primary}>
                    Enable sleep timer
                  </Text>
                  <Text fontSize={13} color={colors.text.secondary} marginTop={2}>
                    Timezone: {settings.sleepTimezone}
                  </Text>
                </YStack>
                <AppToggle
                  checked={settings.sleepTimerEnabled}
                  onCheckedChange={(val) =>
                    updateSettingsPartial({
                      sleepTimerEnabled: val,
                      sleepTimezone: getDeviceTimezone(),
                    })
                  }
                />
              </XStack>

              <XStack space={16}>
                <YStack flex={1} alignItems="center">
                  <Text fontSize={15} fontWeight="600" color={colors.text.secondary} marginBottom={4}>
                    Sleep starts
                  </Text>
                  <Text fontSize={22} fontWeight="700" color={colors.primary.base}>
                    {formatHourLabel(settings.sleepStartHour)}
                  </Text>
                  <TimerWheel
                    options={HOUR_OPTIONS}
                    value={settings.sleepStartHour}
                    onValueChange={(val) =>
                      updateSettingsPartial({
                        sleepStartHour: val,
                        sleepTimezone: getDeviceTimezone(),
                      })
                    }
                    formatLabel={formatters.hour}
                  />
                </YStack>

                <YStack flex={1} alignItems="center">
                  <Text fontSize={15} fontWeight="600" color={colors.text.secondary} marginBottom={4}>
                    Sleep ends
                  </Text>
                  <Text fontSize={22} fontWeight="700" color={colors.primary.base}>
                    {formatHourLabel(settings.sleepEndHour)}
                  </Text>
                  <TimerWheel
                    options={HOUR_OPTIONS}
                    value={settings.sleepEndHour}
                    onValueChange={(val) =>
                      updateSettingsPartial({
                        sleepEndHour: val,
                        sleepTimezone: getDeviceTimezone(),
                      })
                    }
                    formatLabel={formatters.hour}
                  />
                </YStack>
              </XStack>
            </AppCard>

            {/* How it works */}
            <AppSectionHeader title="How it works" />
            <AppCard>
              <YStack space={10}>
                {[
                  'If no activity is detected for the check-in interval, you will receive a notification asking if you are okay.',
                  'If you do not respond within the countdown window, your emergency contacts can be notified.',
                  'Manual DND silences alerts until you turn it off.',
                  'The sleep timer silences alerts automatically during your chosen sleep hours.',
                ].map((text, i) => (
                  <XStack key={i} gap={10} alignItems="flex-start">
                    <Text fontSize={15} color={colors.primary.base} fontWeight="700">
                      {i + 1}.
                    </Text>
                    <Text fontSize={15} color={colors.text.secondary} flex={1}>
                      {text}
                    </Text>
                  </XStack>
                ))}
              </YStack>
            </AppCard>
          </>
        )}
      </YStack>
    </ScrollView>
  );
};

export default SettingsTab;
