"use client";

import { useState, useCallback, useEffect } from 'react';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useSocket } from './useSocket';

/**
 * Devuelve un mapa { [taskId]: unreadCount } con notas no leídas por tarea.
 * Se actualiza en tiempo real vía socket (notification_alert).
 * clearForTask(id) marca las notas de esa tarea como leídas en BD y actualiza UI.
 */
export function useNotasUnread() {
  const { user }               = useAuth();
  const { refresh: refreshNotifs } = useNotifications();
  const socket                 = useSocket();
  const [unreadByTask, setUnreadByTask] = useState<Record<number, number>>({});

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authFetch('/api/notifications/notas-sin-leer');
      if (!res.ok) return;
      const data = await res.json();
      setUnreadByTask(data.unread ?? {});
    } catch { /* non-critical */ }
  }, [user]);

  useEffect(() => { fetchUnread(); }, [fetchUnread]);

  // Refrescar cuando llega cualquier notification_alert por socket
  useEffect(() => {
    if (!socket) return;
    socket.on('notification_alert', fetchUnread);
    return () => { socket.off('notification_alert', fetchUnread); };
  }, [socket, fetchUnread]);

  /**
   * Marca como leídas las notas de una tarea específica.
   * Actualiza el mapa local (optimistic) y luego persiste en BD.
   */
  const clearForTask = useCallback(async (taskId: number) => {
    setUnreadByTask((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    try {
      await authFetch(`/api/notifications/leer-tarea/${taskId}`, { method: 'PATCH' });
      // Refresh del panel de notificaciones para que el badge global también baje
      refreshNotifs();
    } catch { /* fallo silencioso */ }
  }, [refreshNotifs]);

  return { unreadByTask, clearForTask, refreshUnread: fetchUnread };
}
