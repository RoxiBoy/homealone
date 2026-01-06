import React from 'react';
import { View, Text, Button, YStack, XStack } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';

const MainScreen: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <View flex={1} justifyContent="center" alignItems="center" padding="$4" backgroundColor="$background">
      <YStack space="$4" alignItems="center">
        <View>
            <XStack flex={1} justifyContent="center" alignItems="center">
                <Text>HomeAlone</Text>
                <Button>Settings</Button>
            </XStack>
        </View>
        <Text fontSize="$7" fontWeight="700">
          Welcome
        </Text>
        <Text fontSize="$5">
          {user?.name || user?.username}
        </Text>
        <Button onPress={logout}>Log out</Button>
      </YStack>
    </View>
  );
};

export default MainScreen;
