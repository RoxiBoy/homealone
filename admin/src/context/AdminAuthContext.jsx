import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearStoredAdminSession, getStoredAdminSession, storeAdminSession } from '../lib/auth';
import { apiRequest } from '../lib/api';

const AdminAuthContext = createContext(undefined);

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const session = getStoredAdminSession();
    setToken(session.token);
    setUser(session.user);
    setInitializing(false);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      initializing,
      async login({ username, password }) {
        const response = await apiRequest('/auth/login', {
          method: 'POST',
          body: { username, password },
        });

        if (response.user?.role !== 'admin') {
          throw new Error('This account does not have admin access.');
        }

        setToken(response.token);
        setUser(response.user);
        storeAdminSession(response.token, response.user);
      },
      logout() {
        setToken(null);
        setUser(null);
        clearStoredAdminSession();
      },
    }),
    [initializing, token, user],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }

  return context;
}
