import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Linking, Alert } from 'react-native';
import { View, Text, Button, YStack, XStack } from 'tamagui';
import { usePayment, SubscriptionPlan } from '../../contexts/PaymentContext';

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
    description: 'Flexible coverage with the freedom to cancel anytime.',
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
    background: '$green3',
    text: '$green11',
    border: '$green7',
  },
  warning: {
    background: '$yellow3',
    text: '$yellow11',
    border: '$yellow7',
  },
  danger: {
    background: '$red3',
    text: '$red11',
    border: '$red7',
  },
  neutral: {
    background: '$backgroundStrong',
    text: '$color11',
    border: '$borderColor',
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
    createCheckoutSession,
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
      const url = await createCheckoutSession(selectedPlan === 'free' ? 'monthly' : selectedPlan);
      await Linking.openURL(url);
    } catch (paymentError) {
      Alert.alert('Unable to continue', 'We could not start checkout right now. Please try again.');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel subscription',
      'Are you sure you want to cancel? Your coverage will remain active until the end of the current billing period.',
      [
        { text: 'Keep subscription', style: 'cancel' },
        {
          text: 'Cancel subscription',
          style: 'destructive',
          onPress: () => cancelSubscription().catch(() => {}),
        },
      ],
    );
  };

  const handleReactivate = async () => {
    try {
      await reactivateSubscription();
    } catch (paymentError) {
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
    <ScrollView style={{ flex: 1 }}>
      <YStack space="$4" padding="$4" backgroundColor="$background">
        <View backgroundColor="$blue10" borderRadius="$5" padding="$5">
          <YStack space="$3">
            <Text fontSize="$8" fontWeight="800" color="white">
              Choose the right HomeAlone plan
            </Text>
            <Text fontSize="$4" color="$blue3">
              Keep safety monitoring active with a simple monthly option or save with yearly billing.
            </Text>

            <XStack flexWrap="wrap" gap="$2">
              <View backgroundColor="rgba(255,255,255,0.14)" borderRadius="$10" paddingHorizontal="$3" paddingVertical="$2">
                <Text fontSize="$2" color="white">
                  Smartphone-based monitoring
                </Text>
              </View>
              <View backgroundColor="rgba(255,255,255,0.14)" borderRadius="$10" paddingHorizontal="$3" paddingVertical="$2">
                <Text fontSize="$2" color="white">
                  Trusted contact alerts
                </Text>
              </View>
              <View backgroundColor="rgba(255,255,255,0.14)" borderRadius="$10" paddingHorizontal="$3" paddingVertical="$2">
                <Text fontSize="$2" color="white">
                  Cancel anytime
                </Text>
              </View>
            </XStack>
          </YStack>
        </View>

        {!!subscription && !isFree && (
          <View
            backgroundColor={statusTone.background}
            borderRadius="$5"
            borderWidth={1}
            borderColor={statusTone.border}
            padding="$4"
          >
            <YStack space="$3">
              <XStack alignItems="center" justifyContent="space-between">
                <YStack>
                  <Text fontSize="$3" color={statusTone.text}>
                    Current plan
                  </Text>
                  <Text fontSize="$7" fontWeight="800" color={statusTone.text} textTransform="capitalize">
                    {subscription.plan}
                  </Text>
                </YStack>

                <View
                  backgroundColor="$background"
                  borderRadius="$10"
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                >
                  <Text fontSize="$2" fontWeight="700" color={statusTone.text} textTransform="capitalize">
                    {subscription.status || 'Pending'}
                  </Text>
                </View>
              </XStack>

              <XStack flexWrap="wrap" gap="$3">
                <YStack minWidth={140}>
                  <Text fontSize="$2" color={statusTone.text}>
                    {subscription.autoRenew ? 'Renews on' : 'Access until'}
                  </Text>
                  <Text fontSize="$4" fontWeight="700" color={statusTone.text}>
                    {formatDate(subscription.endDate)}
                  </Text>
                </YStack>

                <YStack minWidth={140}>
                  <Text fontSize="$2" color={statusTone.text}>
                    Billing
                  </Text>
                  <Text fontSize="$4" fontWeight="700" color={statusTone.text}>
                    {subscription.autoRenew ? 'Auto-renew on' : 'Auto-renew off'}
                  </Text>
                </YStack>
              </XStack>

              <XStack gap="$3" flexWrap="wrap">
                {showReactivate ? (
                  <Button
                    size="$4"
                    backgroundColor="$green9"
                    onPress={handleReactivate}
                    disabled={loading}
                    opacity={loading ? 0.6 : 1}
                  >
                    Reactivate plan
                  </Button>
                ) : null}

                {isActive ? (
                  <Button
                    size="$4"
                    variant="outlined"
                    borderColor="$red8"
                    color="$red10"
                    onPress={handleCancel}
                    disabled={loading}
                    opacity={loading ? 0.6 : 1}
                  >
                    Cancel subscription
                  </Button>
                ) : null}
              </XStack>
            </YStack>
          </View>
        )}

        {error ? (
          <View backgroundColor="$red3" borderRadius="$4" borderWidth={1} borderColor="$red7" padding="$3">
            <Text fontSize="$3" color="$red11">
              {error}
            </Text>
          </View>
        ) : null}

        <YStack space="$3">
          <Text fontSize="$6" fontWeight="700">
            Compare plans
          </Text>
          <Text fontSize="$3" color="$color11">
            Both plans include the full monitoring experience. Choose the billing style that suits you best.
          </Text>
        </YStack>

        <YStack space="$3">
          {(['monthly', 'yearly'] as const).map(plan => {
            const details = PLAN_COPY[plan];
            const isSelected = selectedPlan === plan;
            const isCurrentPlan = subscription?.plan === plan && !isFree;

            return (
              <View
                key={plan}
                backgroundColor={isSelected ? '$blue2' : '$backgroundStrong'}
                borderRadius="$5"
                borderWidth={2}
                borderColor={isSelected ? '$blue8' : '$borderColor'}
                padding="$4"
              >
                <YStack space="$3">
                  <XStack alignItems="center" justifyContent="space-between">
                    <YStack flex={1} marginRight="$3">
                      <XStack alignItems="center" gap="$2" flexWrap="wrap">
                        <Text fontSize="$6" fontWeight="800">
                          {details.title}
                        </Text>
                        {details.badge ? (
                          <View backgroundColor="$orange8" borderRadius="$10" paddingHorizontal="$3" paddingVertical="$1">
                            <Text fontSize="$1" fontWeight="700" color="white">
                              {details.badge}
                            </Text>
                          </View>
                        ) : null}
                        {isCurrentPlan ? (
                          <View backgroundColor="$green8" borderRadius="$10" paddingHorizontal="$3" paddingVertical="$1">
                            <Text fontSize="$1" fontWeight="700" color="white">
                              Current
                            </Text>
                          </View>
                        ) : null}
                      </XStack>

                      <Text fontSize="$3" color="$color11" marginTop="$2">
                        {details.description}
                      </Text>
                    </YStack>

                    <YStack alignItems="flex-end">
                      <Text fontSize="$8" fontWeight="900" color="$blue10">
                        {details.price}
                      </Text>
                      <Text fontSize="$3" color="$color11">
                        {details.cadence}
                      </Text>
                    </YStack>
                  </XStack>

                  <YStack space="$2">
                    {details.highlights.map(item => (
                      <XStack key={item} gap="$2" alignItems="center">
                        <Text fontSize="$3" color="$blue10">
                          •
                        </Text>
                        <Text fontSize="$3" color="$color11">
                          {item}
                        </Text>
                      </XStack>
                    ))}
                  </YStack>

                  <Button
                    size="$4"
                    backgroundColor={isSelected ? '$blue9' : '$background'}
                    borderWidth={1}
                    borderColor={isSelected ? '$blue9' : '$borderColor'}
                    color={isSelected ? 'white' : '$color12'}
                    onPress={() => setSelectedPlan(plan)}
                  >
                    {isSelected ? 'Selected' : `Choose ${details.title}`}
                  </Button>
                </YStack>
              </View>
            );
          })}
        </YStack>

        <View backgroundColor="$backgroundStrong" borderRadius="$5" padding="$4">
          <YStack space="$3">
            <Text fontSize="$5" fontWeight="700">
              Ready to continue?
            </Text>
            <Text fontSize="$3" color="$color11">
              You are choosing the {selectedPlanCopy.title.toLowerCase()} plan. Checkout opens securely in Stripe.
            </Text>

            <Button
              size="$5"
              backgroundColor="$blue9"
              onPress={handleSubscribe}
              disabled={loading}
              opacity={loading ? 0.6 : 1}
            >
              <Text fontSize="$4" fontWeight="800" color="white">
                {loading
                  ? 'Loading...'
                  : `Continue with ${selectedPlanCopy.title} · ${selectedPlanCopy.price}${selectedPlanCopy.cadence}`}
              </Text>
            </Button>

            <Text fontSize="$2" color="$color11">
              Secure checkout. You can manage or cancel your subscription later.
            </Text>
          </YStack>
        </View>
      </YStack>
    </ScrollView>
  );
};

export default SubscriptionScreen;
