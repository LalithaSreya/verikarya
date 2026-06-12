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

const LIGHT_COLORS = {
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  secondary: '#14B8A6',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  textMain: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

const DARK_COLORS = {
  primary: '#3B82F6',
  primaryLight: 'rgba(59, 130, 246, 0.15)',
  secondary: '#14B8A6',
  bg: '#0F172A',
  card: '#1E293B',
  textMain: '#F8FAFC',
  textMuted: '#94A3B8',
  border: '#334155',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('verikarya_theme');
        if (storedTheme) {
          setTheme(storedTheme);
        }
      } catch (err) {
        console.error('Failed to load theme:', err);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const nextTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(nextTheme);
      await AsyncStorage.setItem('verikarya_theme', nextTheme);
    } catch (err) {
      console.error('Failed to save theme:', err);
    }
  };

  const colors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;

  const getQueryParams = (url) => {
    let queryParams = {};
    try {
      const match = url.match(/\?(.*)/);
      if (match && match[1]) {
        const queryString = match[1];
        const pairs = queryString.split('&');
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key) {
            queryParams[decodeURIComponent(key)] = decodeURIComponent(value || '');
          }
        }
      }
    } catch (e) {
      console.error('Error in manual query parsing:', e);
    }
    return queryParams;
  };

  const parseAndLogin = async (url) => {
    try {
      console.log('Received deep link url:', url);
      const parsed = Linking.parse(url);
      let queryParams = parsed.queryParams;
      
      // Fallback if queryParams is empty or lacks token
      if (!queryParams || !queryParams.token) {
        console.log('Using manual query parameter parser fallback...');
        queryParams = getQueryParams(url);
      }

      if (queryParams && queryParams.token) {
        const { token, role, name, email } = queryParams;
        console.log('Deep link auth successful for:', email, 'role:', role);
        await AsyncStorage.setItem('verikarya_token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser({
          role,
          name,
          email
        });
      } else {
        console.log('Deep link URL did not contain valid login token');
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
        theme,
        toggleTheme,
        colors
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
