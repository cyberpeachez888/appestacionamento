import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { AuthUser } from '@/lib/api';

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasPermission: (perm: string) => boolean;
  loading: boolean;
  mustChangePassword: boolean;
  isFirstLogin: boolean;
  login: (login: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
  clearPasswordChangeFlags: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStoredToken(): string | null {
  try {
    return localStorage.getItem('auth:token') || sessionStorage.getItem('auth:token');
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [isFirstLogin, setIsFirstLogin] = useState<boolean>(false);

  // Initialize token from storage on mount only
  useEffect(() => {
    const storedToken = getStoredToken();
    if (storedToken) {
      setToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Validate token whenever it changes
  useEffect(() => {
    if (!token) {
      setUser(null);
      api.setAuthToken(null);
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      setLoading(true);
      api.setAuthToken(token);
      
      try {
        const me = await api.getCurrentUser();
        setUser(me.user);
      } catch (err) {
        console.warn('Token validation failed, clearing:', err);
        clearStoredToken();
        setToken(null);
        setUser(null);
        api.setAuthToken(null);
      } finally {
        setLoading(false);
      }
    };
    
    validateToken();
  }, [token]);

  const storeToken = (value: string, remember?: boolean) => {
    try {
      if (remember) {
        localStorage.setItem('auth:token', value);
        sessionStorage.removeItem('auth:token');
      } else {
        sessionStorage.setItem('auth:token', value);
        localStorage.removeItem('auth:token');
      }
    } catch {
      // ignore storage errors (e.g., in private mode)
    }
  };

  const clearStoredToken = () => {
    try {
      localStorage.removeItem('auth:token');
      sessionStorage.removeItem('auth:token');
    } catch {
      // ignore
    }
  };

  const login = async (login: string, password: string, remember?: boolean) => {
    const res = await api.login({ login, password });
    setUser(res.user);
    setToken(res.token);
    storeToken(res.token, remember);
    api.setAuthToken(res.token);
    
    // Check if password change is required
    if (res.mustChangePassword !== undefined) {
      setMustChangePassword(res.mustChangePassword);
    }
    if (res.isFirstLogin !== undefined) {
      setIsFirstLogin(res.isFirstLogin);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setMustChangePassword(false);
    setIsFirstLogin(false);
    clearStoredToken();
    api.setAuthToken(null);
  };

  const clearPasswordChangeFlags = () => {
    setMustChangePassword(false);
    setIsFirstLogin(false);
  };

  const hasPermission = (perm: string) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const perms = (user.permissions || {}) as Record<string, any>;
    return Boolean(perms[perm]);
  };

  const value = useMemo<AuthContextType>(() => ({
    user,
    token,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    hasPermission,
    loading,
    mustChangePassword,
    isFirstLogin,
    login,
    logout,
    clearPasswordChangeFlags,
  }), [user, token, loading, mustChangePassword, isFirstLogin]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
