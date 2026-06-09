import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Linking from 'expo-linking';

export const AuthContext = createContext();

const API_URL = 'https://verikarya.onrender.com/api';

// Configure standard axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const parseAndLogin = async (url) => {
    try {
      const parsed = Linking.parse(url);
      const { queryParams } = parsed;
      if (queryParams && queryParams.token) {
        const { token, role, name, email } = queryParams;
        await AsyncStorage.setItem('verikarya_token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser({
          role,
          name,
          email
        });
      }
    } catch (err) {
      console.error('Error parsing deep link auth:', err);
    }
  };

  // Listen for deep links (Google Sign-In redirection)
  useEffect(() => {
    const handleDeepLink = (event) => {
      if (event.url) {
        parseAndLogin(event.url);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) {
        parseAndLogin(url);
      }
    });

    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  // Check login on mount
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const token = await AsyncStorage.getItem('verikarya_token');
        if (!token) {
          setLoading(false);
          return;
        }

        // Set authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.user);
        } else {
          await logout();
        }
      } catch (err) {
        console.error('Session restoration failed:', err);
        await logout();
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        const { token, user: userData } = res.data;
        await AsyncStorage.setItem('verikarya_token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        return { success: true };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Invalid credentials';
      return { success: false, error: errorMsg };
    }
  };

  const loginWithGoogle = async (googleToken, role) => {
    try {
      const res = await api.post('/auth/google', { token: googleToken, role });
      if (res.data.success) {
        const { token, user: userData } = res.data;
        await AsyncStorage.setItem('verikarya_token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        return { success: true };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Google Login failed';
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('verikarya_token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    } catch (err) {
      console.error('Logout storage clear error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithGoogle,
        logout,
        isAuthenticated: !!user,
        isManager: user?.role === 'manager',
        isEmployee: user?.role === 'employee',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
