import React from 'react';
import { Button, ButtonProps, Text } from 'tamagui';
import { colors } from '../theme/colors';

type AppButtonProps = ButtonProps & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'lg' | 'md';
};

export const AppButton: React.FC<AppButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  ...props
}) => {
  const height = size === 'lg' ? 56 : 48;
  const fontSizeVal = size === 'lg' ? 19 : 17;

  const getStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? colors.primary.light : colors.primary.base,
          borderWidth: 0,
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
    }
  };

  const style = getStyle();

  return (
    <Button
      height={height}
      borderRadius={14}
      disabled={disabled}
      opacity={disabled ? 0.5 : 1}
      {...style}
      {...props}
    >
      <Text
        fontSize={fontSizeVal}
        fontWeight="800"
        color={
          variant === 'primary'
            ? '#FFFFFF'
            : variant === 'secondary'
              ? colors.text.primary
              : colors.primary.base
        }
      >
        {children}
      </Text>
    </Button>
  );
};
