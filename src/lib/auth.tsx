import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { api, clearTokens, setTokens, TOKEN_ACCESS } from './api';
import { initializeStore, resetStore, teardownStoreSockets } from './store';

export type AppRole = 'Administrator' | 'Analyst';

export interface AuthUser {
  email: string;
  name: string;
  role: AppRole;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const STORAGE_KEY = 'ig_auth_session';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (!localStorage.getItem(TOKEN_ACCESS)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as AuthUser;
      if (!['Administrator', 'Analyst'].includes(parsed.role)) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_ACCESS);
    if (!token) return;

    void (async () => {
      try {
        const me = await api.auth.me();
        const authUser: AuthUser = {
          email: me.user.email,
          name: me.user.name,
          role: me.user.appRole,
        };
        setUser(authUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
        await initializeStore();
      } catch {
        clearTokens();
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
        resetStore();
        teardownStoreSockets();
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.auth.login(email, password);
    if (!data.success || !data.accessToken || !data.refreshToken || !data.user) {
      return {
        success: false,
        error: data.error || 'Access denied. Valid operator credentials required.',
      };
    }
    setTokens(data.accessToken, data.refreshToken);
    const authUser: AuthUser = {
      email: data.user.email,
      name: data.user.name,
      role: data.user.appRole,
    };
    setUser(authUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    await initializeStore();
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    void (async () => {
      try {
        await api.auth.logout();
      } finally {
        clearTokens();
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
        teardownStoreSockets();
        resetStore();
      }
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useRole() {
  const { user } = useAuth();
  const role = user?.role ?? 'Analyst';
  return {
    role,
    isAdmin: role === 'Administrator',
    isAnalyst: role === 'Analyst',
  };
}
