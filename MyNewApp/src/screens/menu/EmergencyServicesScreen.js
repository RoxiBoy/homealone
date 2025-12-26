import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import axios from 'axios';
import {API_URL} from '../../config/constants';

const EmergencyServicesScreen = ({navigation}) => {
  const [emergencyContact, setEmergencyContact] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchEmergencyContact = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/emergency-contact`);
      setEmergencyContact(response.data);
    } catch (error) {
      console.log('Error fetching emergency contact:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencyContact();
  }, []);

  const handleCall = number => {
    console.log(number);
    Linking.openURL(`tel:${number}`);
  };

  const emergencyNumbers = [
    {
      name: 'Emergency Service',
      number: '000',
      description: 'For all kinds of Emergency Assistance.',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Emergency Services</Text>
      <Text style={styles.headerSubtitle}>
        Quick access to emergency contacts and services
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Numbers</Text>
        {emergencyNumbers.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.emergencyCard}
            onPress={() => {
              Alert.alert(
                'Call Emergency Service',
                `Are you sure you want to call ${item.name} (${item.number})?`,
                [
                  {text: 'Cancel', style: 'cancel'},
                  {text: 'Call', onPress: () => handleCall(item.number)},
                ],
              );
            }}>
            <View style={styles.emergencyInfo}>
              <Text style={styles.emergencyName}>{item.name}</Text>
              <Text style={styles.emergencyDescription}>
                {item.description}
              </Text>
            </View>
            <View style={styles.callButton}>
              <Text style={styles.callButtonText}>{item.number}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Emergency Contact</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('EmergencyContact')}>
            <Text style={styles.editText}>
              {emergencyContact ? 'Edit' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>

        {emergencyContact ? (
          <View style={styles.contactCard}>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{emergencyContact.name}</Text>
              <Text style={styles.contactDetail}>
                {emergencyContact.relationship}
              </Text>
              <Text style={styles.contactDetail}>{emergencyContact.phone}</Text>
              {emergencyContact.address && (
                <Text style={styles.contactDetail}>
                  {emergencyContact.address}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.callContactButton}
              onPress={() => handleCall(emergencyContact.phone)}>
              <Text style={styles.callContactText}>Call</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addContactButton}
            onPress={() => navigation.navigate('EmergencyContact')}>
            <Text style={styles.addContactText}>Add Emergency Contact</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>In Case of Emergency</Text>
        <Text style={styles.infoText}>
          1. Stay calm and assess the situation
        </Text>
        <Text style={styles.infoText}>
          2. Call the appropriate emergency service
        </Text>
        <Text style={styles.infoText}>
          3. Provide your location and describe the emergency
        </Text>
        <Text style={styles.infoText}>
          4. Follow the dispatcher's instructions
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
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  editText: {
    color: '#4a90e2',
    fontWeight: 'bold',
  },
  emergencyCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emergencyInfo: {
    flex: 1,
  },
  emergencyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  emergencyDescription: {
    fontSize: 14,
    color: '#666',
  },
  callButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  callButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  contactCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  contactDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  callContactButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  callContactText: {
    color: 'white',
    fontWeight: 'bold',
  },
  addContactButton: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  addContactText: {
    color: '#4a90e2',
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

export default EmergencyServicesScreen;
