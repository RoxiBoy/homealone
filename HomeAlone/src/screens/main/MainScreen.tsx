import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Button, Text, View, XStack, YStack } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';
import { usePayment } from '../../contexts/PaymentContext';
import { colors } from '../../theme/colors';
import DashboardTab from '../dashboard/DashboardTab';
import SettingsTab from '../settings/SettingsTab';
import EmergencyContactsTab from '../settings/EmergencyContactsTab';
import SubscriptionScreen from '../subscription/SubscriptionScreen';
import TestTab from '../test/TestTab';

type MainTabKey = 'dashboard' | 'emergency' | 'settings' | 'subscription' | 'test';

const PRIMARY_TABS: { key: MainTabKey; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Home', icon: '\u2302' },
  { key: 'emergency', label: 'Contacts', icon: '\u260E' },
  { key: 'settings', label: 'Settings', icon: '\u2699' },
  { key: 'subscription', label: 'Plan', icon: '$' },
  { key: 'test', label: 'Test', icon: '~' },
];

const MainScreen: React.FC = () => {
  const { logout, user } = useAuth();
  const { subscription, loading: paymentLoading } = usePayment();
  const [activeTab, setActiveTab] = useState<MainTabKey>('dashboard');

  const serviceActive = subscription?.serviceActive ?? user?.serviceActive ?? false;
  const needsSubscription = !paymentLoading && !serviceActive;

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'emergency':
        return <EmergencyContactsTab />;
      case 'settings':
        return <SettingsTab />;
      case 'subscription':
        return <SubscriptionScreen />;
      case 'test':
        return <TestTab />;
      default:
        return <DashboardTab />;
    }
  };

  const activeLabel = PRIMARY_TABS.find(tab => tab.key === activeTab)?.label || 'Home';

  return (
    <View flex={1} backgroundColor={colors.bg.base}>
      <YStack
        marginHorizontal={12}
        marginTop={10}
        marginBottom={10}
        padding={18}
        backgroundColor={colors.primary.deep}
        borderRadius={20}
        overflow="hidden"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          elevation: 3,
        }}
      >
        <XStack alignItems="center" justifyContent="space-between">
          <XStack alignItems="center" gap={8} flex={1}>
            <Text fontSize={18} fontWeight="900" color="#FFFFFF">
              HomeAlone
            </Text>
            <View
              backgroundColor={serviceActive ? 'rgba(95,158,122,0.18)' : 'rgba(233,155,74,0.18)'}
              borderRadius={20}
              paddingHorizontal={10}
              paddingVertical={4}
            >
              <Text
                fontSize={11}
                fontWeight="800"
                color={serviceActive ? colors.accent.success : colors.secondary.base}
                textTransform="uppercase"
              >
                {serviceActive ? 'Protected' : 'Plan needed'}
              </Text>
            </View>
          </XStack>
          <Button
            size="$2"
            chromeless
            backgroundColor="rgba(255,255,255,0.08)"
            borderColor="rgba(255,255,255,0.08)"
            borderWidth={1}
            onPress={logout}
            width={36}
            height={36}
            borderRadius={10}
            paddingHorizontal={0}
          >
            <Text fontSize={15} fontWeight="900" color="rgba(255,255,255,0.7)">
              x
            </Text>
          </Button>
        </XStack>

        <XStack alignItems="center" gap={10} marginTop={14}>
          <View
            width={10}
            height={10}
            borderRadius={5}
            backgroundColor={serviceActive ? colors.accent.success : colors.secondary.base}
          />
          <Text fontSize={13} color="rgba(255,255,255,0.6)" fontWeight="600">
            {serviceActive ? 'All systems operational' : 'Subscription required'}
          </Text>
        </XStack>

        <Text fontSize={activeTab === 'dashboard' ? 26 : 20} lineHeight={activeTab === 'dashboard' ? 32 : 26} fontWeight="900" color="#FFFFFF" marginTop={3}>
          {activeTab === 'dashboard'
            ? `Good to see you, ${user?.name || user?.username || 'there'}`
            : activeLabel}
        </Text>
        <Text fontSize={12} color="rgba(255,255,255,0.48)" marginTop={3}>
          {serviceActive ? 'Your safety monitoring is on.' : 'Subscribe to keep your safety net active.'}
        </Text>
      </YStack>

      {needsSubscription ? (
        <View flex={1}>
          <SubscriptionScreen />
        </View>
      ) : (
        <>
          <View flex={1}>{renderActiveTab()}</View>

          <XStack
            backgroundColor={colors.primary.deep}
            marginHorizontal={12}
            marginBottom={14}
            borderRadius={18}
            paddingBottom={6}
            paddingTop={8}
            paddingHorizontal={8}
            justifyContent="space-around"
            alignItems="center"
          >
            {PRIMARY_TABS.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.75}
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    minWidth: 64,
                  }}
                >
                  <View
                    width={32}
                    height={24}
                    borderRadius={8}
                    backgroundColor="transparent"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text
                      fontSize={tab.icon === '$' ? 19 : 20}
                      fontWeight="800"
                      color={isActive ? colors.secondary.base : 'rgba(255,255,255,0.35)'}
                    >
                      {tab.icon}
                    </Text>
                  </View>
                  <Text
                    fontSize={9}
                    fontWeight={isActive ? '800' : '600'}
                    color={isActive ? colors.secondary.base : 'rgba(255,255,255,0.35)'}
                    marginTop={3}
                    textTransform="uppercase"
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </XStack>
        </>
      )}
    </View>
  );
};

export default MainScreen;
