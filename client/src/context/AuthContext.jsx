import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState(() => sessionStorage.getItem('jobtimize_auth_notice') || '');

  useEffect(() => {
    sessionStorage.removeItem('jobtimize_auth_notice');
    if (!authNotice) return;
    const timer = setTimeout(() => setAuthNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [authNotice]);

  const loginNotice = (data) => {
    setAuthNotice('Đăng nhập thành công!');
    if (data.user.role === 'Candidate') sessionStorage.setItem('jobtimize_pending_login_notice', String(data.user.userId));
  };

  // Retry notification delivery independently; authentication remains usable during an inbox outage.
  useEffect(() => {
    if (user?.role !== 'Candidate') return;
    let active = true, pending = false;
    const record = async () => {
      if (pending || sessionStorage.getItem('jobtimize_pending_login_notice') !== String(user.userId)) return;
      pending = true;
      try {
        await api.post('/notifications/session');
        if (active) { sessionStorage.removeItem('jobtimize_pending_login_notice'); window.dispatchEvent(new Event('notifications-changed')); }
      } catch { /* Retry on the next tick without changing the login result. */ }
      finally { pending = false; }
    };
    void record();
    const timer = setInterval(record, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [user?.userId, user?.role]);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('jobtimize_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (localStorage.getItem('jobtimize_token') !== token) return;
      if (res.data.success) {
        setUser(res.data.data);
      }
    } catch (err) {
      if (localStorage.getItem('jobtimize_token') !== token) return;
      console.error('Fetch user failed:', err);
      localStorage.removeItem('jobtimize_token');
      setUser(null);
    } finally {
      if (localStorage.getItem('jobtimize_token') === token || !localStorage.getItem('jobtimize_token')) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    const handleAuthChange = () => {
      setUser(null);
      fetchCurrentUser();
    };
    const handleStorageChange = event => {
      if (event.key === 'jobtimize_token' || event.key === null) {
        setUser(null); setLoading(true); fetchCurrentUser();
      }
    };

    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleStorageChange);
    return () => { window.removeEventListener('auth-change', handleAuthChange); window.removeEventListener('storage', handleStorageChange); };
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('jobtimize_token', res.data.data.token);
      loginNotice(res.data.data);
      setUser(res.data.data.user);
      return res.data.data;
    }
  };

  const googleLogin = async (googlePayload) => {
    const res = await api.post('/auth/google', googlePayload);
    if (res.data.success) {
      localStorage.setItem('jobtimize_token', res.data.data.token);
      loginNotice(res.data.data);
      setUser(res.data.data.user);
      return res.data.data;
    }
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  };

  const verifyOtp = async (email, otp) => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    if (res.data.success) {
      localStorage.setItem('jobtimize_token', res.data.data.token);
      setUser(res.data.data.user);
      return res.data.data;
    }
  };

  const resendOtp = async (email) => {
    const res = await api.post('/auth/resend-otp', { email });
    return res.data;
  };

  const forgotPassword = async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  };

  const verifyResetOtp = async (email, otp) => {
    const res = await api.post('/auth/verify-reset-otp', { email, otp });
    return res.data;
  };

  const resetPassword = async (email, otp, newPassword) => {
    const res = await api.post('/auth/reset-password', { email, otp, newPassword });
    return res.data;
  };

  const logout = () => {
    sessionStorage.setItem('jobtimize_auth_notice', 'Đăng xuất thành công!');
    sessionStorage.removeItem('jobtimize_pending_login_notice');
    localStorage.removeItem('jobtimize_token');
    localStorage.removeItem('jobtimize_user');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        authNotice,
        dismissAuthNotice: () => setAuthNotice(''),
        login,
        googleLogin,
        register,
        verifyOtp,
        resendOtp,
        forgotPassword,
        verifyResetOtp,
        resetPassword,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
