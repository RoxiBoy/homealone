import React from 'react';
import { View, Text } from 'tamagui';
import { colors } from '../theme/colors';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: '#E8F5EE', text: colors.accent.success },
  warning: { bg: colors.bg.warm, text: colors.secondary.dark },
  danger: { bg: '#F0E4E4', text: colors.accent.danger },
  neutral: { bg: colors.bg.subtle, text: colors.text.secondary },
  info: { bg: colors.primary.light, text: colors.primary.base },
};

type AppStatusBadgeProps = {
  variant: BadgeVariant;
  label: string;
};

export const AppStatusBadge: React.FC<AppStatusBadgeProps> = ({ variant, label }) => (
  <View
    backgroundColor={variantStyles[variant].bg}
    borderRadius={20}
    paddingHorizontal={10}
    paddingVertical={3}
  >
    <Text fontSize={11} fontWeight="800" color={variantStyles[variant].text} textTransform="uppercase">
      {label}
    </Text>
  </View>
);
