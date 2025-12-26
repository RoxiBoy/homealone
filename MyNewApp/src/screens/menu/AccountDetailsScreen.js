import React, {useState, useContext, useEffect} from 'react';
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
import {AuthContext} from '../../contexts/AuthContext';

const AccountDetailsScreen = () => {
  const {userData, updateProfile, isLoading} = useContext(AuthContext);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (userData) {
      setProfile({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        age: userData.age ? userData.age.toString() : '',
      });
    }
  }, [userData]);

  const handleSave = async () => {
    if (!profile.name || !profile.email || !profile.phone) {
      Alert.alert('Error', 'Name, email, and phone are required');
      return;
    }

    try {
      await updateProfile({
        ...profile,
        age: profile.age ? parseInt(profile.age) : undefined,
      });

      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {}
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Account Details</Text>
      <Text style={styles.headerSubtitle}>
        View and update your personal information
      </Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#4a90e2" style={styles.loader} />
      ) : (
        <View style={styles.profileContainer}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <Text style={styles.username}>
              {userData?.username || 'Username'}
            </Text>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={profile.name}
                  onChangeText={text => setProfile({...profile, name: text})}
                />
              ) : (
                <Text style={styles.infoValue}>{profile.name}</Text>
              )}
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={profile.email}
                  onChangeText={text => setProfile({...profile, email: text})}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.infoValue}>{profile.email}</Text>
              )}
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Phone</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={profile.phone}
                  onChangeText={text => setProfile({...profile, phone: text})}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoValue}>{profile.phone}</Text>
              )}
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Age</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={profile.age}
                  onChangeText={text => setProfile({...profile, age: text})}
                  keyboardType="number-pad"
                />
              ) : (
                <Text style={styles.infoValue}>{profile.age}</Text>
              )}
            </View>
          </View>

          {isEditing ? (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setIsEditing(false);
                  // Reset to original values
                  if (userData) {
                    setProfile({
                      name: userData.name || '',
                      email: userData.email || '',
                      phone: userData.phone || '',
                      age: userData.age ? userData.age.toString() : '',
                    });
                  }
                }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}

          <View style={styles.securitySection}>
            <Text style={styles.sectionTitle}>Security</Text>
            <TouchableOpacity style={styles.securityButton}>
              <Text style={styles.securityButtonText}>Change Password</Text>
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
  profileContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4a90e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoItem: {
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
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
  editButton: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  editButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  securitySection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  securityButton: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  securityButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 50,
  },
});

export default AccountDetailsScreen;
