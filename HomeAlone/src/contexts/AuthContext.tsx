import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../config/api';
import { initPush, InitPushResult, setupNotificationOpenHandlers } from '../services/push';
import {
  configureActivityResetWorker,
  ensureUsageAccessOrPrompt,
  runActivityResetCheck,
} from '../services/activityResetWorker';

export type AuthUser = {
  id: string;
  username: string;
  role?: 'user' | 'admin';
  name?: string;
  email?: string;
  phone?: string;
  age?: number;
  checkInIntervalHours?: number;
  emergencyCountdownMinutes?: number;
  dnd: boolean;
  sleepTimerEnabled?: boolean;
  sleepStartHour?: number;
  sleepEndHour?: number;
  sleepTimezone?: string;
  effectiveDnd?: boolean;
  dndReason?: 'manual' | 'sleep' | null;
  isActive: boolean;
  serviceActive?: boolean;
  requiresSubscription?: boolean;
  referral?: {
    code: string | null;
    referredBy: string | null;
    stats: {
      signups: number;
      conversions: number;
      rewardCents: number;
      rewardDollars: number;
    };
    rewardGrantedAt: string | null;
  };
};

export type RegisterPayload = {
  username: string;
  password: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  referralCode?: string;
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
    sleepTimerEnabled: typeof raw?.sleepTimerEnabled === 'boolean' ? raw.sleepTimerEnabled : false,
    sleepStartHour: Number.isInteger(raw?.sleepStartHour) ? raw.sleepStartHour : 21,
    sleepEndHour: Number.isInteger(raw?.sleepEndHour) ? raw.sleepEndHour : 7,
    sleepTimezone: typeof raw?.sleepTimezone === 'string' ? raw.sleepTimezone : 'UTC',
    effectiveDnd: typeof raw?.effectiveDnd === 'boolean' ? raw.effectiveDnd : (typeof raw?.dnd === 'boolean' ? raw.dnd : false),
    dndReason:
      raw?.dndReason === 'manual' || raw?.dndReason === 'sleep'
        ? raw.dndReason
        : null,
    isActive: typeof raw?.isActive === 'boolean' ? raw.isActive : false,
    serviceActive: typeof raw?.serviceActive === 'boolean' ? raw.serviceActive : false,
    requiresSubscription:
      typeof raw?.requiresSubscription === 'boolean' ? raw.requiresSubscription : true,
    referral: {
      code: typeof raw?.referral?.code === 'string' ? raw.referral.code : null,
      referredBy: typeof raw?.referral?.referredBy === 'string' ? raw.referral.referredBy : null,
      stats: {
        signups: Number(raw?.referral?.stats?.signups || 0),
        conversions: Number(raw?.referral?.stats?.conversions || 0),
        rewardCents: Number(raw?.referral?.stats?.rewardCents || 0),
        rewardDollars: Number(raw?.referral?.stats?.rewardDollars || 0),
      },
      rewardGrantedAt:
        typeof raw?.referral?.rewardGrantedAt === 'string'
          ? raw.referral.rewardGrantedAt
          : null,
    },
  } as AuthUser;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(null);
  const lastReportedActiveRef = useRef<boolean | null>(null);

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
          console.log(`[AuthContext Login] Error logging in: ${error}`);
          throw error;
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
        console.log(`[AuthContext Regiter] Error registering user: ${error}`);
        throw error;
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

  useEffect(() => {
    if (!token) return;

    console.log('[AuthContext][activity] watcher start');

    configureActivityResetWorker();
    ensureUsageAccessOrPrompt();

    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    let ticking = false;
    let tickCount = 0;

    const intervalHours = Number(user?.checkInIntervalHours || 2);
    const intervalMs = Number.isFinite(intervalHours) && intervalHours > 0 ? intervalHours * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
    const pollMs = Math.max(2000, Math.min(60000, Math.floor(intervalMs / 2)));
    console.log(`[AuthContext][activity] computed intervalMs=${intervalMs} pollMs=${pollMs}`);

    const syncActivityState = async (active: boolean) => {
      if (lastReportedActiveRef.current === active) {
        console.log(`[AuthContext][activity] sync skip unchanged active=${active}`);
        return;
      }

      console.log(
        `[AuthContext][activity] sync start from=${lastReportedActiveRef.current} to=${active}`,
      );
      try {
        await apiFetch('/users/activity', {
          method: 'POST',
          token,
          body: JSON.stringify({ isActive: active }),
        });
        console.log(`[AuthContext][activity] sync success active=${active}`);
        if (!cancelled) {
          lastReportedActiveRef.current = active;
          updateUser({ isActive: active });
          console.log(`[AuthContext][activity] sync local state updated active=${active}`);
        }
      } catch (e) {
        console.log('[AuthContext] Failed to sync activity state', e);
      }
    };

    const tick = async () => {
      if (ticking || cancelled) return;
      ticking = true;
      tickCount += 1;
      const tickId = `fg-${tickCount}-${Date.now()}`;
      console.log(`[AuthContext][activity][${tickId}] tick start`);
      try {
        const result = await runActivityResetCheck({
          tokenOverride: token,
          forceActive: true,
          source: 'auth-foreground-tick',
        });
        console.log(
          `[AuthContext][activity][${tickId}] tick result`,
          JSON.stringify(result),
        );
        await syncActivityState(result.active);

        if (!result.active && result.reason === 'usage-access-not-granted') {
          console.log(
            '[AuthContext] Usage access not granted; activity reset is disabled until permission is enabled.',
          );
        }
      } catch (e) {
        console.log('[AuthContext] Foreground activity reset tick failed', e);
      } finally {
        ticking = false;
        console.log(`[AuthContext][activity][${tickId}] tick end`);
      }
    };

    const startPolling = () => {
      if (interval) return;
      console.log(`[AuthContext][activity] startPolling pollMs=${pollMs}`);
      tick();
      interval = setInterval(tick, pollMs);
    };

    const stopPolling = () => {
      if (!interval) return;
      console.log('[AuthContext][activity] stopPolling');
      clearInterval(interval);
      interval = null;
    };

    // Poll only while app is foregrounded to minimize battery usage.
    if (AppState.currentState === 'active') {
      console.log('[AuthContext][activity] initial appState=active');
      startPolling();
    } else {
      console.log(`[AuthContext][activity] initial appState=${AppState.currentState}`);
    }

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      console.log(`[AuthContext][activity] AppState changed -> ${state}`);
      if (state === 'active') {
        startPolling();
      } else {
        stopPolling();
        runActivityResetCheck({
          tokenOverride: token,
          source: `auth-appstate-${state}`,
        }).catch(e => {
          console.log('[AuthContext] Background transition reset check failed', e);
        });
        syncActivityState(false).catch(e => {
          console.log('[AuthContext] Failed to sync inactive state on AppState change', e);
        });
      }
    });

    return () => {
      console.log('[AuthContext][activity] watcher cleanup');
      cancelled = true;
      stopPolling();
      syncActivityState(false).catch(e => {
        console.log('[AuthContext] Failed to sync inactive state on cleanup', e);
      });
      sub.remove();
    };
  }, [token, user?.checkInIntervalHours, updateUser]);

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
