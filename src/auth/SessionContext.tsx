import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ApiError,
  configureApiAuth,
  loginRequest,
  refreshRequest,
} from "../api/client";
import type { AuthSession, SessionUser } from "../api/types";
import { API_BASE_URL } from "../config/api";
import {
  clearSession,
  loadStoredSession,
  saveSession,
  updateTokens,
} from "./storage";

type SessionContextValue = {
  user: SessionUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<AuthSession | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const applySession = useCallback(async (next: AuthSession | null) => {
    sessionRef.current = next;
    setSession(next);
    if (next) {
      await saveSession(next);
    } else {
      await clearSession();
    }
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    const current = sessionRef.current;
    if (!current?.refreshToken) {
      return false;
    }
    try {
      const tokens = await refreshRequest(current.refreshToken);
      const updated: AuthSession = {
        ...current,
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      };
      await updateTokens(updated.token, updated.refreshToken);
      sessionRef.current = updated;
      setSession(updated);
      return true;
    } catch {
      await applySession(null);
      return false;
    }
  }, [applySession]);

  useEffect(() => {
    configureApiAuth(
      () => sessionRef.current?.token ?? null,
      refresh,
    );
    void (async () => {
      const stored = await loadStoredSession();
      if (stored) {
        sessionRef.current = stored;
        setSession(stored);
      }
      setLoading(false);
    })();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const next = await loginRequest(email.trim(), password);
        await applySession(next);
        const { syncPushRegistration } = await import("@/notifications/push");
        void syncPushRegistration().catch(() => {});
      } catch (e) {
        if (e instanceof ApiError) {
          throw new Error(e.body || "Credenciales inválidas");
        }
        throw new Error(
          `No se pudo conectar al backend (${API_BASE_URL}). Revisa WiFi y que Docker esté en marcha.`,
        );
      }
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    const { unregisterPushTokenFromBackend } = await import("@/notifications/push");
    await unregisterPushTokenFromBackend().catch(() => {});
    await applySession(null);
  }, [applySession]);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      loading,
      login,
      logout,
    }),
    [session, loading, login, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession debe usarse dentro de SessionProvider");
  }
  return ctx;
}
