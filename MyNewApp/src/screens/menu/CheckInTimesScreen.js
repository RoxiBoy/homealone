import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { ActivityContext } from '../../contexts/ActivityContext';

const CheckInTimesScreen = () => {
  const {
    checkInTime,
    countdownTime,
    doNotDisturb,
    updateCheckInTime,
    updateCountdownTime,
    toggleDoNotDisturb,
  } = useContext(ActivityContext);

  const checkInOptions = [1, 2, 4, 6, 8, 12, 24];
  const countdownOptions = [1, 2, 5, 10, 15, 30, 60];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Check-in Settings</Text>
      <Text style={styles.headerSubtitle}>
        Configure how often the app checks on you and how long to wait for a response
      </Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Do Not Disturb</Text>
        <Text style={styles.cardDescription}>
          When enabled, the app will not send check-in notifications
        </Text>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>
            {doNotDisturb ? 'Enabled' : 'Disabled'}
          </Text>
          <Switch
            value={doNotDisturb}
            onValueChange={toggleDoNotDisturb}
            trackColor={{ false: '#d1d1d1', true: '#81b0ff' }}
            thumbColor={doNotDisturb ? '#4a90e2' : '#f4f3f4'}
          />
        </View>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Check-in Time</Text>
        <Text style={styles.cardDescription}>
          How often should the app check if you're okay after your last activity
        </Text>
        <View style={styles.optionsContainer}>
          {checkInOptions.map((hours) => (
            <TouchableOpacity
              key={hours}
              style={[
                styles.optionButton,
                checkInTime === hours && styles.selectedOption,
              ]}
              onPress={() => updateCheckInTime(hours)}
            >
              <Text
                style={[
                  styles.optionText,
                  checkInTime === hours && styles.selectedOptionText,
                ]}
              >
                {hours} {hours === 1 ? 'hour' : 'hours'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Countdown Time</Text>
        <Text style={styles.cardDescription}>
          How long to wait for your response before contacting emergency contacts
        </Text>
        <View style={styles.optionsContainer}>
          {countdownOptions.map((minutes) => (
            <TouchableOpacity
              key={minutes}
              style={[
                styles.optionButton,
                countdownTime === minutes && styles.selectedOption,
              ]}
              onPress={() => updateCountdownTime(minutes)}
            >
              <Text
                style={[
                  styles.optionText,
                  countdownTime === minutes && styles.selectedOptionText,
                ]}
              >
                {minutes} {minutes === 1 ? 'minute' : 'minutes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoText}>
          1. The app monitors your activity (screen unlocks)
        </Text>
        <Text style={styles.infoText}>
          2. If no activity is detected for the set check-in time, you'll receive a notification
        </Text>
        <Text style={styles.infoText}>
          3. If you don't respond within the countdown time, emergency contacts will be notified
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  optionButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    margin: 5,
  },
  selectedOption: {
    backgroundColor: '#4a90e2',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  selectedOptionText: {
    color: 'white',
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#e8f4fd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 5,
    lineHeight: 20,
  },
});

export default CheckInTimesScreen;
