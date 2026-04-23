"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSocket, disconnectSocket } from '@/hooks/useSocket';

export type UserRole = 'superadmin' | 'admin' | 'user';

export interface User {
  email:  string;
  nombre: string;
  role:   UserRole;
}

interface AuthContextType {
  user:            User | null;
  login:           (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginMock:       (role: UserRole) => void;
  logout:          () => void;
  isAuthenticated: boolean;
  isLoading:       boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function backendBase() {
  if (typeof window === 'undefined') return 'http://localhost:3005';
  return `http://${window.location.hostname}:3005`;
}

const MOCK_USERS: Record<UserRole, User> = {
  superadmin: { email: 'c.carranza@alzak.org', nombre: 'Carlos Carranza',  role: 'superadmin' },
  admin:      { email: 'a.puerto@alzak.org',   nombre: 'Alejandra Puerto', role: 'admin'      },
  user:       { email: 'l.salcedo@alzak.org',  nombre: 'Lina Salcedo',     role: 'user'       },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const socket = useSocket();

  // Restaurar sesión desde localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('alzak_user');
      const token  = localStorage.getItem('alzak_token');
      if (stored && token) setUser(JSON.parse(stored));
    } catch { /* ignore */ }
    setIsLoading(false);
  }, []);

  // Auto-logout en 401 (token expirado)
  useEffect(() => {
    const handler = () => {
      setUser(null);
      localStorage.removeItem('alzak_user');
      localStorage.removeItem('alzak_token');
      disconnectSocket();
    };
    window.addEventListener('alzak:unauthorized', handler);
    return () => window.removeEventListener('alzak:unauthorized', handler);
  }, []);

  // Sincronizar sesión entre pestañas
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== 'alzak_token' && e.key !== 'alzak_user') return;
      try {
        const stored = localStorage.getItem('alzak_user');
        const token  = localStorage.getItem('alzak_token');
        setUser(stored && token ? JSON.parse(stored) : null);
      } catch { setUser(null); }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // ── Socket: gestión de cuenta en tiempo real ──────────────────────────────
  useEffect(() => {
    if (!socket || !user) return;

    // SuperAdmin eliminó esta cuenta → forzar logout inmediato
    const handleForceLogout = () => {
      setUser(null);
      localStorage.removeItem('alzak_user');
      localStorage.removeItem('alzak_token');
      disconnectSocket();
      window.dispatchEvent(new CustomEvent('alzak:force_logout'));
    };

    // SuperAdmin cambió el rol de este usuario → actualizar sesión local
    const handleRoleChanged = ({ email: targetEmail, role: newRole }: { email: string; role: string }) => {
      if (targetEmail !== user.email) return;
      const updated: User = { ...user, role: newRole as UserRole };
      setUser(updated);
      localStorage.setItem('alzak_user', JSON.stringify(updated));
      // Notificar a la UI (Toast en Navigation.tsx lo escucha)
      window.dispatchEvent(new CustomEvent('alzak:role_changed', { detail: { role: newRole } }));
    };

    socket.on('user_force_logout', handleForceLogout);
    socket.on('user_role_changed', handleRoleChanged);

    return () => {
      socket.off('user_force_logout', handleForceLogout);
      socket.off('user_role_changed', handleRoleChanged);
    };
  }, [socket, user]);

  const login = useCallback(async (
    email: string,
    password: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res  = await fetch(`${backendBase()}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error ?? 'Credenciales incorrectas' };
      setUser(data.user);
      localStorage.setItem('alzak_user',  JSON.stringify(data.user));
      localStorage.setItem('alzak_token', data.token);
      return { ok: true };
    } catch {
      return { ok: false, error: 'No se pudo conectar con el servidor. ¿El backend está activo?' };
    }
  }, []);

  const loginMock = useCallback((role: UserRole) => {
    const u = MOCK_USERS[role];
    setUser(u);
    localStorage.setItem('alzak_user',  JSON.stringify(u));
    localStorage.setItem('alzak_token', `mock-token-${role}-${Date.now()}`);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('alzak_user');
    localStorage.removeItem('alzak_token');
    disconnectSocket();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, login, loginMock, logout, isAuthenticated: !!user, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
