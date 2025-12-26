import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { API_URL } from '../../config/constants';
import { AuthContext } from '../../contexts/AuthContext';

const FriendsScreen = () => {
  const { userToken } = useContext(AuthContext);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFriend, setNewFriend] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
    priority: 3,
  });

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/friends`);
      setFriends(response.data);
    } catch (error) {
      console.log('Error fetching friends:', error);
      // Use sample data if API fails
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const handleAddFriend = async () => {
    if (!newFriend.name || !newFriend.phone) {
      Alert.alert('Error', 'Name and phone number are required');
      return;
    }

    if (friends.length >= 3) {
      Alert.alert('Error', 'You can only add up to 3 emergency contacts');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/friends`, newFriend);
      setFriends([...friends, response.data]);
      setNewFriend({
        name: '',
        phone: '',
        email: '',
        relationship: '',
        priority: 3,
      });
      setShowAddForm(false);
    } catch (error) {
      console.log('Error adding friend:', error);
      Alert.alert('Error', 'Failed to add friend. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFriend = async (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to remove this contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await axios.delete(`${API_URL}/friends/${id}`);
              setFriends(friends.filter(friend => friend._id !== id));
            } catch (error) {
              console.log('Error deleting friend:', error);
              Alert.alert('Error', 'Failed to delete friend. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleUpdatePriority = async (friend, newPriority) => {
    if (friend.priority === newPriority) return;
    
    // Check if another friend already has this priority
    const existingFriendWithPriority = friends.find(f => 
      f._id !== friend._id && f.priority === newPriority
    );
    
    if (existingFriendWithPriority) {
      // Swap priorities
      try {
        await axios.put(`${API_URL}/friends/${existingFriendWithPriority._id}`, {
          ...existingFriendWithPriority,
          priority: friend.priority
        });
      } catch (error) {
        console.log('Error updating friend priority:', error);
      }
    }
    
    try {
      const response = await axios.put(`${API_URL}/friends/${friend._id}`, {
        ...friend,
        priority: newPriority
      });
      
      // Update local state
      fetchFriends();
    } catch (error) {
      console.log('Error updating friend priority:', error);
      Alert.alert('Error', 'Failed to update priority. Please try again.');
    }
  };

  const renderFriendItem = ({ item }) => (
    <View style={styles.friendCard}>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.name}</Text>
        <Text style={styles.friendDetail}>{item.relationship}</Text>
        <Text style={styles.friendDetail}>{item.phone}</Text>
        {item.email && <Text style={styles.friendDetail}>{item.email}</Text>}
        
        <View style={styles.priorityContainer}>
          <Text style={styles.priorityLabel}>Priority:</Text>
          <View style={styles.priorityButtons}>
            {[1, 2, 3].map(priority => (
              <TouchableOpacity
                key={priority}
                style={[
                  styles.priorityButton,
                  item.priority === priority && styles.priorityButtonActive
                ]}
                onPress={() => handleUpdatePriority(item, priority)}
              >
                <Text 
                  style={[
                    styles.priorityButtonText,
                    item.priority === priority && styles.priorityButtonTextActive
                  ]}
                >
                  {priority}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteFriend(item._id)}
      >
        <Text style={styles.deleteButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Emergency Contacts</Text>
      <Text style={styles.headerSubtitle}>Add up to 3 close friends to contact in case of emergency</Text>
      <Text style={styles.infoText}>Priority 1 contact will be called automatically if you don't respond to check-ins</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#4a90e2" style={styles.loader} />
      ) : (
        <>
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No emergency contacts added yet</Text>
              </View>
            }
          />
          
          {friends.length < 3 && !showAddForm && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddForm(true)}
            >
              <Text style={styles.addButtonText}>Add Emergency Contact</Text>
            </TouchableOpacity>
          )}
          
          {showAddForm && (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Add New Contact</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter name"
                  value={newFriend.name}
                  onChangeText={(text) => setNewFriend({...newFriend, name: text})}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  value={newFriend.phone}
                  onChangeText={(text) => setNewFriend({...newFriend, phone: text})}
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email"
                  value={newFriend.email}
                  onChangeText={(text) => setNewFriend({...newFriend, email: text})}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Relationship</Text>
                <TextInput
                  style={styles.input}
                  placeholder="E.g., Friend, Family, Neighbor"
                  value={newFriend.relationship}
                  onChangeText={(text) => setNewFriend({...newFriend, relationship: text})}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityButtons}>
                  {[1, 2, 3].map(priority => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityButton,
                        newFriend.priority === priority && styles.priorityButtonActive
                      ]}
                      onPress={() => setNewFriend({...newFriend, priority})}
                    >
                      <Text 
                        style={[
                          styles.priorityButtonText,
                          newFriend.priority === priority && styles.priorityButtonTextActive
                        ]}
                      >
                        {priority}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setShowAddForm(false);
                    setNewFriend({
                      name: '',
                      phone: '',
                      email: '',
                      relationship: '',
                      priority: 3,
                    });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleAddFriend}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#e65100',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  listContainer: {
    flexGrow: 1,
  },
  friendCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  friendDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  priorityLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 10,
  },
  priorityButtons: {
    flexDirection: 'row',
  },
  priorityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  priorityButtonActive: {
    backgroundColor: '#4a90e2',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  priorityButtonTextActive: {
    color: 'white',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
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
    marginTop: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FriendsScreen;
