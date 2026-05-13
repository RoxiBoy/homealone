import React, { useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { View, Text } from 'tamagui';
import { colors } from '../theme/colors';

type AppToggleProps = {
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
  label?: string;
};

export const AppToggle: React.FC<AppToggleProps> = ({ checked, onCheckedChange, label }) => {
  const anim = useRef(new Animated.Value(checked ? 1 : 0)).current;

  const toggle = () => {
    const next = !checked;
    Animated.timing(anim, {
      toValue: next ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onCheckedChange(next);
  };

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary.base],
  });

  const thumbTranslate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 22],
  });

  return (
    <TouchableOpacity onPress={toggle} activeOpacity={0.8}>
      <View flexDirection="row" alignItems="center" gap={10}>
        <Animated.View
          style={{
            width: 48,
            height: 28,
            borderRadius: 14,
            backgroundColor: trackColor,
            justifyContent: 'center',
            paddingHorizontal: 3,
          }}
        >
          <Animated.View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: '#FFFFFF',
              transform: [{ translateX: thumbTranslate }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15,
              shadowRadius: 2,
              elevation: 2,
            }}
          />
        </Animated.View>
        {label && (
          <Text fontSize={15} color={colors.text.secondary}>
            {label}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};
