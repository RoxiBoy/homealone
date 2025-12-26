import React, {useState, useEffect} from 'react';
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
import {API_URL} from '../../config/constants';

const EmergencyContactScreen = ({navigation}) => {
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState({
    name: '',
    phone: '',
    relationship: '',
    address: '',
    notes: '',
  });

  const fetchEmergencyContact = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/friends`);
      if (response.data) {
        setContact(response.data);
      }
    } catch (error) {
      console.log('Error fetching emergency contact:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencyContact();
  }, []);

  const handleSave = async () => {
    if (!contact.name || !contact.phone) {
      Alert.alert('Error', 'Name and phone number are required');
      return;
    }

    setLoading(true);
    try {
      if (contact._id) {
        await axios.put(`${API_URL}/emergency-contact/${contact._id}`, contact);
      } else {
        await axios.post(`${API_URL}/emergency-contact`, contact);
      }

      Alert.alert('Success', 'Emergency contact saved successfully', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error) {
      console.log('Error saving emergency contact:', error);
      Alert.alert(
        'Error',
        'Failed to save emergency contact. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>
        {contact._id ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
      </Text>
      <Text style={styles.headerSubtitle}>
        This contact will be used in case of emergency
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#4a90e2" style={styles.loader} />
      ) : (
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter name"
              value={contact.name}
              onChangeText={text => setContact({...contact, name: text})}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              value={contact.phone}
              onChangeText={text => setContact({...contact, phone: text})}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Relationship</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., Family, Friend, Neighbor"
              value={contact.relationship}
              onChangeText={text =>
                setContact({...contact, relationship: text})
              }
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter address"
              value={contact.address}
              onChangeText={text => setContact({...contact, address: text})}
              multiline
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any additional information"
              value={contact.notes}
              onChangeText={text => setContact({...contact, notes: text})}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  loader: {
    marginTop: 50,
  },
});

export default EmergencyContactScreen;
