import React from 'react';
import { YStack, Text } from 'tamagui';

type ComingSoonScreenProps = {
  title: string;
  subtitle?: string;
};

const ComingSoonScreen: React.FC<ComingSoonScreenProps> = ({ title, subtitle }) => {
  return (
    <YStack flex={1} padding="$4" space="$3" justifyContent="center" alignItems="center">
      <Text fontSize="$8" fontWeight="700" textAlign="center">
        {title}
      </Text>
      <Text fontSize="$4" color="$color11" textAlign="center">
        {subtitle || 'Coming soon.'}
      </Text>
    </YStack>
  );
};

export default ComingSoonScreen;
