import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthSession, LoginDto } from '@bestapp/shared';
import { authClient } from '../api/auth';
import { setAuthToken } from '../api/http';

type AuthContextValue = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (input: LoginDto) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('bestapp.session');
    if (raw) {
      try {
        setSession(JSON.parse(raw) as AuthSession);
      } catch {
        localStorage.removeItem('bestapp.session');
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (session) {
      localStorage.setItem('bestapp.session', JSON.stringify(session));
      setAuthToken(session.accessToken);
    } else {
      localStorage.removeItem('bestapp.session');
      setAuthToken(null);
    }
  }, [session, isHydrated]);

  const login = async (input: LoginDto) => {
    const response = await authClient.login(input);
    setSession(response);
  };

  const logout = () => setSession(null);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      isHydrated,
      login,
      logout
    }),
    [session, isHydrated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
