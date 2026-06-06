import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { YStack } from 'tamagui';
import { colors } from '../../theme/colors';

type MenuItem = {
  key: string;
  label: string;
  icon: string;
};

const MENU_ITEMS: MenuItem[] = [
  { key: 'dashboard', label: 'Home', icon: '\u2302' },
  { key: 'emergency', label: 'Contacts', icon: '\u260E' },
  { key: 'settings', label: 'Settings', icon: '\u2699' },
  { key: 'subscription', label: 'Plan', icon: '$' },
  { key: 'services', label: 'Services', icon: '\uD83D\uDEE0' },
  { key: 'products', label: 'Products', icon: '\uD83D\uDCE6' },
  { key: 'reminders', label: 'Reminders', icon: '\u23F0' },
  { key: 'test', label: 'Test', icon: '~' },
];

type HamburgerMenuProps = {
  visible: boolean;
  onClose: () => void;
  onNavigate: (key: string) => void;
};

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ visible, onClose, onNavigate }) => {
  const slideAnim = useRef(new Animated.Value(-280)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -280,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleNavigate = (key: string) => {
    onNavigate(key);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: colors.overlay,
            opacity: fadeAnim,
          }}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: 280,
                backgroundColor: colors.bg.card,
                transform: [{ translateX: slideAnim }],
                paddingTop: 60,
                paddingHorizontal: 20,
                shadowColor: '#000',
                shadowOffset: { width: 4, height: 0 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '900',
                  color: colors.primary.deep,
                  marginBottom: 24,
                  marginLeft: 4,
                }}
              >
                HomeAlone
              </Text>

              <YStack space={4}>
                {MENU_ITEMS.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => handleNavigate(item.key)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ fontSize: 20, marginRight: 14 }}>
                      {item.icon}
                    </Text>
                    <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text.primary }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </YStack>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default HamburgerMenu;
