"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type AuthUser = {
  user_id: number;
  user_name: string;
  display_name: string | null;
  user_email: string | null;
  access_token: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  permissions: string[];
  login: (user: AuthUser) => void;
  logout: () => void;
  isLoading: boolean;
  /** Check if the current user holds a specific permission code. */
  hasPermission: (code: string) => boolean;
  /** Check if the current user holds ANY of the given permission codes. */
  hasAnyPermission: (...codes: string[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "auth_user";
const COOKIE_NAME = "auth_token";
const PERMISSIONS_KEY = "auth_permissions";

/* ------------------------------------------------------------------ */
/*  Cookie helpers — the cookie is read by Next.js middleware & route  */
/*  handlers so the JWT can be forwarded to the FastAPI backend.       */
/* ------------------------------------------------------------------ */
function setAuthCookie(token: string) {
  // 30-day max-age so the cookie survives browser restarts.
  // The real expiry is inside the JWT itself; the backend will reject
  // expired tokens regardless of the cookie lifetime.
  document.cookie = `${COOKIE_NAME}=${token}; path=/; SameSite=Lax; max-age=2592000`;
}

function clearAuthCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

/** Fetch the user's resolved permission codes from the backend. */
async function fetchPermissions(userId: number): Promise<string[]> {
  try {
    const res = await fetch(`/api/users/${userId}/permissions`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.permissions) ? data.permissions : [];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on first render
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser;
        setUser(parsed);
        // Re-sync cookie (may have expired while browser was closed)
        setAuthCookie(parsed.access_token);
        // Restore cached permissions while we re-fetch
        try {
          const cachedPerms = localStorage.getItem(PERMISSIONS_KEY);
          if (cachedPerms) setPermissions(JSON.parse(cachedPerms));
        } catch { /* ignore */ }
        // Re-fetch permissions in the background
        fetchPermissions(parsed.user_id).then((perms) => {
          setPermissions(perms);
          localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(perms));
        });
      }
    } catch {
      // corrupt storage — clear everything
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PERMISSIONS_KEY);
      clearAuthCookie();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Global 401 interceptor — if any fetch to our own API routes comes
  // back with 401 (expired/invalid JWT), clear the session automatically.
  // The redirect to /login is handled by app-shell's existing useEffect.
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch(...args);

      if (response.status === 401) {
        const url =
          typeof args[0] === "string"
            ? args[0]
            : args[0] instanceof Request
              ? args[0].url
              : "";

        if (url.startsWith("/api/")) {
          localStorage.removeItem(STORAGE_KEY);
          clearAuthCookie();
          setUser(null);
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const login = useCallback((authUser: AuthUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    setAuthCookie(authUser.access_token);
    setUser(authUser);
    // Fetch permissions right after login
    fetchPermissions(authUser.user_id).then((perms) => {
      setPermissions(perms);
      localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(perms));
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PERMISSIONS_KEY);
    clearAuthCookie();
    setUser(null);
    setPermissions([]);
  }, []);

  const hasPermission = useCallback(
    (code: string) => permissions.includes(code),
    [permissions],
  );

  const hasAnyPermission = useCallback(
    (...codes: string[]) => codes.some((c) => permissions.includes(c)),
    [permissions],
  );

  return (
    <AuthContext.Provider value={{ user, permissions, login, logout, isLoading, hasPermission, hasAnyPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
