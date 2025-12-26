import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { API_URL } from '../../config/constants';

const AddReminderScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [reminderType, setReminderType] = useState('Medicine');
  const [reminder, setReminder] = useState({
    title: '',
    type: 'Medicine',
    dosage: '',
    frequency: '',
    time: '',
    date: '',
    address: '',
    notes: '',
  });

  const validateForm = () => {
    if (!reminder.title) {
      Alert.alert('Error', 'Title is required');
      return false;
    }
    
    if (reminderType === 'Medicine') {
      if (!reminder.dosage || !reminder.frequency || !reminder.time) {
        Alert.alert('Error', 'Dosage, frequency, and time are required for medicine reminders');
        return false;
      }
    } else if (reminderType === 'Checkup') {
      if (!reminder.date || !reminder.time) {
        Alert.alert('Error', 'Date and time are required for checkup reminders');
        return false;
      }
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/reminders`, {
        ...reminder,
        type: reminderType,
      });
      
      Alert.alert(
        'Success',
        'Reminder added successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.log('Error adding reminder:', error);
      Alert.alert('Error', 'Failed to add reminder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Add New Reminder</Text>
      <Text style={styles.headerSubtitle}>
        Create a reminder for medication or checkups
      </Text>
      
      <View style={styles.formContainer}>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              reminderType === 'Medicine' && styles.selectedTypeButton,
            ]}
            onPress={() => {
              setReminderType('Medicine');
              setReminder({...reminder, type: 'Medicine'});
            }}
          >
            <Text
              style={[
                styles.typeButtonText,
                reminderType === 'Medicine' && styles.selectedTypeButtonText,
              ]}
            >
              Medicine
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.typeButton,
              reminderType === 'Checkup' && styles.selectedTypeButton,
            ]}
            onPress={() => {
              setReminderType('Checkup');
              setReminder({...reminder, type: 'Checkup'});
            }}
          >
            <Text
              style={[
                styles.typeButtonText,
                reminderType === 'Checkup' && styles.selectedTypeButtonText,
              ]}
            >
              Checkup
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder={`Enter ${reminderType.toLowerCase()} name`}
            value={reminder.title}
            onChangeText={(text) => setReminder({...reminder, title: text})}
          />
        </View>
        
        {reminderType === 'Medicine' && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Dosage *</Text>
              <TextInput
                style={styles.input}
                placeholder="E.g., 1 pill, 5ml"
                value={reminder.dosage}
                onChangeText={(text) => setReminder({...reminder, dosage: text})}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Frequency *</Text>
              <TextInput
                style={styles.input}
                placeholder="E.g., Once daily, Every 8 hours"
                value={reminder.frequency}
                onChangeText={(text) => setReminder({...reminder, frequency: text})}
              />
            </View>
          </>
        )}
        
        {reminderType === 'Checkup' && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="MM/DD/YYYY"
                value={reminder.date}
                onChangeText={(text) => setReminder({...reminder, date: text})}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter location address"
                value={reminder.address}
                onChangeText={(text) => setReminder({...reminder, address: text})}
                multiline
              />
            </View>
          </>
        )}
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Time *</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g., 8:00 AM, 9:30 PM"
            value={reminder.time}
            onChangeText={(text) => setReminder({...reminder, time: text})}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any additional information"
            value={reminder.notes}
            onChangeText={(text) => setReminder({...reminder, notes: text})}
            multiline
            numberOfLines={4}
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
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
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedTypeButton: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  typeButtonText: {
    fontWeight: 'bold',
    color: '#666',
  },
  selectedTypeButtonText: {
    color: 'white',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4a90e2',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default AddReminderScreen;