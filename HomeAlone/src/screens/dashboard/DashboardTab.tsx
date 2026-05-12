import React from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { Button, Separator, Text, View, XStack, YStack } from 'tamagui';
import { useDashboard } from '../../contexts/DashboardContext';
import { useAuth } from '../../contexts/AuthContext';

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

type InfoCardProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string;
};

const InfoCard: React.FC<InfoCardProps> = ({ eyebrow, title, subtitle, accent }) => {
  return (
    <View
      flex={1}
      minHeight={132}
      backgroundColor="$backgroundStrong"
      borderRadius="$5"
      borderWidth={1}
      borderColor="$borderColor"
      padding="$4"
    >
      <YStack flex={1} justifyContent="space-between">
        <YStack space="$2">
          <Text fontSize="$2" color="$color11" textTransform="uppercase" letterSpacing={0.8}>
            {eyebrow}
          </Text>
          <Text fontSize="$7" fontWeight="800" color={accent}>
            {title}
          </Text>
        </YStack>
        <Text fontSize="$3" color="$color11">
          {subtitle}
        </Text>
      </YStack>
    </View>
  );
};

const DashboardTab: React.FC = () => {
  const { user } = useAuth();
  const { dashboard, loading, refreshing, error, refreshDashboard } = useDashboard();

  if (loading && !dashboard) {
    return (
      <YStack flex={1} padding="$4" justifyContent="center" alignItems="center" backgroundColor="$background">
        <Text fontSize="$5" fontWeight="700">
          Loading your dashboard...
        </Text>
      </YStack>
    );
  }

  if (!dashboard) {
    return (
      <YStack flex={1} padding="$4" justifyContent="center" alignItems="center" space="$3" backgroundColor="$background">
        <Text fontSize="$6" fontWeight="700" textAlign="center">
          Dashboard unavailable
        </Text>
        <Text fontSize="$4" color="$color11" textAlign="center">
          {error || 'We could not load your HomeAlone overview right now.'}
        </Text>
        <Button onPress={refreshDashboard}>Try again</Button>
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
        <RefreshControl refreshing={refreshing} onRefresh={refreshDashboard} />
      }
    >
      <YStack space="$4">
        <View
          backgroundColor="$blue10"
          borderRadius="$6"
          padding="$5"
          borderWidth={1}
          borderColor="$blue8"
        >
          <YStack space="$2">
            <Text fontSize="$3" color="$blue2" textTransform="uppercase" letterSpacing={1}>
              Daily overview
            </Text>
            <Text fontSize="$8" fontWeight="800" color="white">
              Welcome, {dashboard.user.name || user?.name || user?.username}
            </Text>
            <Text fontSize="$4" color="$blue2">
              Your safety settings, emergency contacts, and recent response history are all in one place.
            </Text>
          </YStack>
        </View>

        {error ? (
          <View
            backgroundColor="$yellow3"
            borderRadius="$4"
            padding="$3"
            borderWidth={1}
            borderColor="$yellow8"
          >
            <Text fontSize="$3" color="$yellow11">
              {error}
            </Text>
          </View>
        ) : null}

        <YStack space="$3">
          <XStack space="$3">
            <InfoCard
              eyebrow="Check-in interval"
              title={formatInterval(dashboard.settings.checkInIntervalHours)}
              subtitle="How long HomeAlone waits before starting a safety check."
              accent="$blue10"
            />
            <InfoCard
              eyebrow="Emergency countdown"
              title={formatMinutes(dashboard.settings.emergencyCountdownMinutes)}
              subtitle="How long you have to respond before escalation starts."
              accent="$orange10"
            />
          </XStack>

          <XStack space="$3">
            <InfoCard
              eyebrow="Sleep timer"
              title={dashboard.settings.sleepTimerEnabled ? 'Scheduled' : 'Off'}
              subtitle={sleepSummary}
              accent="$green10"
            />
            <InfoCard
              eyebrow="Subscription"
              title={subscriptionSummary}
              subtitle={subscriptionDetail}
              accent="$purple10"
            />
          </XStack>
        </YStack>

        <View
          backgroundColor="$backgroundStrong"
          borderRadius="$5"
          borderWidth={1}
          borderColor="$borderColor"
          padding="$4"
        >
          <YStack space="$3">
            <Text fontSize="$6" fontWeight="800">
              Contact readiness
            </Text>
            {primaryContact ? (
              <>
                <YStack space="$1">
                  <Text fontSize="$5" fontWeight="700">
                    {primaryContact.name}
                  </Text>
                  <Text color="$color11">
                    Priority {primaryContact.priority} contact
                  </Text>
                </YStack>
                <Separator />
                <YStack space="$2">
                  <Text fontSize="$4">
                    Phone: {`${primaryContact.countryCode || ''}${primaryContact.phone}`}
                  </Text>
                  <Text fontSize="$4">
                    Email: {primaryContact.email || 'Not provided'}
                  </Text>
                  <Text fontSize="$4">
                    Relationship: {primaryContact.relationship || 'Not specified'}
                  </Text>
                </YStack>
              </>
            ) : (
              <Text fontSize="$4" color="$color11">
                No emergency contacts are set yet. Add one from Emergency Contacts so alerts can reach someone quickly.
              </Text>
            )}
          </YStack>
        </View>

        <View
          backgroundColor="$backgroundStrong"
          borderRadius="$5"
          borderWidth={1}
          borderColor="$borderColor"
          padding="$4"
        >
          <YStack space="$3">
            <Text fontSize="$6" fontWeight="800">
              Response history
            </Text>
            <YStack space="$3">
              <YStack space="$1">
                <Text fontSize="$3" color="$color11" textTransform="uppercase" letterSpacing={0.8}>
                  Last alarm
                </Text>
                <Text fontSize="$5" fontWeight="700">
                  {formatDateTime(dashboard.stats.lastAlarmTime)}
                </Text>
              </YStack>
              <YStack space="$1">
                <Text fontSize="$3" color="$color11" textTransform="uppercase" letterSpacing={0.8}>
                  Last contact alert
                </Text>
                <Text fontSize="$5" fontWeight="700">
                  {formatDateTime(dashboard.stats.lastContactTime)}
                </Text>
              </YStack>
              <YStack space="$1">
                <Text fontSize="$3" color="$color11" textTransform="uppercase" letterSpacing={0.8}>
                  Last check-in OK
                </Text>
                <Text fontSize="$5" fontWeight="700">
                  {formatDateTime(dashboard.stats.lastCheckInOk)}
                </Text>
              </YStack>
            </YStack>
          </YStack>
        </View>

        <View
          backgroundColor="$backgroundStrong"
          borderRadius="$5"
          borderWidth={1}
          borderColor="$borderColor"
          padding="$4"
        >
          <YStack space="$3">
            <Text fontSize="$6" fontWeight="800">
              Lifetime totals
            </Text>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$4" color="$color11">
                Total alarms
              </Text>
              <Text fontSize="$6" fontWeight="800">
                {dashboard.stats.totalAlarmsEver}
              </Text>
            </XStack>
            <Separator />
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$4" color="$color11">
                Contact calls
              </Text>
              <Text fontSize="$6" fontWeight="800">
                {dashboard.stats.totalContactCallsEver}
              </Text>
            </XStack>
            <Separator />
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$4" color="$color11">
                OK responses
              </Text>
              <Text fontSize="$6" fontWeight="800">
                {dashboard.stats.totalOkResponses}
              </Text>
            </XStack>
            <Separator />
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$4" color="$color11">
                Missed responses
              </Text>
              <Text fontSize="$6" fontWeight="800">
                {dashboard.stats.totalMissedResponses}
              </Text>
            </XStack>
            <Separator />
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$4" color="$color11">
                Emergencies escalated
              </Text>
              <Text fontSize="$6" fontWeight="800">
                {dashboard.stats.totalEmergencies}
              </Text>
            </XStack>
          </YStack>
        </View>
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
