import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('jobtimize_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.data);
      }
    } catch (err) {
      console.error('Fetch user failed:', err);
      localStorage.removeItem('jobtimize_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    const handleAuthChange = () => {
      fetchCurrentUser();
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('jobtimize_token', res.data.data.token);
      setUser(res.data.data.user);
      return res.data.data;
    }
  };

  const googleLogin = async (mockData) => {
    const res = await api.post('/auth/google-mock', mockData);
    if (res.data.success) {
      localStorage.setItem('jobtimize_token', res.data.data.token);
      setUser(res.data.data.user);
      return res.data.data;
    }
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data.success) {
      localStorage.setItem('jobtimize_token', res.data.data.token);
      setUser(res.data.data.user);
      return res.data.data;
    }
  };

  const logout = () => {
    localStorage.removeItem('jobtimize_token');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        googleLogin,
        register,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
