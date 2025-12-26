import React, {useContext} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {AuthContext} from '../contexts/AuthContext';
import {ActivityContext} from '../contexts/ActivityContext';

const CustomDrawerContent = ({navigation}) => {
  const {userData, logout} = useContext(AuthContext);
  const {doNotDisturb, toggleDoNotDisturb} = useContext(ActivityContext);

  const menuItems = [
    {
      title: 'Friends',
      onPress: () => navigation.navigate('Menu', {screen: 'Friends'}),
    },
    {
      title: 'Check-in Times',
      onPress: () => navigation.navigate('Menu', {screen: 'CheckInTimes'}),
    },
    {
      title: 'Emergency Services',
      onPress: () => navigation.navigate('Menu', {screen: 'EmergencyServices'}),
    },
    {
      title: 'Do Not Disturb',
      onPress: () => navigation.navigate('Menu', {screen: 'DoNotDisturb'}),
      status: doNotDisturb ? 'ON' : 'OFF',
    },
    {
      title: 'Notifications',
      onPress: () => navigation.navigate('Menu', {screen: 'Notifications'}),
    },
    {
      title: 'Reminders',
      onPress: () => navigation.navigate('Menu', {screen: 'Reminders'}),
    },
    {
      title: 'Account Details',
      onPress: () => navigation.navigate('Menu', {screen: 'AccountDetails'}),
    },
    {
      title: 'Payments',
      onPress: () => navigation.navigate('Menu', {screen: 'Payments'}),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome,</Text>
        <Text style={styles.nameText}>{userData?.name || 'User'}</Text>
      </View>

      <ScrollView style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}>
            <Text style={styles.menuItemText}>{item.title}</Text>
            {item.status && (
              <Text
                style={[
                  styles.statusText,
                  item.status === 'ON' ? styles.statusOn : styles.statusOff,
                ]}>
                {item.status}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusOn: {
    backgroundColor: '#e0f7e0',
    color: '#2e7d32',
  },
  statusOff: {
    backgroundColor: '#f7e0e0',
    color: '#c62828',
  },
  logoutButton: {
    margin: 20,
    padding: 15,
    backgroundColor: '#f44336',
    borderRadius: 5,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default CustomDrawerContent;
