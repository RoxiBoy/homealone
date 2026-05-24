import React, { useState, useCallback } from 'react';
import { LayoutAnimation, Platform, UIManager, TouchableOpacity } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { colors } from '../theme/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AppCollapsibleSectionProps = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export const AppCollapsibleSection: React.FC<AppCollapsibleSectionProps> = ({
  title,
  subtitle,
  defaultOpen = false,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(prev => !prev);
  }, []);

  return (
    <YStack>
      <TouchableOpacity onPress={toggle} activeOpacity={0.7}>
        <XStack alignItems="center" space={10} paddingVertical={8}>
          <Text fontSize={18} color={colors.text.tertiary} fontWeight="600">
            {open ? '\u25BC' : '\u25B6'}
          </Text>
          <YStack flex={1}>
            <Text fontSize={20} fontWeight="700" color={colors.text.primary}>
              {title}
            </Text>
            {subtitle && (
              <Text fontSize={13} color={colors.text.secondary} marginTop={2}>
                {subtitle}
              </Text>
            )}
          </YStack>
        </XStack>
      </TouchableOpacity>
      {open && children}
    </YStack>
  );
};
