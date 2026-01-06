import React, { useState } from 'react';
import { View, Text, Input, Button, YStack, ScrollView } from 'tamagui';
import { RegisterPayload, useAuth } from '../../contexts/AuthContext';

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
    <ScrollView flex={1} padding="$4" backgroundColor="$background">
      <YStack space="$4" marginTop="$6">
        <Text fontSize="$8" fontWeight="700">
          HomeAlone
        </Text>
        <Text fontSize="$5">Create account</Text>

        {error ? (
          <Text color="red">{error}</Text>
        ) : null}

        <Input
          placeholder="Username"
          value={form.username}
          onChangeText={(text) => updateField('username', text)}
          autoCapitalize="none"
        />

        <Input
          placeholder="Password"
          value={form.password}
          onChangeText={(text) => updateField('password', text)}
          secureTextEntry
        />

        <Input
          placeholder="Full name"
          value={form.name}
          onChangeText={(text) => updateField('name', text)}
        />

        <Input
          placeholder="Email"
          value={form.email}
          onChangeText={(text) => updateField('email', text)}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Input
          placeholder="Phone"
          value={form.phone}
          onChangeText={(text) => updateField('phone', text)}
          keyboardType="phone-pad"
        />

        <Input
          placeholder="Age"
          value={form.age ? String(form.age) : ''}
          onChangeText={(text) => {
            const numeric = Number(text.replace(/[^0-9]/g, ''));
            updateField('age', Number.isNaN(numeric) ? 0 : numeric);
          }}
          keyboardType="number-pad"
        />

        <Button onPress={handleRegister} disabled={loading}>
          {loading ? 'Creating account…' : 'Sign up'}
        </Button>

        <Button variant="outlined" onPress={onSwitchToLogin}>
          Back to login
        </Button>
      </YStack>
    </ScrollView>
  );
};

export default RegisterScreen;
