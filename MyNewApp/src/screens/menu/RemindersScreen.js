import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { API_URL } from '../../config/constants';

const RemindersScreen = ({ navigation }) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/reminders`);
      setReminders(response.data);
    } catch (error) {
      console.log('Error fetching reminders:', error);
      // Use sample data if API fails
      setReminders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleDeleteReminder = (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/reminders/${id}`);
              setReminders(reminders.filter(reminder => reminder._id !== id));
            } catch (error) {
              console.log('Error deleting reminder:', error);
              Alert.alert('Error', 'Failed to delete reminder. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderReminderItem = ({ item }) => (
    <View style={styles.reminderCard}>
      <View style={styles.reminderHeader}>
        <Text style={styles.reminderType}>{item.type}</Text>
        <TouchableOpacity
          onPress={() => handleDeleteReminder(item._id)}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.reminderTitle}>{item.title}</Text>
      
      {item.type === 'Medicine' && (
        <View style={styles.reminderDetails}>
          <Text style={styles.reminderDetail}>Dosage: {item.dosage}</Text>
          <Text style={styles.reminderDetail}>Frequency: {item.frequency}</Text>
          <Text style={styles.reminderDetail}>Time: {item.time}</Text>
        </View>
      )}
      
      {item.type === 'Checkup' && (
        <View style={styles.reminderDetails}>
          <Text style={styles.reminderDetail}>Date: {new Date(item.date).toLocaleDateString()}</Text>
          <Text style={styles.reminderDetail}>Time: {item.time}</Text>
          {item.address && <Text style={styles.reminderDetail}>Location: {item.address}</Text>}
        </View>
      )}
      
      {item.notes && (
        <Text style={styles.reminderNotes}>{item.notes}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Reminders</Text>
      <Text style={styles.headerSubtitle}>
        Manage your medication and checkup reminders
      </Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#4a90e2" style={styles.loader} />
      ) : (
        <>
          <FlatList
            data={reminders}
            renderItem={renderReminderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No reminders added yet</Text>
              </View>
            }
          />
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddReminder')}
          >
            <Text style={styles.addButtonText}>Add New Reminder</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
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
  listContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  reminderCard: {
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
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reminderType: {
    fontSize: 14,
    color: '#4a90e2',
    fontWeight: 'bold',
  },
  deleteText: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: 'bold',
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  reminderDetails: {
    marginBottom: 10,
  },
  reminderDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  reminderNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RemindersScreen;