import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('procurement_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('procurement_token') || null);
  const [loading, setLoading] = useState(true);

  // Set Axios Auth Header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('procurement_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('procurement_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('procurement_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('procurement_user');
    }
    setLoading(false);
  }, [user]);

  const login = async (username, password) => {
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      const { token: receivedToken, user: receivedUser } = res.data;
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true, user: receivedUser };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'فشل تسجيل الدخول، يرجى مراجعة البيانات'
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('procurement_user');
    localStorage.removeItem('procurement_token');
  };

  /**
   * Check if the current user has permission to access a specific role/section
   * Admin always has access.
   */
  const hasPermission = (...allowedRoles) => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, hasPermission, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
