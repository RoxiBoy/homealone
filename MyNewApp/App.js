import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

// Services & utilities
import {configureBackgroundTask} from './src/services/BackgroundService';
import {navigationRef} from './src/navigation/RootNavigation';

// Context providers
import {AuthProvider} from './src/contexts/AuthContext';
import {ActivityProvider} from './src/contexts/ActivityContext';

// Navigation
import AppNavigator from './src/navigation/AppNavigator';

const App = () => {
  useEffect(() => {
    // Configure background tasks and notification channels
    // as early as possible, before screens mount
    configureBackgroundTask();
    console.log('[App] Background task configured');
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ActivityProvider>
          <NavigationContainer ref={navigationRef}>
            <AppNavigator />
          </NavigationContainer>
        </ActivityProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
