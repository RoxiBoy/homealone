import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { View, Text, Button, YStack, XStack } from 'tamagui';
import { usePayment, SubscriptionPlan } from '../../contexts/PaymentContext';
import { AppCard } from '../../components/AppCard';
import { AppStatusBadge } from '../../components/AppStatusBadge';
import { AppSectionHeader } from '../../components/AppSectionHeader';
import { colors } from '../../theme/colors';

const PLAN_COPY: Record<
  Exclude<SubscriptionPlan, 'free'>,
  {
    title: string;
    price: string;
    cadence: string;
    description: string;
    badge?: string;
    highlights: string[];
  }
> = {
  monthly: {
    title: 'Monthly',
    price: '$10',
    cadence: '/month',
    description: 'Flexible coverage with month-to-month billing.',
    highlights: [
      'Full HomeAlone safety monitoring',
      'Emergency contact escalation',
      'No lock-in commitment',
    ],
  },
  yearly: {
    title: 'Yearly',
    price: '$100',
    cadence: '/year',
    description: 'Best value for ongoing peace of mind and family support.',
    badge: 'Best value',
    highlights: [
      'Everything in Monthly',
      'Save $20 compared with monthly billing',
      'One simple annual renewal',
    ],
  },
};

const STATUS_TONE: Record<
  NonNullable<ReturnType<typeof getStatusTone>>,
  { background: string; text: string; border: string }
> = {
  success: {
    background: '#E8F5EE',
    text: colors.accent.success,
    border: '#CFE8D9',
  },
  warning: {
    background: colors.bg.warm,
    text: colors.accent.warning,
    border: '#F0D3AA',
  },
  danger: {
    background: '#F0E4E4',
    text: colors.accent.danger,
    border: '#E0C8C8',
  },
  neutral: {
    background: colors.bg.subtle,
    text: colors.text.secondary,
    border: colors.border,
  },
};

function getStatusTone(status: string | null | undefined) {
  if (status === 'active' || status === 'trialing') return 'success';
  if (status === 'past_due' || status === 'incomplete') return 'warning';
  if (status === 'canceled') return 'danger';
  return 'neutral';
}

const SubscriptionScreen: React.FC = () => {
  const {
    subscription,
    activateTestSubscription,
    checkSubscriptionStatus,
    cancelSubscription,
    reactivateSubscription,
    loading,
    error,
  } = usePayment();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');

  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  const handleSubscribe = async () => {
    try {
      await activateTestSubscription(selectedPlan === 'free' ? 'monthly' : selectedPlan);
      Alert.alert('Plan activated', 'Your testing plan is active. No payment flow was opened.');
    } catch {
      Alert.alert('Unable to continue', 'We could not activate the plan right now. Please try again.');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Stop subscription',
      'Are you sure you want to stop your subscription? Your coverage will remain active until the end of the current billing period, then the service will stop.',
      [
        { text: 'Keep subscription', style: 'cancel' },
        {
          text: 'Stop subscription',
          style: 'destructive',
          onPress: () => cancelSubscription().catch(() => {}),
        },
      ],
    );
  };

  const handleReactivate = async () => {
    try {
      await reactivateSubscription();
    } catch {
      Alert.alert('Unable to reactivate', 'Please try again in a moment.');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const currentPlan = subscription?.plan ?? 'free';
  const isFree = currentPlan === 'free';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const showReactivate = !!subscription && !isFree && subscription.autoRenew === false;

  const selectedPlanCopy = useMemo(() => {
    const planKey = selectedPlan === 'free' ? 'monthly' : selectedPlan;
    return PLAN_COPY[planKey];
  }, [selectedPlan]);

  const statusTone = STATUS_TONE[getStatusTone(subscription?.status)];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      <YStack space={16} padding={16} backgroundColor={colors.bg.base}>
        {/* Hero banner */}
        <View
          backgroundColor={colors.bg.cool}
          borderRadius={8}
          borderWidth={1}
          borderColor="#D6E8F1"
          padding={20}
        >
          <YStack space={12}>
            <Text fontSize={30} lineHeight={36} fontWeight="900" color={colors.primary.dark}>
              Keep HomeAlone monitoring active
            </Text>
            <Text fontSize={17} lineHeight={24} color={colors.text.secondary}>
              A subscription turns on check-ins, emergency contact escalation, and family peace of mind.
            </Text>
            <XStack flexWrap="wrap" gap={8}>
              {['Smartphone monitoring', 'Contact alerts'].map(label => (
                <View
                  key={label}
                  backgroundColor={colors.bg.card}
                  borderRadius={20}
                  paddingHorizontal={12}
                  paddingVertical={6}
                  borderWidth={1}
                  borderColor={colors.border}
                >
                  <Text fontSize={13} color={colors.primary.dark} fontWeight="700">
                    {label}
                  </Text>
                </View>
              ))}
            </XStack>
          </YStack>
        </View>

        {/* Current subscription status */}
        {!!subscription && !isFree && (
          <AppCard>
            <YStack space={12}>
              <XStack alignItems="center" justifyContent="space-between">
                <YStack>
                  <Text fontSize={15} color={statusTone.text} fontWeight="700">
                    Current plan
                  </Text>
                  <Text fontSize={26} fontWeight="900" color={statusTone.text} textTransform="capitalize">
                    {subscription.plan}
                  </Text>
                </YStack>
                <AppStatusBadge
                  variant={subscription.status === 'active' || subscription.status === 'trialing' ? 'success' : subscription.status === 'canceled' ? 'danger' : 'warning'}
                  label={subscription.status || 'Pending'}
                />
              </XStack>

              <XStack gap={12}>
                <YStack>
                  <Text fontSize={11} color={statusTone.text}>
                    {subscription.autoRenew ? 'Renews on' : 'Access until'}
                  </Text>
                  <Text fontSize={15} fontWeight="700" color={statusTone.text}>
                    {formatDate(subscription.endDate)}
                  </Text>
                </YStack>
                <YStack>
                  <Text fontSize={11} color={statusTone.text}>
                    Billing
                  </Text>
                  <Text fontSize={15} fontWeight="700" color={statusTone.text}>
                    {subscription.autoRenew ? 'Auto-renew on' : 'Auto-renew off'}
                  </Text>
                </YStack>
              </XStack>

              <XStack gap={8} flexWrap="wrap">
                {showReactivate ? (
                  <Button
                    height={44}
                    borderRadius={12}
                    backgroundColor={colors.accent.success}
                    borderWidth={0}
                    paddingHorizontal={20}
                    onPress={handleReactivate}
                    disabled={loading}
                    opacity={loading ? 0.6 : 1}
                  >
                    <Text fontSize={15} fontWeight="600" color="#FFFFFF">
                      Reactivate plan
                    </Text>
                  </Button>
                ) : null}

                {isActive ? (
                  <Button
                    height={44}
                    borderRadius={12}
                    backgroundColor="transparent"
                    borderWidth={1}
                    borderColor={colors.accent.danger}
                    paddingHorizontal={20}
                    onPress={handleCancel}
                    disabled={loading}
                    opacity={loading ? 0.6 : 1}
                  >
                    <Text fontSize={15} fontWeight="600" color={colors.accent.danger}>
                      Stop subscription
                    </Text>
                  </Button>
                ) : null}
              </XStack>
            </YStack>
          </AppCard>
        )}

        {error ? (
          <AppCard accent="danger">
            <Text fontSize={13} color={colors.accent.danger}>
              {error}
            </Text>
          </AppCard>
        ) : null}

        <AppSectionHeader title="Plans" subtitle="Both options include the full monitoring service." />

        {/* Plan cards */}
        <YStack space={12}>
          {(['monthly', 'yearly'] as const).map(plan => {
            const details = PLAN_COPY[plan];
            const isSelected = selectedPlan === plan;
            const isCurrentPlan = subscription?.plan === plan && !isFree;

            return (
              <AppCard
                key={plan}
                accent={isSelected ? 'primary' : 'none'}
              >
                <YStack space={12}>
                  <XStack alignItems="center" justifyContent="space-between">
                    <YStack flex={1} marginRight={12}>
                      <XStack alignItems="center" gap={8} flexWrap="wrap">
                        <Text fontSize={23} fontWeight="900" color={colors.text.primary}>
                          {details.title}
                        </Text>
                        {details.badge ? (
                          <AppStatusBadge variant="warning" label={details.badge} />
                        ) : null}
                        {isCurrentPlan ? (
                          <AppStatusBadge variant="success" label="Current" />
                        ) : null}
                      </XStack>
                      <Text fontSize={16} lineHeight={22} color={colors.text.secondary} marginTop={4}>
                        {details.description}
                      </Text>
                    </YStack>
                    <YStack alignItems="flex-end">
                      <Text fontSize={34} fontWeight="900" color={colors.primary.dark}>
                        {details.price}
                      </Text>
                      <Text fontSize={15} color={colors.text.secondary}>
                        {details.cadence}
                      </Text>
                    </YStack>
                  </XStack>

                  <YStack space={8}>
                    {details.highlights.map(item => (
                      <XStack key={item} gap={8} alignItems="center">
                        <Text fontSize={15} color={colors.primary.base} fontWeight="700">
                          {'\u2713'}
                        </Text>
                        <Text fontSize={15} color={colors.text.secondary}>
                          {item}
                        </Text>
                      </XStack>
                    ))}
                  </YStack>

                  <Button
                    height={48}
                    borderRadius={12}
                    backgroundColor={isSelected ? colors.primary.base : colors.bg.base}
                    borderWidth={1}
                    borderColor={isSelected ? colors.primary.base : colors.border}
                    onPress={() => setSelectedPlan(plan)}
                  >
                    <Text
                      fontSize={15}
                      fontWeight="800"
                      color={isSelected ? '#FFFFFF' : colors.text.primary}
                    >
                      {isSelected ? 'Selected' : `Choose ${details.title}`}
                    </Text>
                  </Button>
                </YStack>
              </AppCard>
            );
          })}
        </YStack>

        {/* Checkout CTA */}
        <AppCard>
          <YStack space={12}>
            <Text fontSize={21} fontWeight="900" color={colors.text.primary}>
              Ready to continue?
            </Text>
            <Text fontSize={16} lineHeight={22} color={colors.text.secondary}>
              You are choosing the {selectedPlanCopy.title.toLowerCase()} plan. For testing, this activates instantly without opening checkout.
            </Text>
            <Button
              height={56}
              borderRadius={14}
              backgroundColor={colors.primary.base}
              borderWidth={0}
              onPress={handleSubscribe}
              disabled={loading}
              opacity={loading ? 0.6 : 1}
            >
              <Text fontSize={17} fontWeight="800" color="#FFFFFF">
                {loading
                  ? 'Loading...'
                  : `Activate ${selectedPlanCopy.title} \u00B7 ${selectedPlanCopy.price}${selectedPlanCopy.cadence}`}
              </Text>
            </Button>
            <Text fontSize={11} color={colors.text.tertiary} textAlign="center">
              Temporary test mode. The existing Stripe checkout flow remains in the code.
            </Text>
          </YStack>
        </AppCard>
      </YStack>
    </ScrollView>
  );
};

export default SubscriptionScreen;
