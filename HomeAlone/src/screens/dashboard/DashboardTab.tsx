import React from 'react';
import { Text, YStack } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';

const DashboardTab: React.FC = () => {
  const { user } = useAuth();

  return (
    <YStack flex={1} padding="$4" space="$3" justifyContent="center" alignItems="center">
      <Text fontSize="$7" fontWeight="700">
        Welcome, {user?.name || user?.username}
      </Text>
      <Text fontSize="$4" color="$color11" textAlign="center">
        This is your dashboard. More features can be added here.
      </Text>
    </YStack>
  );
};

export default DashboardTab;
