import React from 'react';
import { View, ViewProps } from 'tamagui';
import { colors } from '../theme/colors';

type AppCardProps = ViewProps & {
  accent?: 'none' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
};

const accentColors = {
  none: colors.border,
  primary: '#D8EAF4',
  success: '#D6EBDD',
  warning: '#F5DDB9',
  danger: '#EBCFCB',
  info: '#F6D8B8',
};

export const AppCard: React.FC<AppCardProps> = ({
  accent = 'none',
  children,
  style,
  ...props
}) => (
  <View
    backgroundColor={colors.bg.card}
    borderRadius={16}
    borderWidth={1}
    borderColor={accentColors[accent]}
    padding={16}
    style={[
      {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
      },
      style,
    ]}
    {...props}
  >
    {children}
  </View>
);
