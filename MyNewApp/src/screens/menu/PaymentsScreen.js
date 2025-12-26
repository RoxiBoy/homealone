import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PaymentsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payments</Text>
      <Text style={styles.comingSoon}>Coming Soon</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  comingSoon: {
    fontSize: 18,
    color: '#666',
  },
});

export default PaymentsScreen;