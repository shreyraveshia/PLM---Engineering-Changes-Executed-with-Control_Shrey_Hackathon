
import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/axios';
const AuthContext = createContext(null);

// AuthProvider is a wrapper component. 
// You'll wrap your entire app in it so all components get access to auth data

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('plm_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;
      sessionStorage.setItem('plm_token', token);
      sessionStorage.setItem('plm_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } finally {
      setLoading(false);
    }
  }, []);
  const signup = useCallback(async (name, email, password, role) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/signup', { name, email, password, role });
      const { token, user: userData } = response.data;
      sessionStorage.setItem('plm_token', token);
      sessionStorage.setItem('plm_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } finally {
      setLoading(false);
    }
  }, []);
  const logout = useCallback(() => {
    sessionStorage.removeItem('plm_token');
    sessionStorage.removeItem('plm_user');
    setUser(null);
  }, []);
  const hasRole = useCallback((...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);
  const isAdmin = useCallback(() => hasRole('admin'), [hasRole]);
  const isEngineer = useCallback(() => hasRole('admin', 'engineering_user'), [hasRole]);
  const isApprover = useCallback(() => hasRole('admin', 'approver'), [hasRole]);
  return (
    <AuthContext.Provider value={{
      user, loading,
      login, signup, logout,
      hasRole, isAdmin, isEngineer, isApprover
    }}>
      {children}
    </AuthContext.Provider>
  );
};









/*
AuthContext.Provider — the component that makes context data available to all children.
value={{...}} — everything passed here becomes available to any component calling useAuth().

*/


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
