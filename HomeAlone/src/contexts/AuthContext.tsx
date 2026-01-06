import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../config/api';

export type AuthUser = {
  id: string;
  username: string;
  name?: string;
  email?: string;
  phone?: string;
  age?: number;
};

export type RegisterPayload = {
  username: string;
  password: string;
  name: string;
  email: string;
  phone: string;
  age: number;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  initializing: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_TOKEN_KEY = '@homealone/token';
const AUTH_USER_KEY = '@homealone/user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.warn('Failed to restore auth session', e);
      } finally {
        setInitializing(false);
      }
    };

    restoreSession();
  }, []);

  const persistSession = useCallback(async (nextToken: string, nextUser: AuthUser) => {
    setToken(nextToken);
    setUser(nextUser);

    await Promise.all([
      AsyncStorage.setItem(AUTH_TOKEN_KEY, nextToken),
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser)),
    ]);
  }, []);

  const clearSession = useCallback(async () => {
    setToken(null);
    setUser(null);

    await Promise.all([
      AsyncStorage.removeItem(AUTH_TOKEN_KEY),
      AsyncStorage.removeItem(AUTH_USER_KEY),
    ]);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      try {
        const data = await apiFetch<{
          token: string;
          user: AuthUser;
        }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });

        await persistSession(data.token, data.user);
      } finally {
        setLoading(false);
      }
    },
    [persistSession],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      setLoading(true);
      try {
        console.log("Registering")
        await apiFetch<{ message: string }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        // Then log them in immediately
        await login(payload.username, payload.password);
      } finally {
        setLoading(false);
      }
    },
    [login],
  );

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const value: AuthContextValue = {
    user,
    token,
    initializing,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
