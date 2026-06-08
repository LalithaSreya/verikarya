import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkUserLoggedIn = async () => {
      const token = localStorage.getItem('verikarya_token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.user);
        } else {
          // Token invalid or expired
          localStorage.removeItem('verikarya_token');
        }
      } catch (err) {
        console.error('Error fetching user profile in AuthContext:', err);
        localStorage.removeItem('verikarya_token');
      } finally {
        setLoading(false);
      }
    };

    checkUserLoggedIn();
  }, []);

  // Login User
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      
      if (res.data.success) {
        localStorage.setItem('verikarya_token', res.data.token);
        setUser(res.data.user);
        return { success: true };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Invalid email or password';
      return { success: false, error: errorMsg };
    }
  };

  // Login with Google
  const loginWithGoogle = async (googleToken, role) => {
    try {
      const res = await api.post('/api/auth/google', { token: googleToken, role });
      
      if (res.data.success) {
        localStorage.setItem('verikarya_token', res.data.token);
        setUser(res.data.user);
        return { success: true };
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Google authentication failed';
      return { success: false, error: errorMsg };
    }
  };

  // Logout User
  const logout = () => {
    localStorage.removeItem('verikarya_token');
    setUser(null);
  };

  // State modifier for testing bypass (update user officeLocation locally)
  const updateOfficeLocationState = (location) => {
    if (user) {
      setUser({
        ...user,
        officeLocation: location
      });
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
        updateOfficeLocationState,
        isAuthenticated: !!user,
        isManager: user?.role === 'manager',
        isEmployee: user?.role === 'employee'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
