"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'superadmin' | 'admin' | 'user';

export interface User {
  email: string;
  nombre: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function backendBase() {
  if (typeof window === 'undefined') return 'http://localhost:3000';
  return `http://${window.location.hostname}:3000`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurar sesión desde localStorage al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem('alzak_user');
      const token  = localStorage.getItem('alzak_token');
      if (stored && token) setUser(JSON.parse(stored));
    } catch {
      // ignore
    }
    setIsLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string
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
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('alzak_user');
    localStorage.removeItem('alzak_token');
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated: !!user, isLoading }}
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
