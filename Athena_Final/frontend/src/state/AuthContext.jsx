import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setUnauthorizedHandler } from "../lib/api";
import { AUTH, normalizeSession } from "../lib/contract";

const TOKEN_KEY = "athena.token";
const USER_KEY = "athena.user";
const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clear);
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  const persist = useCallback((session) => {
    if (!session.token) throw new Error("Backend did not return an auth token.");

    // Store in both custom Athena keys and standard keys for compatibility
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem("token", session.token);

    const userData = session.username ? { username: session.username, email: session.email || session.username } : null;
    if (userData) {
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      localStorage.setItem("user", JSON.stringify(userData));
    }

    setToken(session.token);
    setUser(userData);
    return session;
  }, []);

  const login = useCallback(
    async (username, password) =>
      persist(normalizeSession(await api.post(AUTH.loginPath, { username, email: username, password }))),
    [persist]
  );

  const register = useCallback(
    async (username, password, name) =>
      persist(normalizeSession(await api.post(AUTH.registerPath, { username, email: username, password, name }))),
    [persist]
  );

  const logout = useCallback(() => clear(), [clear]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: !!token,
      login,
      register,
      logout,
    }),
    [token, user, login, register, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}