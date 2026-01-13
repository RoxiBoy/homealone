import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, Animated, Easing, TouchableOpacity } from 'react-native';
import { View, Text, Button, YStack, XStack } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';
import SettingsTab from '../settings/SettingsTab';
import EmergencyContactsTab from '../settings/EmergencyContactsTab';

type MainTabKey = 'home' | 'settings' | 'emergency';

const MainScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<MainTabKey>('home');
  const [menuOpen, setMenuOpen] = useState(false);

  const drawerWidth = useMemo(
    () => Dimensions.get('window').width * 0.7,
    [],
  );
  const slideAnim = useRef(new Animated.Value(0)).current; // 0 = closed, 1 = open

  const toggleMenu = () => {
    const nextOpen = !menuOpen;
    setMenuOpen(nextOpen);
    Animated.timing(slideAnim, {
      toValue: nextOpen ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'settings':
        return <SettingsTab />;
      case 'emergency':
        return <EmergencyContactsTab />;
      case 'home':
      default:
        return (
          <YStack flex={1} padding="$4" space="$3" justifyContent="center" alignItems="center">
            <Text fontSize="$7" fontWeight="700">
              Welcome, {user?.name || user?.username}
            </Text>
            <Text fontSize="$4" color="$color11" textAlign="center">
              This is your Home screen. Additional HomeAlone features can be added here later.
            </Text>
          </YStack>
        );
    }
  };

  const drawerTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  const renderHamburger = () => (
    <XStack>
      <YStack space={2}>
        <View height={2} width={16} backgroundColor="$color12" borderRadius={9999} />
        <View height={2} width={16} backgroundColor="$color12" borderRadius={9999} />
        <View height={2} width={16} backgroundColor="$color12" borderRadius={9999} />
      </YStack>
    </XStack>
  );

  const handleSelectTab = (key: MainTabKey) => {
    setActiveTab(key);
    toggleMenu();
  };

  return (
    <View flex={1} backgroundColor="$background">
      {/* Top navigation bar */}
      <YStack paddingTop="$4" paddingHorizontal="$4" paddingBottom="$2" backgroundColor="$backgroundStrong">
        <XStack alignItems="center" justifyContent="space-between">
          <TouchableOpacity onPress={toggleMenu}>
            {renderHamburger()}
          </TouchableOpacity>

          <Text fontSize="$7" fontWeight="700">
            HomeAlone
          </Text>

          <Button size="$3" variant="outlined" onPress={logout}>
            Log out
          </Button>
        </XStack>
      </YStack>

      {/* Active tab content */}
      <View flex={1}>{renderActiveTab()}</View>

      {/* Slide-in side menu */}
      <Animated.View
        pointerEvents={menuOpen ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        {/* Semi-transparent overlay to close menu */}
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => menuOpen && toggleMenu()}
        >
          <View style={{ flex: 1 }} />
        </TouchableOpacity>

        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: drawerWidth,
            transform: [{ translateX: drawerTranslateX }],
          }}
        >
          <YStack
            flex={1}
            padding="$4"
            space="$3"
            backgroundColor="#000"
            borderRightWidth={1}
            borderColor="$borderColor"
          >
            <Text fontSize="$6" fontWeight="700" marginBottom="$2">
              Menu
            </Text>

            <Button
              size="$4"
              variant={activeTab === 'home' ? 'solid' : 'outlined'}
              onPress={() => handleSelectTab('home')}
            >
              Home
            </Button>

            <Button
              size="$4"
              variant={activeTab === 'settings' ? 'solid' : 'outlined'}
              onPress={() => handleSelectTab('settings')}
            >
              Settings
            </Button>

            <Button
              size="$4"
              variant={activeTab === 'emergency' ? 'solid' : 'outlined'}
              onPress={() => handleSelectTab('emergency')}
            >
              Emergency contacts
            </Button>
          </YStack>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default MainScreen;
