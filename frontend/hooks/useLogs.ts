'use client';
import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/api';
import { useSocket } from './useSocket';

export type LogEntry = {
  id: number;
  usuario_correo: string;
  usuario_nombre: string;
  usuario_role: string;
  accion: string;
  modulo: string;
  detalle: string;
  ip_address: string | null;
  entity_id: number | null;
  entity_type: string | null;
  created_at: string;
  isNew?: boolean;
};

export type ActiveUser = {
  email: string;
  nombre: string;
  role: string;
  connectedAt: string;
};

export type LogStats = {
  byAccion: { accion: string; total: number }[];
  byModulo: { modulo: string; total: number }[];
  recent24h: number;
};

export type LogFilters = {
  accion: string;
  modulo: string;
  q: string;
  page: number;
};

const LIMIT = 50;

function bumpAccion(arr: { accion: string; total: number }[], value: string) {
  const found = arr.find((i) => i.accion === value);
  if (found) return arr.map((i) => i.accion === value ? { ...i, total: i.total + 1 } : i);
  return [...arr, { accion: value, total: 1 }];
}

function bumpModulo(arr: { modulo: string; total: number }[], value: string) {
  const found = arr.find((i) => i.modulo === value);
  if (found) return arr.map((i) => i.modulo === value ? { ...i, total: i.total + 1 } : i);
  return [...arr, { modulo: value, total: 1 }];
}

export function useLogs() {
  const socket = useSocket();

  const [logs, setLogs]             = useState<LogEntry[]>([]);
  const [total, setTotal]           = useState(0);
  const [stats, setStats]           = useState<LogStats>({ byAccion: [], byModulo: [], recent24h: 0 });
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filters, setFilters]       = useState<LogFilters>({ accion: 'Todas', modulo: 'Todos', q: '', page: 1 });

  const fetchLogs = useCallback(async (f: LogFilters) => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (f.accion !== 'Todas') p.set('accion', f.accion);
      if (f.modulo !== 'Todos') p.set('modulo', f.modulo);
      if (f.q.trim())           p.set('q', f.q.trim());
      p.set('page',  String(f.page));
      p.set('limit', String(LIMIT));

      const res = await authFetch(`/api/logs?${p}`);
      if (!res.ok) return;
      const data = await res.json() as { logs: LogEntry[]; total: number };
      setLogs(data.logs);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await authFetch('/api/logs/stats');
      if (!res.ok) return;
      setStats(await res.json() as LogStats);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchLogs(filters);
  }, [filters, fetchLogs]);

  // Real-time socket listeners
  useEffect(() => {
    if (!socket) return;

    const onNewLog = (entry: LogEntry) => {
      // Only prepend to list when on page 1 with no active filters
      setLogs((prev) => {
        const withNew = [{ ...entry, isNew: true }, ...prev].slice(0, LIMIT);
        setTimeout(() => {
          setLogs((p) => p.map((l) => l.id === entry.id ? { ...l, isNew: false } : l));
        }, 2500);
        return withNew;
      });
      setTotal((t) => t + 1);
      setStats((prev) => ({
        ...prev,
        recent24h: prev.recent24h + 1,
        byAccion:  bumpAccion(prev.byAccion, entry.accion),
        byModulo:  bumpModulo(prev.byModulo, entry.modulo),
      }));
    };

    const onActiveUsers = (users: ActiveUser[]) => setActiveUsers(users);

    socket.on('new_activity_log',  onNewLog);
    socket.on('active_users_update', onActiveUsers);
    return () => {
      socket.off('new_activity_log',  onNewLog);
      socket.off('active_users_update', onActiveUsers);
    };
  }, [socket]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return {
    logs, total, stats, activeUsers, loading, filters, setFilters,
    totalPages, LIMIT,
    refetch: () => { fetchLogs(filters); fetchStats(); },
  };
}
