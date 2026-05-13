import React from 'react';
import { View, Text } from 'tamagui';
import { colors } from '../theme/colors';

type AppSectionHeaderProps = {
  title: string;
  subtitle?: string;
};

export const AppSectionHeader: React.FC<AppSectionHeaderProps> = ({ title, subtitle }) => (
  <View marginBottom={4}>
    <Text fontSize={22} fontWeight="700" color={colors.text.primary}>
      {title}
    </Text>
    {subtitle && (
      <Text fontSize={15} color={colors.text.secondary} marginTop={4}>
        {subtitle}
      </Text>
    )}
  </View>
);
