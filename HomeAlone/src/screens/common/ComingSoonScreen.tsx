import React from 'react';
import { YStack, Text } from 'tamagui';
import { colors } from '../../theme/colors';
import { AppCard } from '../../components/AppCard';

type ComingSoonScreenProps = {
  title: string;
  subtitle?: string;
  icon?: string;
};

const ComingSoonScreen: React.FC<ComingSoonScreenProps> = ({
  title,
  subtitle,
  icon = '\uD83D\uDE80',
}) => {
  return (
    <YStack flex={1} padding={24} space={16} justifyContent="center" alignItems="center" backgroundColor={colors.bg.base}>
      <AppCard accent="primary" width="100%">
        <YStack space={12} alignItems="center" paddingVertical={12}>
          <Text fontSize={48}>{icon}</Text>
          <Text fontSize={22} fontWeight="700" color={colors.text.primary} textAlign="center">
            {title}
          </Text>
          <Text fontSize={15} color={colors.text.secondary} textAlign="center">
            {subtitle || 'Coming soon.'}
          </Text>
        </YStack>
      </AppCard>
    </YStack>
  );
};

export default ComingSoonScreen;
