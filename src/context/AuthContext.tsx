import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ApiError, setUnauthorizedHandler } from '../api/client';
import { AuthUser, fetchSession, logoutRequest } from '../api/auth';
import { clearSession, loadStoredSession, saveSession } from '../api/token';
import { forgetPushToken, getRegisteredPushToken, registerForPushNotifications } from '../utils/push';

interface AuthContextValue {
  isLoading: boolean;
  isLoggedIn: boolean;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const userRef = useRef<AuthUser | null>(null);

  const applyUser = useCallback((u: AuthUser | null) => {
    userRef.current = u;
    setUser(u);
  }, []);

  // Boot: restore the saved token, then confirm it with the server. A 401
  // means the token is dead; if the server is simply unreachable we trust the
  // cached user so the app still opens.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await loadStoredSession<AuthUser>();
        if (!stored) return;
        try {
          const { user: fresh } = await fetchSession(6000);
          // A token from another account type (e.g. left over from a different app) isn't ours.
          if (fresh.type !== 'restaurant') throw new ApiError(401, 'Not a restaurant session');
          await saveSession(stored.token, fresh);
          if (!cancelled) {
            applyUser(fresh);
            registerForPushNotifications();
          }
        } catch (e) {
          const tokenRejected = e instanceof ApiError && (e.status === 401 || e.status === 403);
          if (!tokenRejected && stored.user) {
            if (!cancelled) applyUser(stored.user);
          } else {
            await clearSession();
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  // Any authenticated request that returns 401 mid-session ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!userRef.current) return;
      forgetPushToken();
      clearSession();
      applyUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, [applyUser]);

  const login = useCallback(
    async (token: string, u: AuthUser) => {
      await saveSession(token, u);
      applyUser(u);
      registerForPushNotifications();
    },
    [applyUser]
  );

  const logout = useCallback(async () => {
    // JWTs are stateless, so this call is best-effort and must not delay logout.
    logoutRequest(getRegisteredPushToken()).catch(() => {});
    forgetPushToken();
    await clearSession();
    applyUser(null);
  }, [applyUser]);

  const value: AuthContextValue = { isLoading, isLoggedIn: !!user, user, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
