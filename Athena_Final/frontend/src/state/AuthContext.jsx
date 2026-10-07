import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setUnauthorizedHandler } from "../lib/api";
import { AUTH, normalizeSession } from "../lib/contract";

const TOKEN_KEY = "athena.token";
const USER_KEY = "athena.user";
const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
  });

  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken("");
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clear);
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  const persist = useCallback((session) => {
    if (!session.token) throw new Error("Backend did not return an auth token.");
    localStorage.setItem(TOKEN_KEY, session.token);
    if (session.username) localStorage.setItem(USER_KEY, JSON.stringify({ username: session.username }));
    setToken(session.token);
    setUser(session.username ? { username: session.username } : null);
    return session;
  }, []);

  const login = useCallback(
    async (username, password) => persist(normalizeSession(await api.post(AUTH.loginPath, { username, password }))),
    [persist]
  );

  const register = useCallback(
    async (username, password) => persist(normalizeSession(await api.post(AUTH.registerPath, { username, password }))),
    [persist]
  );

  const logout = useCallback(() => clear(), [clear]);

  const value = useMemo(() => ({ token, user, login, register, logout }), [token, user, login, register, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}