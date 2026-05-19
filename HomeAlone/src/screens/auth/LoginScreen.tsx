import React, { useState } from 'react';
import { View, Text, Input, Button, YStack } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme/colors';

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
    <View flex={1} padding={24} justifyContent="center" backgroundColor={colors.bg.base}>
      <YStack space={18}>
        <YStack space={4} alignItems="center" marginBottom={8}>
          <Text fontSize={38} fontWeight="900" color={colors.primary.dark}>
            HomeAlone
          </Text>
          <Text fontSize={18} color={colors.text.secondary}>
            A gentle safety check-in app
          </Text>
        </YStack>

        <Text fontSize={24} fontWeight="900" color={colors.text.primary}>
          Log in to continue
        </Text>

        {error ? (
          <View backgroundColor="#F5EDE0" borderRadius={10} padding={12} borderWidth={1} borderColor="#E8DCC8">
            <Text fontSize={16} color={colors.accent.warning}>
              {error}
            </Text>
          </View>
        ) : null}

        <Input
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          color={colors.text.primary}
          placeholderTextColor={colors.text.tertiary}
          height={58}
          borderRadius={12}
          fontSize={19}
          borderWidth={1}
          borderColor={colors.border}
          paddingHorizontal={16}
          backgroundColor={colors.bg.card}
        />

        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="current-password"
          color={colors.text.primary}
          placeholderTextColor={colors.text.tertiary}
          height={58}
          borderRadius={12}
          fontSize={19}
          borderWidth={1}
          borderColor={colors.border}
          paddingHorizontal={16}
          backgroundColor={colors.bg.card}
        />

        <Button
          height={58}
          borderRadius={14}
          backgroundColor={colors.primary.base}
          borderWidth={0}
          onPress={handleLogin}
          disabled={loading}
          opacity={loading ? 0.6 : 1}
        >
          <Text fontSize={19} fontWeight="900" color="#FFFFFF">
            {loading ? 'Logging in\u2026' : 'Log in'}
          </Text>
        </Button>

        <Button
          height={56}
          borderRadius={14}
          backgroundColor="transparent"
          borderWidth={1}
          borderColor={colors.border}
          onPress={onSwitchToRegister}
        >
          <Text fontSize={17} fontWeight="800" color={colors.text.primary}>
            Create an account
          </Text>
        </Button>
      </YStack>
    </View>
  );
};

export default LoginScreen;
