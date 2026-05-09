import React, { useEffect } from 'react';
import { Text, YStack, View, XStack } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';
import { usePayment } from '../../contexts/PaymentContext';

const DashboardTab: React.FC = () => {
  const { user } = useAuth();
  const { subscription, checkSubscriptionStatus, loading } = usePayment();

  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  const currentPlan = subscription?.plan || 'free';
  const planStatus = subscription?.status || (currentPlan === 'free' ? 'inactive' : 'pending');
  const renewLabel =
    subscription?.endDate && currentPlan !== 'free'
      ? subscription.autoRenew
        ? `Renews ${new Date(subscription.endDate).toLocaleDateString()}`
        : `Active until ${new Date(subscription.endDate).toLocaleDateString()}`
      : 'No active subscription yet';

  return (
    <YStack flex={1} padding="$4" space="$4" backgroundColor="$background">
      <YStack space="$2">
        <Text fontSize="$7" fontWeight="700">
          Welcome, {user?.name || user?.username}
        </Text>
        <Text fontSize="$4" color="$color11">
          Here is your HomeAlone overview.
        </Text>
      </YStack>

      <View
        backgroundColor={currentPlan === 'free' ? '$backgroundStrong' : '$blue10'}
        borderRadius="$5"
        padding="$4"
        borderWidth={1}
        borderColor={currentPlan === 'free' ? '$borderColor' : '$blue8'}
      >
        <YStack space="$3">
          <XStack alignItems="center" justifyContent="space-between">
            <YStack>
              <Text fontSize="$3" color={currentPlan === 'free' ? '$color11' : '$blue3'}>
                Subscription
              </Text>
              <Text
                fontSize="$7"
                fontWeight="800"
                color={currentPlan === 'free' ? '$color12' : 'white'}
                textTransform="capitalize"
              >
                {currentPlan}
              </Text>
            </YStack>

            <View
              backgroundColor={currentPlan === 'free' ? '$background' : 'rgba(255,255,255,0.16)'}
              borderRadius="$10"
              paddingHorizontal="$3"
              paddingVertical="$2"
            >
              <Text
                fontSize="$2"
                fontWeight="700"
                color={currentPlan === 'free' ? '$color11' : 'white'}
                textTransform="capitalize"
              >
                {loading ? 'Checking...' : planStatus}
              </Text>
            </View>
          </XStack>

          <Text fontSize="$3" color={currentPlan === 'free' ? '$color11' : '$blue3'}>
            {renewLabel}
          </Text>

          {currentPlan !== 'free' ? (
            <Text fontSize="$3" color="$blue2">
              Your paid plan is active in the app.
            </Text>
          ) : (
            <Text fontSize="$3" color="$color11">
              Upgrade from the Subscription tab whenever you are ready.
            </Text>
          )}
        </YStack>
      </View>

      <YStack
        backgroundColor="$backgroundStrong"
        borderRadius="$5"
        padding="$4"
        space="$2"
      >
        <Text fontSize="$5" fontWeight="700">
          Dashboard
        </Text>
        <Text fontSize="$4" color="$color11">
          More features can be added here over time. For now, your subscription status is visible above.
        </Text>
      </YStack>
    </YStack>
  );
};

export default DashboardTab;
