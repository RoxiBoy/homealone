import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';
import { ActivityContext } from '../../contexts/ActivityContext';

const DoNotDisturbScreen = () => {
  const { doNotDisturb, toggleDoNotDisturb } = useContext(ActivityContext);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Do Not Disturb</Text>
      <Text style={styles.headerSubtitle}>
        Control when the app should pause check-in notifications
      </Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Do Not Disturb Mode</Text>
        <Text style={styles.cardDescription}>
          When enabled, the app will not send check-in notifications or alerts
        </Text>
        <View style={styles.switchContainer}>
          <Text style={[
            styles.switchLabel,
            doNotDisturb ? styles.enabledText : styles.disabledText
          ]}>
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
      
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>What happens when Do Not Disturb is enabled?</Text>
        <Text style={styles.infoText}>
          • The app will not send check-in notifications
        </Text>
        <Text style={styles.infoText}>
          • Emergency contacts will not be notified
        </Text>
        <Text style={styles.infoText}>
          • Medication and appointment reminders will still be active
        </Text>
        <Text style={styles.infoText}>
          • Your activity will still be monitored in the background
        </Text>
      </View>
      
      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>Important Note</Text>
        <Text style={styles.warningText}>
          Remember to disable Do Not Disturb mode when you want to resume normal check-in functionality.
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
  enabledText: {
    color: '#4a90e2',
  },
  disabledText: {
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#e8f4fd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
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
  warningCard: {
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#e65100',
  },
  warningText: {
    fontSize: 14,
    color: '#e65100',
    lineHeight: 20,
  },
});

export default DoNotDisturbScreen;
