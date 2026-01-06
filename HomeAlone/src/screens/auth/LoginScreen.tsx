import React, { useState } from 'react';
import { View, Text, Input, Button, YStack } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';

export type LoginScreenProps = {
  onSwitchToRegister: () => void;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ onSwitchToRegister }) => {
  const { login, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!username.trim() || !password) {
      setError('Please enter username and password');
      return;
    }

    try {
      await login(username.trim(), password);
    } catch (e: any) {
      setError(e?.message || 'Failed to log in');
    }
  };

  return (
    <View flex={1} padding="$4" justifyContent="center" backgroundColor="$background">
      <YStack space="$4">
        <Text fontSize="$8" fontWeight="700">
          HomeAlone
        </Text>
        <Text fontSize="$5">Log in</Text>

        {error ? (
          <Text color="red">{error}</Text>
        ) : null}

        <Input
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button onPress={handleLogin} disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </Button>

        <Button variant="outlined" onPress={onSwitchToRegister}>
          Create an account
        </Button>
      </YStack>
    </View>
  );
};

export default LoginScreen;
