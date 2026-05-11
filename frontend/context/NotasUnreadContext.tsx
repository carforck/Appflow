"use client";

import {
  createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode,
} from 'react';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useSocket } from '@/hooks/useSocket';

interface NotasUnreadCtx {
  unreadByTask:    Record<number, number>;
  clearForTask:    (taskId: number) => Promise<void>;
  refreshUnread:   () => Promise<void>;
  activeTaskId:    number | null;
  setActiveTaskId: (id: number | null) => void;
}

const NotasUnreadContext = createContext<NotasUnreadCtx>({
  unreadByTask:    {},
  clearForTask:    async () => {},
  refreshUnread:   async () => {},
  activeTaskId:    null,
  setActiveTaskId: () => {},
});

export function NotasUnreadProvider({ children }: { children: ReactNode }) {
  const { user }                   = useAuth();
  const { refresh: refreshNotifs } = useNotifications();
  const socket                     = useSocket();
  const [unreadByTask, setUnreadByTask] = useState<Record<number, number>>({});
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const activeTaskIdRef = useRef<number | null>(null);
  useEffect(() => { activeTaskIdRef.current = activeTaskId; }, [activeTaskId]);
  // Tracks task IDs whose clear PATCH is still in-flight — fetchUnread skips them
  const clearingRef = useRef<Set<number>>(new Set());

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authFetch('/api/notifications/notas-sin-leer');
      if (!res.ok) return;
      const data = await res.json();
      setUnreadByTask((prev) => {
        const incoming: Record<number, number> = data.unread ?? {};
        const next = { ...incoming };
        // Don't overwrite tasks whose clear PATCH is still in flight
        Array.from(clearingRef.current).forEach((id) => delete next[id]);
        return next;
      });
    } catch { /* non-critical */ }
  }, [user]);

  useEffect(() => { fetchUnread(); }, [fetchUnread]);

  useEffect(() => {
    if (!socket) return;
    const onAlert = (payload: { tipo?: string; id_tarea?: number }) => {
      if (payload?.tipo !== 'nota') return;
      // Actualización optimista: subir el badge inmediatamente sin esperar el HTTP
      const taskId = payload.id_tarea;
      if (taskId && activeTaskIdRef.current !== taskId && !clearingRef.current.has(taskId)) {
        setUnreadByTask((prev) => ({ ...prev, [taskId]: (prev[taskId] ?? 0) + 1 }));
      }
      fetchUnread(); // sincroniza con BD para confirmar el conteo exacto
    };
    socket.on('notification_alert', onAlert);
    return () => { socket.off('notification_alert', onAlert); };
  }, [socket, fetchUnread]);

  const clearForTask = useCallback(async (taskId: number) => {
    clearingRef.current.add(taskId);
    setUnreadByTask((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    try {
      await authFetch(`/api/notifications/leer-tarea/${taskId}`, { method: 'PATCH' });
      refreshNotifs();
    } catch { /* fallo silencioso */ } finally {
      clearingRef.current.delete(taskId);
      fetchUnread(); // sync final con BD tras el PATCH
    }
  }, [refreshNotifs, fetchUnread]);

  return (
    <NotasUnreadContext.Provider value={{ unreadByTask, clearForTask, refreshUnread: fetchUnread, activeTaskId, setActiveTaskId }}>
      {children}
    </NotasUnreadContext.Provider>
  );
}

export const useNotasUnread = () => useContext(NotasUnreadContext);
