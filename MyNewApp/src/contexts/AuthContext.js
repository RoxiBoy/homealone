import React, {createContext, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {API_URL} from '../config/constants';
import jwtDecode from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({children}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp > currentTime) {
          setUserToken(token);
          setUserData(decoded);
          axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        } else {
          await AsyncStorage.removeItem('userToken');
        }
      }
    } catch (e) {
      console.log('Failed to load token', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
      });

      const {token, user} = response.data;

      setUserToken(token);
      setUserData(user);

      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      await AsyncStorage.setItem('userToken', token);
      console.log('Logged in');
    } catch (e) {
      setError(e.response?.data?.message || 'Login failed');
      console.log('Login error', e);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async userData => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      return response.data;
    } catch (e) {
      setError(e.response?.data?.message || 'Registration failed');
      console.log('Registration error', e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.removeItem('userToken');
      setUserToken(null);
      setUserData(null);
      delete axios.defaults.headers.common.Authorization;
    } catch (e) {
      console.log('Logout error', e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async profileData => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.put(`${API_URL}/users/profile`, profileData);
      setUserData({...userData, ...response.data});
      return response.data;
    } catch (e) {
      setError(e.response?.data?.message || 'Profile update failed');
      console.log('Profile update error', e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        userToken,
        userData,
        error,
        login,
        register,
        logout,
        updateProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
};
