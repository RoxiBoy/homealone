import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Text, Input, Button, View, YStack } from 'tamagui';
import { RegisterPayload, useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme/colors';

export type RegisterScreenProps = {
  onSwitchToLogin: () => void;
};

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onSwitchToLogin }) => {
  const { register, loading } = useAuth();
  const [form, setForm] = useState<RegisterPayload>({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    age: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof RegisterPayload>(key: K, value: RegisterPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleRegister = async () => {
    setError(null);
    if (!form.username.trim() || !form.password || !form.name.trim() || !form.email.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await register({
        ...form,
        username: form.username.trim(),
        email: form.email.trim(),
        name: form.name.trim(),
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to register');
    }
  };

  return (
    <ScrollView flex={1} backgroundColor={colors.bg.base}>
      <YStack space={16} padding={24} marginTop={24}>
        <YStack space={4} alignItems="center" marginBottom={8}>
          <Text fontSize={32} fontWeight="700" color={colors.primary.base}>
            HomeAlone
          </Text>
          <Text fontSize={15} color={colors.text.secondary}>
            Your safety companion
          </Text>
        </YStack>

        <Text fontSize={19} fontWeight="600" color={colors.text.primary}>
          Create account
        </Text>

        {error ? (
          <View
            backgroundColor="#F5EDE0"
            borderRadius={10}
            padding={12}
            borderWidth={1}
            borderColor="#E8DCC8"
          >
            <Text fontSize={13} color={colors.accent.warning}>
              {error}
            </Text>
          </View>
        ) : null}

        <Input
          placeholder="Username"
          value={form.username}
          onChangeText={(text) => updateField('username', text)}
          autoCapitalize="none"
          height={52}
          borderRadius={12}
          fontSize={17}
          borderWidth={1}
          borderColor={colors.border}
          paddingHorizontal={16}
          backgroundColor={colors.bg.card}
        />

        <Input
          placeholder="Password"
          value={form.password}
          onChangeText={(text) => updateField('password', text)}
          secureTextEntry
          height={52}
          borderRadius={12}
          fontSize={17}
          borderWidth={1}
          borderColor={colors.border}
          paddingHorizontal={16}
          backgroundColor={colors.bg.card}
        />

        <Input
          placeholder="Full name"
          value={form.name}
          onChangeText={(text) => updateField('name', text)}
          height={52}
          borderRadius={12}
          fontSize={17}
          borderWidth={1}
          borderColor={colors.border}
          paddingHorizontal={16}
          backgroundColor={colors.bg.card}
        />

        <Input
          placeholder="Email"
          value={form.email}
          onChangeText={(text) => updateField('email', text)}
          autoCapitalize="none"
          keyboardType="email-address"
          height={52}
          borderRadius={12}
          fontSize={17}
          borderWidth={1}
          borderColor={colors.border}
          paddingHorizontal={16}
          backgroundColor={colors.bg.card}
        />

        <Input
          placeholder="Phone"
          value={form.phone}
          onChangeText={(text) => updateField('phone', text)}
          keyboardType="phone-pad"
          height={52}
          borderRadius={12}
          fontSize={17}
          borderWidth={1}
          borderColor={colors.border}
          paddingHorizontal={16}
          backgroundColor={colors.bg.card}
        />

        <Input
          placeholder="Age"
          value={form.age ? String(form.age) : ''}
          onChangeText={(text) => {
            const numeric = Number(text.replace(/[^0-9]/g, ''));
            updateField('age', Number.isNaN(numeric) ? 0 : numeric);
          }}
          keyboardType="number-pad"
          height={52}
          borderRadius={12}
          fontSize={17}
          borderWidth={1}
          borderColor={colors.border}
          paddingHorizontal={16}
          backgroundColor={colors.bg.card}
        />

        <Button
          height={52}
          borderRadius={14}
          backgroundColor={colors.primary.base}
          borderWidth={0}
          onPress={handleRegister}
          disabled={loading}
          opacity={loading ? 0.6 : 1}
        >
          <Text fontSize={17} fontWeight="600" color="#FFFFFF">
            {loading ? 'Creating account\u2026' : 'Sign up'}
          </Text>
        </Button>

        <Button
          height={52}
          borderRadius={14}
          backgroundColor="transparent"
          borderWidth={1}
          borderColor={colors.border}
          onPress={onSwitchToLogin}
        >
          <Text fontSize={15} fontWeight="500" color={colors.text.primary}>
            Back to login
          </Text>
        </Button>
      </YStack>
    </ScrollView>
  );
};

export default RegisterScreen;
