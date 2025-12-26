import React, {useEffect, useState, useCallback, useContext} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import call from 'react-native-phone-call';
import {API_URL} from '../config/constants';
import {ActivityContext} from '../contexts/ActivityContext';

const CheckInScreen = ({navigation, route}) => {
  const {emergencyContacts} = useContext(ActivityContext);

  const {countdownTime} = useContext(ActivityContext);
  const [timeLeft, setTimeLeft] = useState(countdownTime * 60);

  // countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleEmergency();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleCheckIn = useCallback(async () => {
    try {
      const now = new Date().getTime().toString();
      await AsyncStorage.setItem('lastCheckIn', now);

      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        await axios.post(`${API_URL}/users/check-in-status`, {
          status: 'ok',
          lastCheckIn: new Date(parseInt(now)).toISOString(),
        });
      }

      console.log('[CheckInScreen] Check-in clicked');
      navigation.navigate('Main'); // ✅ go back to Home stack
    } catch (e) {
      console.error('Check-in error:', e);
    }
  }, [navigation]);

  const handleEmergency = useCallback(async () => {
    try {
      // Update check-in status on the server
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        await axios.post(`${API_URL}/users/check-in-status`, {
          status: 'emergency',
          lastCheckIn: new Date().toISOString(),
        });
      }

      // Fetch first emergency contact
      if (emergencyContacts && emergencyContacts.length > 0) {
        const contact = emergencyContacts[0];
        const number =
          contact.phone || contact.mobile || contact.number || null;

        if (number) {
          // Ensure it's a string and remove invalid characters
          const sanitizedNumber = String(number).replace(/[^\d+]/g, '');
          console.log(sanitizedNumber);

          if (sanitizedNumber.length > 0) {
            console.log(
              '[CheckInScreen] Dialing emergency contact:',
              sanitizedNumber,
            );

            try {
              Linking.openURL(`tel:${sanitizedNumber}`);
            } catch (err) {
              console.error('[CheckInScreen] Call error:', err);
              Alert.alert(
                'Error',
                'Failed to initiate call. Please check the number.',
              );
            }
          } else {
            Alert.alert('No valid phone number for emergency contact');
          }
        } else {
          Alert.alert('No valid phone number for emergency contact');
        }
      } else {
        Alert.alert('No emergency contacts available');
      }

      console.log('[CheckInScreen] Emergency triggered');
      navigation.navigate('Main'); // Return to Home after
    } catch (e) {
      console.error('Emergency error:', e);
    }
  }, [navigation, emergencyContacts]);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check-In Required</Text>
      <Text style={styles.subtitle}>
        Please confirm you’re safe within {minutes}:
        {seconds < 10 ? `0${seconds}` : seconds}
      </Text>

      <TouchableOpacity
        style={[styles.button, styles.safe]}
        onPress={handleCheckIn}>
        <Text style={styles.btnText}>I’m OK ✅</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.help]}
        onPress={handleEmergency}>
        <Text style={styles.btnText}>Need Help 🚨</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CheckInScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {fontSize: 24, fontWeight: 'bold', marginBottom: 10},
  subtitle: {fontSize: 16, marginBottom: 30},
  button: {
    padding: 20,
    borderRadius: 12,
    marginVertical: 10,
    width: '70%',
    alignItems: 'center',
  },
  safe: {backgroundColor: '#4CAF50'},
  help: {backgroundColor: '#E53935'},
  btnText: {fontSize: 18, color: '#fff', fontWeight: '600'},
});
