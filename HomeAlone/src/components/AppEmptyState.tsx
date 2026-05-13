import React from 'react';
import { View, Text, Button } from 'tamagui';
import { colors } from '../theme/colors';

type AppEmptyStateProps = {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const AppEmptyState: React.FC<AppEmptyStateProps> = ({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}) => (
  <View flex={1} justifyContent="center" alignItems="center" padding={24}>
    {icon && (
      <Text fontSize={48} marginBottom={12}>
        {icon}
      </Text>
    )}
    <Text fontSize={19} fontWeight="700" color={colors.text.primary} textAlign="center">
      {title}
    </Text>
    {subtitle && (
      <Text fontSize={15} color={colors.text.secondary} textAlign="center" marginTop={8}>
        {subtitle}
      </Text>
    )}
    {actionLabel && onAction && (
      <Button
        marginTop={16}
        backgroundColor={colors.primary.base}
        borderRadius={12}
        height={48}
        paddingHorizontal={20}
        onPress={onAction}
      >
        <Text fontSize={15} fontWeight="600" color="#FFFFFF">
          {actionLabel}
        </Text>
      </Button>
    )}
  </View>
);
