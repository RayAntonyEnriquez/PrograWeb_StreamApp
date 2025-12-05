import { createContext, useContext, useMemo, useState } from "react";
import type { User, AuthTokens, Role } from "../types/user";
import { api } from "../services/api";

type AuthCtx = {
  user: User | null;
  tokens: AuthTokens | null;
  login: (email: string, pass: string, opts?: { perfilId?: number | null }) => Promise<void>;
  register: (email: string, pass: string, role?: Role, name?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
};
const AuthContext = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const normalizeUser = (data: any): User => ({
    id: data?.id ?? data?.usuarioId ?? 0,
    email: data?.email ?? "",
    role: data?.role ?? data?.rol ?? "espectador",
    name: data?.name ?? data?.nombre ?? (data?.email ? data.email.split("@")[0] : "Usuario"),
    perfilId: data?.perfilId ?? data?.perfil_id ?? undefined,
    canalSlug: data?.canal_slug ?? null,
    avatarKey: data?.avatarKey ?? "perfil",
  });

  const loadFromStorage = <T,>(key: string) => {
    try { return JSON.parse(localStorage.getItem(key) || "null") as T | null; } catch { return null; }
  };

  const [user, setUser] = useState<User | null>(() => {
    const stored = loadFromStorage<User>("user");
    return stored ? normalizeUser(stored) : null;
  });
  const [tokens, setTokens] = useState<AuthTokens | null>(() => loadFromStorage<AuthTokens>("tokens"));

  const persist = (nextUser: User | null, nextTokens: AuthTokens | null) => {
    if (nextUser) localStorage.setItem("user", JSON.stringify(nextUser));
    else localStorage.removeItem("user");

    if (nextTokens) localStorage.setItem("tokens", JSON.stringify(nextTokens));
    else localStorage.removeItem("tokens");

    setUser(nextUser);
    setTokens(nextTokens);
  };

  const login = async (email: string, pass: string, opts?: { perfilId?: number | null }) => {
    const resp = await api.login(email, pass);
    const normalized = normalizeUser({
      id: resp.usuario?.id,
      email: resp.usuario?.email,
      rol: resp.usuario?.rol,
      nombre: resp.usuario?.nombre,
      perfilId: resp.perfilId ?? opts?.perfilId,
      canal_slug: resp.canal_slug,
    });
    if (!normalized.perfilId) {
      const fallback =
        normalized.role === "streamer"
          ? Number(import.meta.env.VITE_DEFAULT_STREAMER_ID ?? 0)
          : Number(import.meta.env.VITE_DEFAULT_VIEWER_ID ?? 0);
      normalized.perfilId = fallback || undefined;
    }
    persist(normalized, {
      accessToken: resp.accessToken,
      refreshToken: resp.refreshToken,
      refreshExpiresAt: resp.refresh_expires_at,
    });
  };

  const register = async (email: string, pass: string, role: Role = "espectador", name?: string) => {
    const nombre = name ?? email.split("@")[0];
    const regResp = await api.register(nombre, email, pass, role);
    const perfilId = regResp?.perfilId ?? null;
    await login(email, pass, { perfilId });
  };

  const logout = () => {
    if (tokens?.refreshToken) {
      api.logout(tokens.refreshToken).catch(() => {});
    }
    persist(null, null);
    // Redirigir siempre al home después de cerrar sesión
    if (typeof window !== "undefined") {
      window.location.href = import.meta.env.BASE_URL || "/";
    }
  };

  const updateProfile = (updates: Partial<User>) => {
    setUser(prev => {
      const merged = normalizeUser({ ...prev, ...updates });
      persist(merged, tokens);
      return merged;
    });
  };

  const value = useMemo(() => ({ user, tokens, login, register, logout, updateProfile }), [user, tokens]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
