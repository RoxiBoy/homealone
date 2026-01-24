import React, { useState } from 'react'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { TamaguiProvider } from 'tamagui'
import { View, Text } from 'tamagui'
import { config } from './tamagui.config'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { CheckInProvider } from './src/contexts/CheckInContext'
import LoginScreen from './src/screens/auth/LoginScreen'
import RegisterScreen from './src/screens/auth/RegisterScreen'
import MainScreen from './src/screens/main/MainScreen'

function RootNavigator() {
  const { token, initializing } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')

  if (initializing) {
    return (
      <View flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
        <Text>Loading...</Text>
      </View>
    )
  }

  if (!token) {
    if (mode === 'login') {
      return <LoginScreen onSwitchToRegister={() => setMode('register')} />
    }

    return <RegisterScreen onSwitchToLogin={() => setMode('login')} />
  }

  return <MainScreen />
}

export default function App() {
  return (
    <SafeAreaProvider>
      <TamaguiProvider config={config}>
        <SafeAreaView style={{ flex: 1 }}>
          <AuthProvider>
            <CheckInProvider>
              <RootNavigator />
            </CheckInProvider>
          </AuthProvider>
        </SafeAreaView>
      </TamaguiProvider>
    </SafeAreaProvider>
  )
}
