import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { DashboardData, fetchDashboard } from '../services/dashboard';

type DashboardContextValue = {
  dashboard: DashboardData | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refreshDashboard: () => Promise<void>;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async (mode: 'load' | 'refresh' = 'load') => {
      if (!token) {
        setDashboard(null);
        setError(null);
        return;
      }

      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await fetchDashboard(token);
        setDashboard(data);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard';
        setError(message);
      } finally {
        if (mode === 'refresh') {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [token],
  );

  const refreshDashboard = useCallback(async () => {
    await loadDashboard('refresh');
  }, [loadDashboard]);

  useEffect(() => {
    if (!token) {
      setDashboard(null);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    loadDashboard('load');
  }, [loadDashboard, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        loadDashboard('refresh');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadDashboard, token]);

  return (
    <DashboardContext.Provider
      value={{
        dashboard,
        loading,
        refreshing,
        error,
        refreshDashboard,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = (): DashboardContextValue => {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }

  return context;
};
