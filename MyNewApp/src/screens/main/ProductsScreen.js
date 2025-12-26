// import React from 'react';
// import { View, Text, StyleSheet } from 'react-native';
//
// const ProductsScreen = () => {
//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Products</Text>
//       <Text style={styles.comingSoon}>Coming Soon</Text>
//     </View>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 20,
//   },
//   comingSoon: {
//     fontSize: 18,
//     color: '#666',
//   },
// });
//
// export default ProductsScreen;

import React, {useEffect, useState, useCallback} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import call from 'react-native-phone-call';
import {API_URL} from '../../config/constants';

const ProductsScreen = ({navigation, route}) => {
  const countdownTime = route?.params?.countdownTime || 2; // minutes
  const [timeLeft, setTimeLeft] = useState(countdownTime * 60);
  console.log('[CheckInScreen] Mounted, countdown:', countdownTime);
  
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
      navigation.goBack();
    } catch (e) {
      console.error('Check-in error:', e);
    }
  }, [navigation]);

  const handleEmergency = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        await axios.post(`${API_URL}/users/check-in-status`, {
          status: 'emergency',
          lastCheckIn: new Date().toISOString(),
        });
      }

      const emergencyNumber = await AsyncStorage.getItem('emergencyContact');
      if (emergencyNumber) {
        call({number: emergencyNumber, prompt: true}).catch(console.error);
      }

      console.log('[CheckInScreen] Emergency triggered');
      navigation.goBack();
    } catch (e) {
      console.error('Emergency error:', e);
    }
  }, [navigation]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check-In Required</Text>
      <Text style={styles.subtitle}>
        Please confirm you’re safe within {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
      </Text>

      <TouchableOpacity style={[styles.button, styles.safe]} onPress={handleCheckIn}>
        <Text style={styles.btnText}>I’m OK ✅</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.help]} onPress={handleEmergency}>
        <Text style={styles.btnText}>Need Help 🚨</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProductsScreen;

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff'},
  title: {fontSize: 24, fontWeight: 'bold', marginBottom: 10},
  subtitle: {fontSize: 16, marginBottom: 30},
  button: {padding: 20, borderRadius: 12, marginVertical: 10, width: '70%', alignItems: 'center'},
  safe: {backgroundColor: '#4CAF50'},
  help: {backgroundColor: '#E53935'},
  btnText: {fontSize: 18, color: '#fff', fontWeight: '600'},
});

