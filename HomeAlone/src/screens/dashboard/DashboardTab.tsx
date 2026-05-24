import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Button, Text, View, XStack, YStack } from 'tamagui';
import { useDashboard } from '../../contexts/DashboardContext';
import { AppCard } from '../../components/AppCard';
import { AppStatusBadge } from '../../components/AppStatusBadge';
import { colors } from '../../theme/colors';

function plural(value: number, unit: string) {
  return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

function formatHour(hour: number) {
  const normalized = ((Number.isInteger(hour) ? hour : 0) % 24 + 24) % 24;
  const period = normalized >= 12 ? 'PM' : 'AM';
  const displayHour = normalized % 12 || 12;
  return `${displayHour}:00 ${period}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'No history yet';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No history yet';

  return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function formatMoney(cents: number) {
  return `$${(Number(cents || 0) / 100).toFixed(0)}`;
}

type DashboardTabProps = {
  onNavigate?: (tab: string) => void;
};

const DashboardTab: React.FC<DashboardTabProps> = ({ onNavigate }) => {
  const { dashboard, loading, refreshing, error, refreshDashboard } = useDashboard();

  if (loading && !dashboard) {
    return (
      <YStack flex={1} padding={24} justifyContent="center" alignItems="center" backgroundColor={colors.bg.base}>
        <Text fontSize={19} fontWeight="700" color={colors.text.secondary}>
          Loading your safety summary...
        </Text>
      </YStack>
    );
  }

  if (!dashboard) {
    return (
      <YStack flex={1} padding={24} justifyContent="center" alignItems="center" space={14} backgroundColor={colors.bg.base}>
        <Text fontSize={26} fontWeight="800" textAlign="center" color={colors.text.primary}>
          Dashboard unavailable
        </Text>
        <Text fontSize={17} color={colors.text.secondary} textAlign="center">
          {error || 'We could not load your HomeAlone overview right now.'}
        </Text>
        <Button
          backgroundColor={colors.primary.base}
          borderRadius={12}
          height={54}
          paddingHorizontal={24}
          marginTop={8}
          onPress={refreshDashboard}
        >
          <Text fontSize={17} fontWeight="800" color="#FFFFFF" textAlign="center">
            Try again
          </Text>
        </Button>
      </YStack>
    );
  }

  const primaryContact = dashboard.contacts[0] || null;
  const serviceActive = dashboard.subscription.serviceActive === true;
  const sleepSummary = dashboard.settings.sleepTimerEnabled
    ? `${formatHour(dashboard.settings.sleepStartHour)} to ${formatHour(dashboard.settings.sleepEndHour)}`
    : 'Off';
  const referralCents = dashboard.referral.stats.rewardCents || 0;
  const lastOk = formatDateTime(dashboard.stats.lastCheckInOk);
  const checkInStatus = serviceActive ? 'OK' : 'Paused';

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshDashboard}
          tintColor={colors.primary.base}
        />
      }
    >
      <YStack space={10}>
        {error ? (
          <AppCard accent="warning">
            <Text fontSize={16} color={colors.accent.warning}>
              {error}
            </Text>
          </AppCard>
        ) : null}

        <XStack space={10}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.7}
            onPress={() => onNavigate?.('settings')}
          >
            <AppCard flex={1} padding={14}>
              <Text fontSize={14} fontWeight="800" textTransform="uppercase" color={colors.text.tertiary}>
                Check-in every
              </Text>
              <Text fontSize={26} lineHeight={32} fontWeight="900" color={colors.text.primary} marginTop={3}>
                {plural(dashboard.settings.checkInIntervalHours, 'hour')}
              </Text>
              <Text fontSize={12} color={colors.text.secondary} marginTop={1}>
                Since last activity
              </Text>
            </AppCard>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.7}
            onPress={() => onNavigate?.('settings')}
          >
            <AppCard flex={1} padding={14}>
              <Text fontSize={14} fontWeight="800" textTransform="uppercase" color={colors.text.tertiary}>
                Respond within
              </Text>
              <Text fontSize={26} lineHeight={32} fontWeight="900" color={colors.secondary.base} marginTop={3}>
                {plural(dashboard.settings.emergencyCountdownMinutes, 'min')}
              </Text>
              <Text fontSize={12} color={colors.text.secondary} marginTop={1}>
                Emergency countdown
              </Text>
            </AppCard>
          </TouchableOpacity>
        </XStack>

        <XStack space={10}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.7}
            onPress={() => onNavigate?.('settings')}
          >
            <AppCard flex={1} minHeight={112} padding={14}>
              <View
                width={30}
                height={30}
                borderRadius={8}
                backgroundColor={colors.primary.light}
                alignItems="center"
                justifyContent="center"
                marginBottom={8}
              >
                <Text color={colors.primary.base} fontWeight="900">
                  T
                </Text>
              </View>
              <Text fontSize={14} fontWeight="800" textTransform="uppercase" color={colors.text.tertiary}>
                Check-in status
              </Text>
              <Text fontSize={26} lineHeight={32} fontWeight="900" color={colors.text.primary}>
                {checkInStatus}
              </Text>
              <Text fontSize={12} color={colors.text.secondary} marginTop={2}>
                {serviceActive ? 'Monitoring active' : 'Plan needed'}
              </Text>
            </AppCard>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.7}
            onPress={() => onNavigate?.('settings')}
          >
            <AppCard flex={1} minHeight={112} padding={14}>
              <View
                width={30}
                height={30}
                borderRadius={8}
                backgroundColor={colors.secondary.light}
                alignItems="center"
                justifyContent="center"
                marginBottom={8}
              >
                <Text color={colors.secondary.dark} fontWeight="900">
                  S
                </Text>
              </View>
              <Text fontSize={14} fontWeight="800" textTransform="uppercase" color={colors.text.tertiary}>
                DND mode
              </Text>
              <Text fontSize={26} lineHeight={32} fontWeight="900" color={colors.text.primary}>
                {dashboard.settings.dnd ? 'On' : 'Off'}
              </Text>
              <Text fontSize={12} color={colors.text.secondary} marginTop={2}>
                {dashboard.settings.dnd ? 'Alerts silenced' : 'Check-ins active'}
              </Text>
            </AppCard>
          </TouchableOpacity>
        </XStack>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onNavigate?.('emergency')}
        >
          <AppCard>
            <YStack space={12}>
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={14} fontWeight="800" textTransform="uppercase" color={colors.text.tertiary}>
                  Emergency contact
                </Text>
                {primaryContact ? <AppStatusBadge variant="success" label="Ready" /> : null}
              </XStack>

              {primaryContact ? (
                <>
                  <XStack alignItems="center" space={12}>
                    <View
                      width={48}
                      height={48}
                      borderRadius={24}
                      backgroundColor={colors.secondary.light}
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Text fontSize={22} fontWeight="900" color={colors.secondary.dark}>
                        {primaryContact.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <YStack flex={1}>
                      <Text fontSize={16} fontWeight="900" color={colors.text.primary}>
                        {primaryContact.name}
                      </Text>
                      <Text fontSize={13} color={colors.text.secondary} lineHeight={19}>
                        Priority {primaryContact.priority} - {`${primaryContact.countryCode || ''}${primaryContact.phone}`}
                      </Text>
                      {primaryContact.email ? (
                        <Text fontSize={13} color={colors.text.secondary} lineHeight={19}>
                          {primaryContact.email}
                        </Text>
                      ) : null}
                    </YStack>
                  </XStack>
                </>
              ) : (
                <Text fontSize={17} lineHeight={24} color={colors.text.secondary}>
                  Add one trusted contact so alerts have somewhere to go.
                </Text>
              )}
            </YStack>
          </AppCard>
        </TouchableOpacity>

        <XStack space={10}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.7}
            onPress={() => onNavigate?.('settings')}
          >
            <AppCard flex={1} padding={14}>
              <Text fontSize={14} fontWeight="800" textTransform="uppercase" color={colors.text.tertiary}>
                Sleep timer
              </Text>
              <Text fontSize={20} lineHeight={26} fontWeight="900" color={colors.text.primary} marginTop={3}>
                {sleepSummary}
              </Text>
              <Text fontSize={12} color={colors.text.secondary} marginTop={1}>
                Auto-silenced
              </Text>
            </AppCard>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.7}
            onPress={() => onNavigate?.('settings')}
          >
            <AppCard flex={1} padding={14}>
              <Text fontSize={14} fontWeight="800" textTransform="uppercase" color={colors.text.tertiary}>
                Referral credit
              </Text>
              <Text fontSize={28} lineHeight={34} fontWeight="900" color={colors.secondary.dark} marginTop={2}>
                {formatMoney(referralCents)}
              </Text>
              <Text fontSize={12} color={colors.text.secondary} marginTop={1}>
                Share to earn $10
              </Text>
            </AppCard>
          </TouchableOpacity>
        </XStack>

        <AppCard>
          <YStack space={12}>
            <XStack alignItems="center" gap={12}>
              <View
                width={30}
                height={30}
                borderRadius={8}
                backgroundColor={colors.primary.light}
                alignItems="center"
                justifyContent="center"
              >
                <Text color={colors.primary.base} fontWeight="900">
                  A
                </Text>
              </View>
              <YStack flex={1}>
                <Text fontSize={14} fontWeight="800" textTransform="uppercase" color={colors.text.tertiary}>
                  Recent activity
                </Text>
                <XStack alignItems="baseline" justifyContent="space-between">
                  <Text fontSize={15} fontWeight="900" color={colors.text.primary}>
                    Active today
                  </Text>
                  <Text fontSize={11} fontWeight="800" color={colors.accent.success}>
                    {serviceActive ? 'Live' : 'Paused'}
                  </Text>
                </XStack>
              </YStack>
            </XStack>

            <XStack justifyContent="space-between" gap={10}>
              <YStack alignItems="center" flex={1}>
                <Text fontSize={14} fontWeight="900" color={colors.text.primary} textAlign="center">
                  {lastOk}
                </Text>
                <Text fontSize={11} color={colors.text.tertiary} marginTop={1}>
                  Last OK
                </Text>
              </YStack>
              <YStack alignItems="center" flex={1}>
                <Text fontSize={15} fontWeight="900" color={colors.text.primary}>
                  {dashboard.stats.totalEmergencies}
                </Text>
                <Text fontSize={11} color={colors.text.tertiary} marginTop={1}>
                  Alerts sent
                </Text>
              </YStack>
              <YStack alignItems="center" flex={1}>
                <Text fontSize={15} fontWeight="900" color={colors.text.primary}>
                  {dashboard.stats.totalOkResponses}
                </Text>
                <Text fontSize={11} color={colors.text.tertiary} marginTop={1}>
                  Check-ins answered
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </AppCard>

        <XStack space={8}>
          <Button
            flex={1}
            height={48}
            borderRadius={14}
            backgroundColor={colors.primary.base}
            borderWidth={0}
          >
            <Text fontSize={15} fontWeight="900" color="#FFFFFF">
              I'm OK
            </Text>
          </Button>
          <Button
            flex={1}
            height={48}
            borderRadius={14}
            backgroundColor={colors.bg.card}
            borderWidth={1}
            borderColor={colors.border}
          >
            <Text fontSize={15} fontWeight="800" color={colors.text.primary}>
              I need help
            </Text>
          </Button>
        </XStack>
      </YStack>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});

export default DashboardTab;
