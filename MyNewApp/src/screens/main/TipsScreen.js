import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import { API_URL } from '../../config/constants';

const TipsScreen = () => {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sample tips data (in case the API is not available)
  const sampleTips = [
    {
      id: '1',
      title: 'Stay Hydrated',
      content: 'Drink at least 8 glasses of water daily to maintain proper hydration.',
      category: 'Health',
    },
    {
      id: '2',
      title: 'Regular Exercise',
      content: 'Even light exercise like walking for 30 minutes daily can improve your health significantly.',
      category: 'Fitness',
    },
    {
      id: '3',
      title: 'Balanced Diet',
      content: 'Include fruits, vegetables, whole grains, and proteins in your daily meals.',
      category: 'Nutrition',
    },
    {
      id: '4',
      title: 'Social Connections',
      content: 'Maintain regular contact with friends and family to support mental wellbeing.',
      category: 'Mental Health',
    },
    {
      id: '5',
      title: 'Sleep Well',
      content: 'Aim for 7-8 hours of quality sleep each night to help your body recover.',
      category: 'Health',
    },
  ];

  const fetchTips = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/tips`);
      setTips(response.data);
    } catch (error) {
      console.log('Error fetching tips:', error);
      // Use sample data if API fails
      setTips(sampleTips);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTips();
  }, []);

  const renderTipItem = ({ item }) => (
    <View style={styles.tipCard}>
      <Text style={styles.tipCategory}>{item.category}</Text>
      <Text style={styles.tipTitle}>{item.title}</Text>
      <Text style={styles.tipContent}>{item.content}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Health Tips</Text>
      <Text style={styles.headerSubtitle}>Stay healthy with these useful tips</Text>
      
      <FlatList
        data={tips.length > 0 ? tips : sampleTips}
        renderItem={renderTipItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchTips} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tips available</Text>
          </View>
        }
      />
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
    paddingBottom: 20,
  },
  tipCard: {
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
  tipCategory: {
    color: '#4a90e2',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tipContent: {
    fontSize: 16,
    color: '#444',
    lineHeight: 22,
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
  },
});

export default TipsScreen;