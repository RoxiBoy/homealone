import React, { useState } from 'react';
import { Modal, TouchableOpacity } from 'react-native';
import { View, Text, Button, YStack, XStack } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme/colors';
import DashboardTab from '../dashboard/DashboardTab';
import TipsTab from '../tips/TipsTab';
import ProductsTab from '../products/ProductsTab';
import ServicesTab from '../services/ServicesTab';
import RemindersTab from '../reminders/RemindersTab';
import SettingsTab from '../settings/SettingsTab';
import EmergencyContactsTab from '../settings/EmergencyContactsTab';
import SubscriptionScreen from '../subscription/SubscriptionScreen';
import TestTab from '../test/TestTab';

type MainTabKey =
  | 'dashboard'
  | 'tips'
  | 'products'
  | 'services'
  | 'reminders'
  | 'settings'
  | 'subscription'
  | 'emergency'
  | 'test';

const PRIMARY_TABS: { key: MainTabKey; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '\u2302' },
  { key: 'tips', label: 'Tips', icon: '\u2605' },
  { key: 'settings', label: 'Settings', icon: '\u2699' },
  { key: 'emergency', label: 'Emergency', icon: '\uD83D\uDEE1' },
  { key: 'test', label: 'Test', icon: '\uD83C\uDFAF' },
];

const SECONDARY_TABS: { key: MainTabKey; label: string; icon: string }[] = [
  { key: 'products', label: 'Products', icon: '\uD83D\uDCC5' },
  { key: 'services', label: 'Services', icon: '\u2764' },
  { key: 'reminders', label: 'Reminders', icon: '\u23F0' },
  { key: 'subscription', label: 'Subscription', icon: '\uD83D\uDEE1' },
];

const MainScreen: React.FC = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<MainTabKey>('dashboard');
  const [showMore, setShowMore] = useState(false);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'tips':
        return <TipsTab />;
      case 'products':
        return <ProductsTab />;
      case 'services':
        return <ServicesTab />;
      case 'reminders':
        return <RemindersTab />;
      case 'settings':
        return <SettingsTab />;
      case 'subscription':
        return <SubscriptionScreen />;
      case 'emergency':
        return <EmergencyContactsTab />;
      case 'test':
        return <TestTab />;
      default:
        return <DashboardTab />;
    }
  };

  const handleSelectTab = (key: MainTabKey) => {
    setActiveTab(key);
    setShowMore(false);
  };

  return (
    <View flex={1} backgroundColor={colors.bg.base}>
      {/* Minimal header */}
      <YStack
        paddingTop={8}
        paddingHorizontal={16}
        paddingBottom={8}
        backgroundColor={colors.bg.card}
        borderBottomWidth={1}
        borderBottomColor={colors.divider}
      >
        <XStack alignItems="center" justifyContent="space-between">
          <Text fontSize={20} fontWeight="700" color={colors.primary.base}>
            HomeAlone
          </Text>
          <Button
            size="$2"
            variant="outlined"
            borderColor={colors.border}
            onPress={logout}
            height={36}
            borderRadius={10}
          >
            <Text fontSize={13} fontWeight="600" color={colors.text.secondary}>
              Log out
            </Text>
          </Button>
        </XStack>
      </YStack>

      {/* Active tab content */}
      <View flex={1}>{renderActiveTab()}</View>

      {/* Bottom tab bar */}
      <XStack
        backgroundColor={colors.bg.card}
        borderTopWidth={1}
        borderTopColor={colors.divider}
        paddingBottom={8}
        paddingTop={6}
        paddingHorizontal={4}
        justifyContent="space-around"
        alignItems="center"
      >
        {PRIMARY_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleSelectTab(tab.key)}
              activeOpacity={0.7}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 8,
                paddingVertical: 4,
                minWidth: 60,
              }}
            >
              <Text
                fontSize={isActive ? 20 : 18}
                color={isActive ? colors.primary.base : colors.text.tertiary}
              >
                {tab.icon}
              </Text>
              <Text
                fontSize={11}
                fontWeight={isActive ? '700' : '400'}
                color={isActive ? colors.primary.base : colors.text.tertiary}
                marginTop={2}
              >
                {tab.label}
              </Text>
              {isActive && (
                <View
                  position="absolute"
                  top={-6}
                  width={20}
                  height={3}
                  backgroundColor={colors.primary.base}
                  borderRadius={2}
                />
              )}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={() => setShowMore(true)}
          activeOpacity={0.7}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 8,
            paddingVertical: 4,
            minWidth: 60,
          }}
        >
          <Text
            fontSize={18}
            color={showMore ? colors.primary.base : colors.text.tertiary}
          >
            {'\u2022\u2022\u2022'}
          </Text>
          <Text
            fontSize={11}
            fontWeight={showMore ? '700' : '400'}
            color={showMore ? colors.primary.base : colors.text.tertiary}
            marginTop={2}
          >
            More
          </Text>
        </TouchableOpacity>
      </XStack>

      {/* More modal */}
      <Modal
        visible={showMore}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMore(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setShowMore(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View
              backgroundColor={colors.bg.card}
              borderRadius={20}
              padding={20}
              width="80%"
              maxWidth={320}
            >
              <Text fontSize={19} fontWeight="700" color={colors.text.primary} textAlign="center" marginBottom={16}>
                More
              </Text>
              <YStack space={8}>
                {SECONDARY_TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => handleSelectTab(tab.key)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      backgroundColor: activeTab === tab.key ? colors.primary.light : 'transparent',
                      borderRadius: 12,
                    }}
                  >
                    <Text fontSize={18} marginRight={12}>
                      {tab.icon}
                    </Text>
                    <Text fontSize={17} fontWeight="500" color={colors.text.primary}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </YStack>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default MainScreen;
