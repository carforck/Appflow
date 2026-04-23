"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authFetch } from '@/lib/api';
import type { MockUser } from '@/lib/mockData';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface UserStoreCtx {
  users:   MockUser[];
  loading: boolean;
  error:   string | null;
  refresh: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────────

const UserStoreContext = createContext<UserStoreCtx>({
  users:   [],
  loading: true,
  error:   null,
  refresh: async () => {},
});

// ── Provider ───────────────────────────────────────────────────────────────────

export function UserStoreProvider({ children }: { children: ReactNode }) {
  const [users,   setUsers]   = useState<MockUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/users');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Backend devuelve `email`; MockUser usa `correo` — mapeamos aquí.
      const mapped = (data.users ?? []).map((u: { email: string; nombre_completo: string; role: string; activo?: boolean }) => ({
        correo:          u.email,
        nombre_completo: u.nombre_completo,
        role:            u.role,
        activo:          u.activo ?? true,
      }));
      setUsers(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  // Una sola carga al montar — todos los consumidores ven el mismo dato
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <UserStoreContext.Provider value={{ users, loading, error, refresh }}>
      {children}
    </UserStoreContext.Provider>
  );
}

export const useUserStore = () => useContext(UserStoreContext);
