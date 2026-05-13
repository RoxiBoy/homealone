import React from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { Button, Separator, Text, View, XStack, YStack } from 'tamagui';
import { useDashboard } from '../../contexts/DashboardContext';
import { useAuth } from '../../contexts/AuthContext';
import { AppCard } from '../../components/AppCard';
import { AppStatusBadge } from '../../components/AppStatusBadge';
import { colors } from '../../theme/colors';

function formatInterval(hours: number) {
  if (hours === 1) {
    return '1 hour';
  }

  return `${hours} hours`;
}

function formatMinutes(minutes: number) {
  if (minutes === 1) {
    return '1 minute';
  }

  return `${minutes} minutes`;
}

function formatHour(hour: number) {
  const safeHour = Number.isInteger(hour) ? hour : 0;
  const normalizedHour = ((safeHour % 24) + 24) % 24;
  const period = normalizedHour >= 12 ? 'PM' : 'AM';
  const displayHour = normalizedHour % 12 || 12;
  return `${displayHour}:00 ${period}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'No data yet';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'No data yet';
  }

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

const DashboardTab: React.FC = () => {
  const { user } = useAuth();
  const { dashboard, loading, refreshing, error, refreshDashboard } = useDashboard();

  if (loading && !dashboard) {
    return (
      <YStack flex={1} padding="$4" justifyContent="center" alignItems="center" backgroundColor={colors.bg.base}>
        <Text fontSize={17} fontWeight="600" color={colors.text.secondary}>
          Loading your dashboard...
        </Text>
      </YStack>
    );
  }

  if (!dashboard) {
    return (
      <YStack flex={1} padding="$4" justifyContent="center" alignItems="center" space={12} backgroundColor={colors.bg.base}>
        <Text fontSize={22} fontWeight="700" textAlign="center" color={colors.text.primary}>
          Dashboard unavailable
        </Text>
        <Text fontSize={15} color={colors.text.secondary} textAlign="center">
          {error || 'We could not load your HomeAlone overview right now.'}
        </Text>
        <Button
          backgroundColor={colors.primary.base}
          borderRadius={12}
          height={48}
          marginTop={8}
          onPress={refreshDashboard}
        >
          <Text fontSize={15} fontWeight="600" color="#FFFFFF" textAlign="center">
            Try again
          </Text>
        </Button>
      </YStack>
    );
  }

  const primaryContact = dashboard.contacts[0] || null;
  const sleepSummary = dashboard.settings.sleepTimerEnabled
    ? `${formatHour(dashboard.settings.sleepStartHour)} to ${formatHour(dashboard.settings.sleepEndHour)}`
    : 'Sleep timer is off';
  const subscriptionSummary =
    dashboard.subscription.plan === 'free'
      ? 'Free plan'
      : `${dashboard.subscription.plan} plan`;
  const subscriptionDetail =
    dashboard.subscription.plan === 'free'
      ? 'Upgrade from Subscription when you are ready.'
      : dashboard.subscription.endDate
        ? `${
            dashboard.subscription.autoRenew ? 'Renews' : 'Active until'
          } ${new Date(dashboard.subscription.endDate).toLocaleDateString()}`
        : 'Billing details will appear after activation.';

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
      <YStack space={16}>
        {/* Hero banner */}
        <View
          backgroundColor={colors.primary.base}
          borderRadius={20}
          padding={20}
        >
          <YStack space={6}>
            <Text fontSize={13} color="rgba(255,255,255,0.7)" textTransform="uppercase" letterSpacing={0.8}>
              Daily overview
            </Text>
            <Text fontSize={26} fontWeight="800" color="#FFFFFF">
              Welcome, {dashboard.user.name || user?.name || user?.username}
            </Text>
            <Text fontSize={15} color="rgba(255,255,255,0.8)">
              Your safety settings, emergency contacts, and recent response history are all in one place.
            </Text>
          </YStack>
        </View>

        {error ? (
          <AppCard accent="warning">
            <Text fontSize={13} color={colors.accent.warning}>
              {error}
            </Text>
          </AppCard>
        ) : null}

        {/* Stat cards grid */}
        <XStack space={12}>
          <AppCard accent="primary" flex={1} minHeight={110}>
            <YStack flex={1} justifyContent="space-between">
              <YStack space={4}>
                <Text fontSize={11} color={colors.text.tertiary} textTransform="uppercase" letterSpacing={0.8}>
                  Check-in interval
                </Text>
                <Text fontSize={22} fontWeight="800" color={colors.primary.base}>
                  {formatInterval(dashboard.settings.checkInIntervalHours)}
                </Text>
              </YStack>
              <Text fontSize={12} color={colors.text.tertiary}>
                How long HomeAlone waits before starting a safety check.
              </Text>
            </YStack>
          </AppCard>
          <AppCard accent="warning" flex={1} minHeight={110}>
            <YStack flex={1} justifyContent="space-between">
              <YStack space={4}>
                <Text fontSize={11} color={colors.text.tertiary} textTransform="uppercase" letterSpacing={0.8}>
                  Emergency countdown
                </Text>
                <Text fontSize={22} fontWeight="800" color={colors.accent.warning}>
                  {formatMinutes(dashboard.settings.emergencyCountdownMinutes)}
                </Text>
              </YStack>
              <Text fontSize={12} color={colors.text.tertiary}>
                How long you have to respond before escalation starts.
              </Text>
            </YStack>
          </AppCard>
        </XStack>

        <XStack space={12}>
          <AppCard accent="success" flex={1} minHeight={110}>
            <YStack flex={1} justifyContent="space-between">
              <YStack space={4}>
                <Text fontSize={11} color={colors.text.tertiary} textTransform="uppercase" letterSpacing={0.8}>
                  Sleep timer
                </Text>
                <Text fontSize={22} fontWeight="800" color={colors.accent.success}>
                  {dashboard.settings.sleepTimerEnabled ? 'Scheduled' : 'Off'}
                </Text>
              </YStack>
              <Text fontSize={12} color={colors.text.tertiary}>
                {sleepSummary}
              </Text>
            </YStack>
          </AppCard>
          <AppCard accent="info" flex={1} minHeight={110}>
            <YStack flex={1} justifyContent="space-between">
              <YStack space={4}>
                <Text fontSize={11} color={colors.text.tertiary} textTransform="uppercase" letterSpacing={0.8}>
                  Subscription
                </Text>
                <Text fontSize={22} fontWeight="800" color="#8A9BB0">
                  {subscriptionSummary}
                </Text>
              </YStack>
              <Text fontSize={12} color={colors.text.tertiary}>
                {subscriptionDetail}
              </Text>
            </YStack>
          </AppCard>
        </XStack>

        {/* Contact readiness */}
        <AppCard>
          <YStack space={12}>
            <Text fontSize={19} fontWeight="800" color={colors.text.primary}>
              Contact readiness
            </Text>
            {primaryContact ? (
              <>
                <XStack alignItems="center" space={12}>
                  <View
                    width={44}
                    height={44}
                    borderRadius={22}
                    backgroundColor={colors.primary.light}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Text fontSize={18} fontWeight="700" color={colors.primary.base}>
                      {primaryContact.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <YStack flex={1}>
                    <Text fontSize={17} fontWeight="700" color={colors.text.primary}>
                      {primaryContact.name}
                    </Text>
                    <AppStatusBadge
                      variant="info"
                      label={`Priority ${primaryContact.priority} contact`}
                    />
                  </YStack>
                </XStack>
                <Separator borderColor={colors.divider} />
                <YStack space={6}>
                  <Text fontSize={15} color={colors.text.secondary}>
                    Phone: {`${primaryContact.countryCode || ''}${primaryContact.phone}`}
                  </Text>
                  <Text fontSize={15} color={colors.text.secondary}>
                    Email: {primaryContact.email || 'Not provided'}
                  </Text>
                  <Text fontSize={15} color={colors.text.secondary}>
                    Relationship: {primaryContact.relationship || 'Not specified'}
                  </Text>
                </YStack>
              </>
            ) : (
              <Text fontSize={15} color={colors.text.secondary}>
                No emergency contacts are set yet. Add one from Emergency Contacts so alerts can reach someone quickly.
              </Text>
            )}
          </YStack>
        </AppCard>

        {/* Response history */}
        <AppCard>
          <YStack space={12}>
            <Text fontSize={19} fontWeight="800" color={colors.text.primary}>
              Response history
            </Text>
            <XStack space={12}>
              <YStack flex={1} space={4}>
                <Text fontSize={11} color={colors.text.tertiary} textTransform="uppercase" letterSpacing={0.8}>
                  Last alarm
                </Text>
                <Text fontSize={15} fontWeight="700" color={colors.text.primary}>
                  {formatDateTime(dashboard.stats.lastAlarmTime)}
                </Text>
              </YStack>
              <YStack flex={1} space={4}>
                <Text fontSize={11} color={colors.text.tertiary} textTransform="uppercase" letterSpacing={0.8}>
                  Last contact
                </Text>
                <Text fontSize={15} fontWeight="700" color={colors.text.primary}>
                  {formatDateTime(dashboard.stats.lastContactTime)}
                </Text>
              </YStack>
              <YStack flex={1} space={4}>
                <Text fontSize={11} color={colors.text.tertiary} textTransform="uppercase" letterSpacing={0.8}>
                  Last OK
                </Text>
                <Text fontSize={15} fontWeight="700" color={colors.text.primary}>
                  {formatDateTime(dashboard.stats.lastCheckInOk)}
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </AppCard>

        {/* Lifetime totals */}
        <AppCard>
          <YStack space={12}>
            <Text fontSize={19} fontWeight="800" color={colors.text.primary}>
              Lifetime totals
            </Text>
            <XStack flexWrap="wrap" space={0}>
              {[
                { label: 'Total alarms', value: dashboard.stats.totalAlarmsEver },
                { label: 'Contact calls', value: dashboard.stats.totalContactCallsEver },
                { label: 'OK responses', value: dashboard.stats.totalOkResponses },
                { label: 'Missed', value: dashboard.stats.totalMissedResponses },
                { label: 'Emergencies', value: dashboard.stats.totalEmergencies },
              ].map((stat, i) => (
                <View key={i} width="50%" paddingVertical={8}>
                  <Text fontSize={12} color={colors.text.tertiary}>
                    {stat.label}
                  </Text>
                  <Text fontSize={22} fontWeight="800" color={colors.text.primary}>
                    {stat.value}
                  </Text>
                </View>
              ))}
            </XStack>
          </YStack>
        </AppCard>
      </YStack>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
});

export default DashboardTab;
