import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../config/api';
import { initPush, InitPushResult, setupNotificationOpenHandlers } from '../services/push';

export type AuthUser = {
  id: string;
  username: string;
  name?: string;
  email?: string;
  phone?: string;
  age?: number;
  checkInIntervalHours?: number;
  emergencyCountdownMinutes?: number;
  dnd: boolean;
  isActive: boolean;
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
  notificationsEnabled: boolean | null;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_TOKEN_KEY = '@homealone/token';
const AUTH_USER_KEY = '@homealone/user';

const normalizeUser = (raw: any): AuthUser => {
  return {
    ...raw,
    dnd: typeof raw?.dnd === 'boolean' ? raw.dnd : false,
    isActive: typeof raw?.isActive === 'boolean' ? raw.isActive : false,
  } as AuthUser;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);

        if (storedToken && storedUser) {
          setToken(storedToken);
          const parsedUser = JSON.parse(storedUser);
          setUser(normalizeUser(parsedUser));

          // Also initialize push if we restored a session
          try {
            const result: InitPushResult = await initPush(storedToken);
            setNotificationsEnabled(result.enabled);
            if (result.enabled) {
              setupNotificationOpenHandlers();
            }
          } catch (err) {
            console.log('[AuthContext] Failed to init push from restored session', err);
            setNotificationsEnabled(false);
          }
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
    const normalizedUser = normalizeUser(nextUser);

    setToken(nextToken);
    setUser(normalizedUser);

    await Promise.all([
      AsyncStorage.setItem(AUTH_TOKEN_KEY, nextToken),
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalizedUser)),
    ]);

    // Initialize push notifications once we have a valid auth token
    initPush(nextToken)
      .then((result: InitPushResult) => {
        setNotificationsEnabled(result.enabled);
        if (result.enabled) {
          setupNotificationOpenHandlers();
        }
      })
      .catch(err => {
        console.log('[AuthContext] Failed to init push after login', err);
        setNotificationsEnabled(false);
      });
  }, []);

  const clearSession = useCallback(async () => {
    setToken(null);
    setUser(null);
    setNotificationsEnabled(null);

    await Promise.all([
      AsyncStorage.removeItem(AUTH_TOKEN_KEY),
      AsyncStorage.removeItem(AUTH_USER_KEY),
    ]);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
      setLoading(true);
      try {
        const data = await apiFetch<{token: string, user: AuthUser;}>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });

        await persistSession(data.token, data.user);

      }catch(error){
          console.log(`[AuthContext Login] Error logging in: ${error}`)
      } finally {
        setLoading(false);
      }
    },
    [persistSession],
  );

  const register = useCallback(async (payload: RegisterPayload) => {
      setLoading(true);
      try {
        console.log("[AuthContext Registet ] Registering")
        await apiFetch<{ message: string }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        await login(payload.username, payload.password);
      } catch(error){
        console.log(`[AuthContext Regiter] Error registering user: ${error}`) 
      } finally {
        setLoading(false);
      }
    },
    [login],
  );

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const updateUser = useCallback(
    async (patch: Partial<AuthUser>) => {
      setUser(prev => {
        if (!prev) return prev;
        const next = normalizeUser({ ...prev, ...patch });
        // Fire-and-forget local persistence (best-effort)
        AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(next)).catch(e => {
          console.log('[AuthContext] Failed to persist updated user', e);
        });
        return next;
      });
    },
    [],
  );

  // When logged in, report whether the app is in the foreground. While active, we periodically
  // refresh the state so the server can suppress check-in pushes.
  useEffect(() => {
    if (!token) return;

    let interval: NodeJS.Timeout | null = null;
    let cancelled = false;

    const postActivity = async (active: boolean) => {
      try {
        await apiFetch('/users/activity', {
          method: 'POST',
          token,
          body: JSON.stringify({ isActive: active }),
        });
      } catch (e) {
        console.log('[AuthContext] Failed to post activity state', e);
      } finally {
        if (!cancelled) {
          updateUser({ isActive: active });
        }
      }
    };

    const setActive = (active: boolean) => {
      postActivity(active);

      if (active) {
        if (!interval) {
          interval = setInterval(() => postActivity(true), 60_000);
        }
      } else if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    // Best-effort initial report
    setActive(AppState.currentState === 'active');

    const onChange = (state: AppStateStatus) => {
      setActive(state === 'active');
    };

    const sub = AppState.addEventListener('change', onChange);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      sub.remove();
    };
  }, [token, updateUser]);

  const value: AuthContextValue = {
    user,
    token,
    initializing,
    loading,
    notificationsEnabled,
    login,
    register,
    logout,
    updateUser,
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
