import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Share } from 'react-native';
import { Text, Button, YStack, XStack, Input } from 'tamagui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../config/api';
import { AppCard } from '../../components/AppCard';
import { AppToggle } from '../../components/AppToggle';
import { AppSectionHeader } from '../../components/AppSectionHeader';
import { AppCollapsibleSection } from '../../components/AppCollapsibleSection';
import { colors } from '../../theme/colors';

const ACTIVITY_SETTINGS_KEY = '@homealone/activity-settings';

const CHECK_IN_OPTIONS = [1, 2, 4, 6, 8, 12, 24];
const COUNTDOWN_OPTIONS = [1, 2, 5, 10, 15, 30, 60];

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

type ReferralInfo = {
  code: string | null;
  shareLink: string | null;
  referredBy: string | null;
  stats: {
    signups: number;
    conversions: number;
    rewardCents: number;
    rewardDollars: number;
  };
  rewardGrantedAt: string | null;
};

const getDeviceTimezone = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone || 'UTC';
  } catch {
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

const formatMoney = (cents: number) => `$${(Number(cents || 0) / 100).toFixed(0)}`;

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
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralApplying, setReferralApplying] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);

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

  useEffect(() => {
    const loadReferralStatus = async () => {
      if (!token) return;

      try {
        setReferralLoading(true);
        const response = await apiFetch<{ referral: ReferralInfo }>('/users/referral', {
          method: 'GET',
          token,
        });
        setReferralInfo(response.referral);
        await updateUser({ referral: response.referral });
      } catch (error) {
        console.warn('[SettingsTab] Failed to load referral status', error);
      } finally {
        setReferralLoading(false);
      }
    };

    loadReferralStatus();
  }, [token, updateUser]);

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

  const shareReferralCode = async () => {
    if (!referralInfo?.code) {
      return;
    }

    const shareMessage = referralInfo.shareLink
      ? `Join me on HomeAlone and use my referral code ${referralInfo.code}. ${referralInfo.shareLink}`
      : `Join me on HomeAlone and use my referral code ${referralInfo.code}.`;

    try {
      await Share.share({
        message: shareMessage,
      });
    } catch (error) {
      console.warn('[SettingsTab] Failed to share referral code', error);
    }
  };

  const applyReferralCode = async () => {
    const normalizedCode = referralCodeInput.trim().toUpperCase();
    if (!normalizedCode) {
      Alert.alert('Referral code required', 'Enter a referral code to apply it.');
      return;
    }

    if (!token) {
      Alert.alert('Sign in required', 'Please sign in to apply a referral code.');
      return;
    }

    try {
      setReferralApplying(true);
      const response = await apiFetch<{ referral: ReferralInfo; message: string }>(
        '/users/referral/apply',
        {
          method: 'POST',
          token,
          body: JSON.stringify({ code: normalizedCode }),
        },
      );
      setReferralInfo(response.referral);
      await updateUser({ referral: response.referral });
      setReferralCodeInput('');
      Alert.alert('Referral applied', response.message || 'Referral code applied successfully.');
    } catch (error: any) {
      Alert.alert('Could not apply referral code', error?.message || 'Please try again.');
    } finally {
      setReferralApplying(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <YStack padding={16} space={16}>
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
        <AppCollapsibleSection
          title="Do Not Disturb"
          subtitle="Temporarily silence all check-in alerts."
        >
          <AppCard>
            <XStack alignItems="center" justifyContent="space-between" paddingVertical={4}>
              <YStack>
                <Text fontSize={13} color={colors.text.tertiary} textTransform="uppercase" letterSpacing={0.8}>
                  Status
                </Text>
                <Text fontSize={34} fontWeight="900" color={settings.dnd ? colors.accent.warning : colors.accent.success}>
                  {settings.dnd ? 'On' : 'Off'}
                </Text>
                <Text fontSize={12} color={colors.text.secondary} marginTop={1}>
                  {settings.dnd ? 'Alerts silenced' : 'Check-ins active'}
                </Text>
              </YStack>
              <AppToggle
                checked={settings.dnd}
                onCheckedChange={(val) =>
                  updateSettingsPartial({ dnd: val })
                }
              />
            </XStack>
            <Text fontSize={15} color={colors.text.tertiary} marginTop={8}>
              {dndStatusText}
            </Text>
          </AppCard>
        </AppCollapsibleSection>

        {loading ? (
          <Text fontSize={15} color={colors.text.secondary} textAlign="center" marginTop={16}>
            Loading settings...
          </Text>
        ) : (
          <>
            {/* Check-in Interval */}
            <AppCollapsibleSection
              title="Check-in interval"
              subtitle="How long after your last activity we should wait before checking in on you."
            >
              <AppCard accent="primary">
                <XStack alignItems="center" justifyContent="space-between" paddingVertical={4}>
                  <Button
                    size="$3"
                    width={52}
                    height={52}
                    borderRadius={14}
                    backgroundColor={colors.bg.base}
                    borderWidth={1}
                    borderColor={colors.border}
                    disabled={CHECK_IN_OPTIONS.indexOf(settings.checkInTime) <= 0}
                    opacity={CHECK_IN_OPTIONS.indexOf(settings.checkInTime) <= 0 ? 0.4 : 1}
                    onPress={() => {
                      const idx = CHECK_IN_OPTIONS.indexOf(settings.checkInTime);
                      if (idx > 0) updateSettingsPartial({ checkInTime: CHECK_IN_OPTIONS[idx - 1] });
                    }}
                    paddingHorizontal={0}
                  >
                    <Text fontSize={24} fontWeight="700" color={colors.text.primary}>
                      {'\u2212'}
                    </Text>
                  </Button>

                  <YStack alignItems="center" flex={1}>
                    <Text fontSize={34} fontWeight="900" color={colors.primary.dark} textAlign="center">
                      {formatters.interval(settings.checkInTime)}
                    </Text>
                  </YStack>

                  <Button
                    size="$3"
                    width={52}
                    height={52}
                    borderRadius={14}
                    backgroundColor={colors.bg.base}
                    borderWidth={1}
                    borderColor={colors.border}
                    disabled={CHECK_IN_OPTIONS.indexOf(settings.checkInTime) >= CHECK_IN_OPTIONS.length - 1}
                    opacity={CHECK_IN_OPTIONS.indexOf(settings.checkInTime) >= CHECK_IN_OPTIONS.length - 1 ? 0.4 : 1}
                    onPress={() => {
                      const idx = CHECK_IN_OPTIONS.indexOf(settings.checkInTime);
                      if (idx < CHECK_IN_OPTIONS.length - 1) updateSettingsPartial({ checkInTime: CHECK_IN_OPTIONS[idx + 1] });
                    }}
                    paddingHorizontal={0}
                  >
                    <Text fontSize={24} fontWeight="700" color={colors.text.primary}>
                      {'+'}
                    </Text>
                  </Button>
                </XStack>
              </AppCard>
            </AppCollapsibleSection>

            {/* Emergency Countdown */}
            <AppCollapsibleSection
              title="Emergency countdown"
              subtitle="How long to wait for your response after a check-in before triggering emergency contacts."
            >
              <AppCard accent="warning">
                <XStack alignItems="center" justifyContent="space-between" paddingVertical={4}>
                  <Button
                    size="$3"
                    width={52}
                    height={52}
                    borderRadius={14}
                    backgroundColor={colors.bg.base}
                    borderWidth={1}
                    borderColor={colors.border}
                    disabled={COUNTDOWN_OPTIONS.indexOf(settings.countdownTime) <= 0}
                    opacity={COUNTDOWN_OPTIONS.indexOf(settings.countdownTime) <= 0 ? 0.4 : 1}
                    onPress={() => {
                      const idx = COUNTDOWN_OPTIONS.indexOf(settings.countdownTime);
                      if (idx > 0) updateSettingsPartial({ countdownTime: COUNTDOWN_OPTIONS[idx - 1] });
                    }}
                    paddingHorizontal={0}
                  >
                    <Text fontSize={24} fontWeight="700" color={colors.text.primary}>
                      {'\u2212'}
                    </Text>
                  </Button>

                  <YStack alignItems="center" flex={1}>
                    <Text fontSize={34} fontWeight="900" color={colors.secondary.dark} textAlign="center">
                      {formatters.countdown(settings.countdownTime)}
                    </Text>
                  </YStack>

                  <Button
                    size="$3"
                    width={52}
                    height={52}
                    borderRadius={14}
                    backgroundColor={colors.bg.base}
                    borderWidth={1}
                    borderColor={colors.border}
                    disabled={COUNTDOWN_OPTIONS.indexOf(settings.countdownTime) >= COUNTDOWN_OPTIONS.length - 1}
                    opacity={COUNTDOWN_OPTIONS.indexOf(settings.countdownTime) >= COUNTDOWN_OPTIONS.length - 1 ? 0.4 : 1}
                    onPress={() => {
                      const idx = COUNTDOWN_OPTIONS.indexOf(settings.countdownTime);
                      if (idx < COUNTDOWN_OPTIONS.length - 1) updateSettingsPartial({ countdownTime: COUNTDOWN_OPTIONS[idx + 1] });
                    }}
                    paddingHorizontal={0}
                  >
                    <Text fontSize={24} fontWeight="700" color={colors.text.primary}>
                      {'+'}
                    </Text>
                  </Button>
                </XStack>
              </AppCard>
            </AppCollapsibleSection>

            {/* Sleep Timer */}
            <AppCollapsibleSection
              title="Sleep timer"
              subtitle="Silence check-in alerts automatically while you usually sleep."
            >
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
                    <Text fontSize={15} fontWeight="600" color={colors.text.secondary} marginBottom={8}>
                      Sleep starts
                    </Text>
                    <XStack alignItems="center" space={8}>
                      <Button
                        size="$2"
                        width={40}
                        height={40}
                        borderRadius={10}
                        backgroundColor={colors.bg.base}
                        borderWidth={1}
                        borderColor={colors.border}
                        disabled={settings.sleepStartHour <= 0}
                        opacity={settings.sleepStartHour <= 0 ? 0.4 : 1}
                        onPress={() =>
                          updateSettingsPartial({
                            sleepStartHour: Math.max(0, settings.sleepStartHour - 1),
                            sleepTimezone: getDeviceTimezone(),
                          })
                        }
                        paddingHorizontal={0}
                      >
                        <Text fontSize={18} fontWeight="700" color={colors.text.primary}>
                          {'\u2212'}
                        </Text>
                      </Button>

                      <Text fontSize={22} fontWeight="700" color={colors.primary.base} minWidth={70} textAlign="center">
                        {formatHourLabel(settings.sleepStartHour)}
                      </Text>

                      <Button
                        size="$2"
                        width={40}
                        height={40}
                        borderRadius={10}
                        backgroundColor={colors.bg.base}
                        borderWidth={1}
                        borderColor={colors.border}
                        disabled={settings.sleepStartHour >= 23}
                        opacity={settings.sleepStartHour >= 23 ? 0.4 : 1}
                        onPress={() =>
                          updateSettingsPartial({
                            sleepStartHour: Math.min(23, settings.sleepStartHour + 1),
                            sleepTimezone: getDeviceTimezone(),
                          })
                        }
                        paddingHorizontal={0}
                      >
                        <Text fontSize={18} fontWeight="700" color={colors.text.primary}>
                          {'+'}
                        </Text>
                      </Button>
                    </XStack>
                  </YStack>

                  <YStack flex={1} alignItems="center">
                    <Text fontSize={15} fontWeight="600" color={colors.text.secondary} marginBottom={8}>
                      Sleep ends
                    </Text>
                    <XStack alignItems="center" space={8}>
                      <Button
                        size="$2"
                        width={40}
                        height={40}
                        borderRadius={10}
                        backgroundColor={colors.bg.base}
                        borderWidth={1}
                        borderColor={colors.border}
                        disabled={settings.sleepEndHour <= 0}
                        opacity={settings.sleepEndHour <= 0 ? 0.4 : 1}
                        onPress={() =>
                          updateSettingsPartial({
                            sleepEndHour: Math.max(0, settings.sleepEndHour - 1),
                            sleepTimezone: getDeviceTimezone(),
                          })
                        }
                        paddingHorizontal={0}
                      >
                        <Text fontSize={18} fontWeight="700" color={colors.text.primary}>
                          {'\u2212'}
                        </Text>
                      </Button>

                      <Text fontSize={22} fontWeight="700" color={colors.primary.base} minWidth={70} textAlign="center">
                        {formatHourLabel(settings.sleepEndHour)}
                      </Text>

                      <Button
                        size="$2"
                        width={40}
                        height={40}
                        borderRadius={10}
                        backgroundColor={colors.bg.base}
                        borderWidth={1}
                        borderColor={colors.border}
                        disabled={settings.sleepEndHour >= 23}
                        opacity={settings.sleepEndHour >= 23 ? 0.4 : 1}
                        onPress={() =>
                          updateSettingsPartial({
                            sleepEndHour: Math.min(23, settings.sleepEndHour + 1),
                            sleepTimezone: getDeviceTimezone(),
                          })
                        }
                        paddingHorizontal={0}
                      >
                        <Text fontSize={18} fontWeight="700" color={colors.text.primary}>
                          {'+'}
                        </Text>
                      </Button>
                    </XStack>
                  </YStack>
                </XStack>
              </AppCard>
            </AppCollapsibleSection>

            {/* Referral */}
            <AppSectionHeader
              title="Referral program"
              subtitle="Invite trusted friends and track your referral rewards."
            />
            <AppCard accent="info">
              <YStack space={12}>
                <YStack space={4}>
                  <Text fontSize={13} color={colors.text.tertiary} textTransform="uppercase" letterSpacing={0.8}>
                    Your referral code
                  </Text>
                  <Text fontSize={24} fontWeight="800" color={colors.primary.base}>
                    {referralLoading ? 'Loading…' : referralInfo?.code || 'Unavailable'}
                  </Text>
                  <Text fontSize={13} color={colors.text.secondary}>
                    Earn $10 credit for each successful paid referral.
                  </Text>
                </YStack>

                <XStack space={12}>
                  <YStack flex={1}>
                    <Text fontSize={12} color={colors.text.tertiary}>
                      Signups
                    </Text>
                    <Text fontSize={20} fontWeight="700" color={colors.text.primary}>
                      {referralInfo?.stats.signups || 0}
                    </Text>
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize={12} color={colors.text.tertiary}>
                      Conversions
                    </Text>
                    <Text fontSize={20} fontWeight="700" color={colors.text.primary}>
                      {referralInfo?.stats.conversions || 0}
                    </Text>
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize={12} color={colors.text.tertiary}>
                      Credits
                    </Text>
                    <Text fontSize={20} fontWeight="700" color={colors.secondary.dark}>
                      {formatMoney(referralInfo?.stats.rewardCents || 0)}
                    </Text>
                  </YStack>
                </XStack>

                <Button
                  height={46}
                  borderRadius={12}
                  backgroundColor={colors.primary.base}
                  borderWidth={0}
                  onPress={shareReferralCode}
                  disabled={!referralInfo?.code}
                  opacity={!referralInfo?.code ? 0.5 : 1}
                >
                  <Text fontSize={15} fontWeight="600" color="#FFFFFF">
                    Share referral code
                  </Text>
                </Button>

                {referralInfo?.referredBy ? (
                  <Text fontSize={13} color={colors.text.secondary}>
                    A referral code has already been applied to this account.
                  </Text>
                ) : (
                  <YStack space={8}>
                    <Input
                      placeholder="Apply a referral code"
                      value={referralCodeInput}
                      onChangeText={(text) => setReferralCodeInput(text.toUpperCase())}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      color={colors.text.primary}
                      placeholderTextColor={colors.text.tertiary}
                      height={48}
                      borderRadius={12}
                      fontSize={16}
                      borderWidth={1}
                      borderColor={colors.border}
                      paddingHorizontal={14}
                      backgroundColor={colors.bg.card}
                    />
                    <Button
                      height={44}
                      borderRadius={12}
                      backgroundColor="transparent"
                      borderWidth={1}
                      borderColor={colors.border}
                      onPress={applyReferralCode}
                      disabled={referralApplying}
                      opacity={referralApplying ? 0.6 : 1}
                    >
                      <Text fontSize={14} fontWeight="600" color={colors.text.primary}>
                        {referralApplying ? 'Applying…' : 'Apply code'}
                      </Text>
                    </Button>
                  </YStack>
                )}
              </YStack>
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
