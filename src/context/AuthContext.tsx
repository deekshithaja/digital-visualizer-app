import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApiError, api, getStoredToken, setStoredToken } from '../services/api';
import { User, UserPreferences } from '../types';
import { useTheme } from './ThemeContext';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  dbError: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: { fullName?: string; preferences?: Partial<UserPreferences> }) => Promise<User>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const { setTheme } = useTheme();

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    try {
      const res = await api.auth.me();
      setDbError(null);
      if (!res?.user) {
        setUser(null);
        return;
      }
      setUser(res.user);
      if (res.user?.preferences?.theme) setTheme(res.user.preferences.theme);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setDbError(err.message);
      } else {
        setDbError(null);
        if (token) setStoredToken(null);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setTheme]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    if (!res?.user || !res?.token) {
      throw new Error('Unexpected response from server. Please check that the backend API is running.');
    }
    setDbError(null);
    setStoredToken(res.token);
    setUser(res.user);
    if (res.user?.preferences?.theme) setTheme(res.user.preferences.theme);
  };

  const loginDemo = async () => {
    await login('demo@sentinel.local', 'SentinelDemo!2026');
  };

  const register = async (fullName: string, email: string, password: string) => {
    const res = await api.auth.register({ fullName, email, password });
    if (!res?.user || !res?.token) {
      throw new Error('Unexpected response from server. Please check that the backend API is running.');
    }
    setDbError(null);
    setStoredToken(res.token);
    setUser(res.user);
    if (res.user?.preferences?.theme) setTheme(res.user.preferences.theme);
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore network error on logout
    }
    setStoredToken(null);
    setUser(null);
  };

  const updateProfile = async (payload: {
    fullName?: string;
    preferences?: Partial<UserPreferences>;
  }) => {
    const res = await api.auth.updateProfile(payload);
    setUser(res.user);
    if (payload.preferences?.theme) {
      setTheme(payload.preferences.theme);
    }
    return res.user;
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, dbError, login, loginDemo, register, logout, updateProfile, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
