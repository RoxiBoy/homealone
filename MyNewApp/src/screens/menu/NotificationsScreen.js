import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotificationsScreen = () => {
  const [settings, setSettings] = useState({
    checkInAlerts: true,
    emergencyAlerts: true,
    medicationReminders: true,
    appointmentReminders: true,
    tipsAndUpdates: true,
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('notificationSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.log('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.log('Error saving notification settings:', error);
    }
  };

  const toggleSetting = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Notifications',
      'Are you sure you want to reset all notification settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            const defaultSettings = {
              checkInAlerts: true,
              emergencyAlerts: true,
              medicationReminders: true,
              appointmentReminders: true,
              tipsAndUpdates: true,
            };
            setSettings(defaultSettings);
            saveSettings(defaultSettings);
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Notifications</Text>
      <Text style={styles.headerSubtitle}>
        Manage which notifications you receive from the app
      </Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Alert Notifications</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Check-in Alerts</Text>
            <Text style={styles.settingDescription}>
              Notifications asking if you're okay after periods of inactivity
            </Text>
          </View>
          <Switch
            value={settings.checkInAlerts}
            onValueChange={() => toggleSetting('checkInAlerts')}
            trackColor={{ false: '#d1d1d1', true: '#81b0ff' }}
            thumbColor={settings.checkInAlerts ? '#4a90e2' : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Emergency Alerts</Text>
            <Text style={styles.settingDescription}>
              Critical notifications when emergency contacts are being notified
            </Text>
          </View>
          <Switch
            value={settings.emergencyAlerts}
            onValueChange={() => toggleSetting('emergencyAlerts')}
            trackColor={{ false: '#d1d1d1', true: '#81b0ff' }}
            thumbColor={settings.emergencyAlerts ? '#4a90e2' : '#f4f3f4'}
          />
        </View>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reminder Notifications</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Medication Reminders</Text>
            <Text style={styles.settingDescription}>
              Reminders for taking medications at scheduled times
            </Text>
          </View>
          <Switch
            value={settings.medicationReminders}
            onValueChange={() => toggleSetting('medicationReminders')}
            trackColor={{ false: '#d1d1d1', true: '#81b0ff' }}
            thumbColor={settings.medicationReminders ? '#4a90e2' : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Appointment Reminders</Text>
            <Text style={styles.settingDescription}>
              Reminders for upcoming medical appointments and checkups
            </Text>
          </View>
          <Switch
            value={settings.appointmentReminders}
            onValueChange={() => toggleSetting('appointmentReminders')}
            trackColor={{ false: '#d1d1d1', true: '#81b0ff' }}
            thumbColor={settings.appointmentReminders ? '#4a90e2' : '#f4f3f4'}
          />
        </View>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Other Notifications</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Tips and Updates</Text>
            <Text style={styles.settingDescription}>
              Receive health tips and app update notifications
            </Text>
          </View>
          <Switch
            value={settings.tipsAndUpdates}
            onValueChange={() => toggleSetting('tipsAndUpdates')}
            trackColor={{ false: '#d1d1d1', true: '#81b0ff' }}
            thumbColor={settings.tipsAndUpdates ? '#4a90e2' : '#f4f3f4'}
          />
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.resetButton}
        onPress={resetToDefaults}
      >
        <Text style={styles.resetButtonText}>Reset to Defaults</Text>
      </TouchableOpacity>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Important Note</Text>
        <Text style={styles.infoText}>
          Emergency alerts cannot be completely disabled for your safety. You can use the Do Not Disturb feature to temporarily pause check-in notifications.
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
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    paddingRight: 10,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  resetButton: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resetButtonText: {
    color: '#666',
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
    lineHeight: 20,
  },
});

export default NotificationsScreen;