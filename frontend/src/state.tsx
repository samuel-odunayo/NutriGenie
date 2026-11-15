import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { checkBackend, setToken, fetchCurrentProfile, type User } from './api';

interface AppState {
  user: User | null;
  setUser: (u: User | null, token?: string | null) => void;
  backendOnline: boolean | null;
}

const AppContext = createContext<AppState | null>(null);
const STORAGE_KEY = 'nutrigenie.user';

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const setUser = (u: User | null, token?: string | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      if (token) setToken(token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setToken(null);
    }
  };

  useEffect(() => {
    let active = true;
    const ping = async () => {
      const ok = await checkBackend();
      if (active) setBackendOnline(ok);
      // Validate session if user present
      if (ok && user) {
        const fresh = await fetchCurrentProfile();
        if (active && fresh) {
          setUserState(fresh);
        }
      }
    };
    ping();
    const id = window.setInterval(ping, 20000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  return <AppContext.Provider value={{ user, setUser, backendOnline }}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
