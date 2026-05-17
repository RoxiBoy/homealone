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
    referralCode: '',
  });
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof RegisterPayload>(key: K, value: RegisterPayload[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleRegister = async () => {
    setError(null);
    if (
      !form.username.trim() ||
      !form.password ||
      !form.name.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.age ||
      form.age <= 0
    ) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await register({
        ...form,
        username: form.username.trim(),
        email: form.email.trim(),
        name: form.name.trim(),
        referralCode: form.referralCode?.trim() || undefined,
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to register');
    }
  };

  return (
    <ScrollView flex={1} backgroundColor={colors.bg.base}>
      <YStack space={16} padding={24} marginTop={18}>
        <YStack space={4} alignItems="center" marginBottom={8}>
          <Text fontSize={38} fontWeight="900" color={colors.primary.dark}>
            HomeAlone
          </Text>
          <Text fontSize={18} color={colors.text.secondary}>
            A gentle safety check-in app
          </Text>
        </YStack>

        <Text fontSize={24} fontWeight="900" color={colors.text.primary}>
          Create your account
        </Text>

        {error ? (
          <View
            backgroundColor="#F5EDE0"
            borderRadius={10}
            padding={12}
            borderWidth={1}
            borderColor="#E8DCC8"
          >
            <Text fontSize={16} color={colors.accent.warning}>
              {error}
            </Text>
          </View>
        ) : null}

        <Input
          placeholder="Username"
          value={form.username}
          onChangeText={(text) => updateField('username', text)}
          autoCapitalize="none"
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
          value={form.password}
          onChangeText={(text) => updateField('password', text)}
          secureTextEntry
          height={58}
          borderRadius={12}
          fontSize={19}
          borderWidth={1}
          borderColor={colors.border}
          paddingHorizontal={16}
          backgroundColor={colors.bg.card}
        />

        <Input
          placeholder="Full name"
          value={form.name}
          onChangeText={(text) => updateField('name', text)}
          height={58}
          borderRadius={12}
          fontSize={19}
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
          height={58}
          borderRadius={12}
          fontSize={19}
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
          height={58}
          borderRadius={12}
          fontSize={19}
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
          height={58}
          borderRadius={12}
          fontSize={19}
          borderWidth={1}
          borderColor={colors.border}
          paddingHorizontal={16}
          backgroundColor={colors.bg.card}
        />

        <Input
          placeholder="Referral code (optional)"
          value={form.referralCode || ''}
          onChangeText={(text) => updateField('referralCode', text)}
          autoCapitalize="characters"
          autoCorrect={false}
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
          onPress={handleRegister}
          disabled={loading}
          opacity={loading ? 0.6 : 1}
        >
          <Text fontSize={19} fontWeight="900" color="#FFFFFF">
            {loading ? 'Creating account\u2026' : 'Sign up'}
          </Text>
        </Button>

        <Button
          height={56}
          borderRadius={14}
          backgroundColor="transparent"
          borderWidth={1}
          borderColor={colors.border}
          onPress={onSwitchToLogin}
        >
          <Text fontSize={17} fontWeight="800" color={colors.text.primary}>
            Back to login
          </Text>
        </Button>
      </YStack>
    </ScrollView>
  );
};

export default RegisterScreen;
