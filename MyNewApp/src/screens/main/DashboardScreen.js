import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { AuthContext } from '../../contexts/AuthContext';
import { ActivityContext } from '../../contexts/ActivityContext';
import axios from 'axios';
import { API_URL } from '../../config/constants';

const DashboardScreen = ({ navigation }) => {
  const { userData } = useContext(AuthContext);
  const { lastCheckIn, doNotDisturb, updateLastCheckIn } = useContext(ActivityContext);
  const [refreshing, setRefreshing] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      // Fetch emergency contacts
      const contactsResponse = await axios.get(`${API_URL}/friends`);
      setEmergencyContacts(contactsResponse.data);
      
      // Fetch reminders
      const remindersResponse = await axios.get(`${API_URL}/reminders`);
      setReminders(remindersResponse.data);
      
      // Filter upcoming reminders (for today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const upcoming = remindersResponse.data.filter(reminder => {
        if (reminder.type === 'Checkup' && reminder.date) {
          const reminderDate = new Date(reminder.date);
          reminderDate.setHours(0, 0, 0, 0);
          return reminderDate.getTime() === today.getTime();
        }
        return false;
      });
      
      setUpcomingReminders(reminders);
    } catch (error) {
      console.log('Error fetching dashboard data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatLastCheckIn = () => {
    if (!lastCheckIn) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - new Date(lastCheckIn).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const handleCheckIn = () => {
    updateLastCheckIn()
  };
  const priorityContact = emergencyContacts.find(contact => contact.priority === 1);


  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={fetchData} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {userData?.name || 'User'}</Text>
        <Text style={styles.subGreeting}>How are you today?</Text>
      </View>
      
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Check-in Status</Text>
          {doNotDisturb && (
            <View style={styles.dndBadge}>
              <Text style={styles.dndText}>DND</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.lastCheckIn}>
          Last check-in: <Text style={styles.lastCheckInValue}>{formatLastCheckIn()}</Text>
        </Text>
        
        <TouchableOpacity 
          style={styles.checkInButton}
          onPress={handleCheckIn}
        >
          <Text style={styles.checkInButtonText}>Check In Now</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Emergency Contact</Text>
        
        {priorityContact ? (
          <View style={styles.contactCard}>
            <View>
              <Text style={styles.contactName}>{priorityContact.name}</Text>
              <Text style={styles.contactDetail}>{priorityContact.phone}</Text>
              {priorityContact.relationship && (
                <Text style={styles.contactDetail}>{priorityContact.relationship}</Text>
              )}
            </View>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>Priority 1</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.addContactButton}
            onPress={() => navigation.navigate('Menu', { screen: 'Friends' })}
          >
            <Text style={styles.addContactText}>Add Emergency Contact</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Reminders</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Menu', { screen: 'Reminders' })}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {upcomingReminders.length > 0 ? (
          upcomingReminders.map((reminder) => (
            <View key={reminder._id} style={styles.reminderCard}>
              <View style={styles.reminderTypeContainer}>
                <Text style={styles.reminderType}>{reminder.type}</Text>
              </View>
              <View style={styles.reminderContent}>
                <Text style={styles.reminderTitle}>{reminder.title}</Text>
                <Text style={styles.reminderTime}>{reminder.time}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noRemindersText}>No reminders for today</Text>
        )}
      </View>
      
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Menu', { screen: 'DoNotDisturb' })}
          >
            <Text style={styles.quickActionText}>Do Not Disturb</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Menu', { screen: 'CheckInTimes' })}
          >
            <Text style={styles.quickActionText}>Check-in Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Menu', { screen: 'AddReminder' })}
          >
            <Text style={styles.quickActionText}>Add Reminder</Text>
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
  },
  header: {
    padding: 20,
    backgroundColor: '#4a90e2',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subGreeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  statusCard: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dndBadge: {
    backgroundColor: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dndText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  lastCheckIn: {
    fontSize: 16,
    marginBottom: 15,
  },
  lastCheckInValue: {
    fontWeight: 'bold',
  },
  checkInButton: {
    backgroundColor: '#4a90e2',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  checkInButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionContainer: {
    margin: 15,
    marginTop: 0,
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
  viewAllText: {
    color: '#4a90e2',
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  contactDetail: {
    fontSize: 14,
    color: '#666',
  },
  priorityBadge: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  priorityText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  addContactButton: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  addContactText: {
    color: '#4a90e2',
    fontWeight: 'bold',
  },
  reminderCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reminderTypeContainer: {
    marginRight: 10,
  },
  reminderType: {
    color: '#4a90e2',
    fontWeight: 'bold',
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  reminderTime: {
    fontSize: 14,
    color: '#666',
  },
  noRemindersText: {
    textAlign: 'center',
    color: '#666',
    padding: 15,
  },
  quickActionsContainer: {
    margin: 15,
    marginTop: 0,
    marginBottom: 30,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  quickActionButton: {
    backgroundColor: 'white',
    width: '31%',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 10,
  },
  quickActionText: {
    color: '#4a90e2',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 12,
  },
});

export default DashboardScreen;
