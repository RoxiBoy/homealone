import React from 'react';
import { View, Text } from 'tamagui';
import { colors } from '../theme/colors';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: '#E6F0E6', text: colors.accent.success },
  warning: { bg: '#F5EDE0', text: colors.accent.warning },
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
    paddingVertical={4}
  >
    <Text fontSize={13} fontWeight="600" color={variantStyles[variant].text}>
      {label}
    </Text>
  </View>
);
