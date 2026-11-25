import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { authService } from "../services/auth.service";
import { clearToken, loadToken, saveToken } from "../services/tokenStore";
import { User } from "../types";

const USER_KEY = "dlms_user";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  resetPassword: (newPassword: string) => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // restore session on app start
  useEffect(() => {
    (async () => {
      const token = await loadToken();
      const raw = await SecureStore.getItemAsync(USER_KEY);
      if (token && raw) {
        try {
          setUser(JSON.parse(raw) as User);
        } catch {
          await clearToken();
        }
      }
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (u: User | null, token?: string) => {
    setUser(u);
    if (u) await SecureStore.setItemAsync(USER_KEY, JSON.stringify(u));
    else await SecureStore.deleteItemAsync(USER_KEY);
    if (token) await saveToken(token);
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const { token, user: u } = await authService.login(identifier, password);
      await persist(u, token);
      return u;
    },
    [persist]
  );

  const resetPassword = useCallback(async (newPassword: string) => {
    await authService.resetPassword(newPassword);
    setUser((prev) => (prev ? { ...prev, must_reset_password: false } : prev));
    if (user) await SecureStore.setItemAsync(USER_KEY, JSON.stringify({ ...user, must_reset_password: false }));
  }, [user]);

  const updateUser = useCallback(
    (patch: Partial<User>) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const logout = useCallback(async () => {
    await clearToken();
    await SecureStore.deleteItemAsync(USER_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, resetPassword, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
