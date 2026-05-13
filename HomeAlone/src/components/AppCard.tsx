import React from 'react';
import { View, ViewProps } from 'tamagui';
import { colors } from '../theme/colors';

type AppCardProps = ViewProps & {
  accent?: 'none' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
};

const accentColors = {
  none: 'transparent',
  primary: colors.primary.base,
  success: colors.accent.success,
  warning: colors.accent.warning,
  danger: colors.accent.danger,
  info: '#8A9BB0',
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
    borderColor={colors.border}
    padding={16}
    style={[
      {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        borderLeftWidth: accent !== 'none' ? 3 : 1,
        borderLeftColor: accent !== 'none' ? accentColors[accent] : colors.border,
      },
      style,
    ]}
    {...props}
  >
    {children}
  </View>
);
