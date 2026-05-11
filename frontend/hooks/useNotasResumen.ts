"use client";

import { useState, useCallback, useEffect } from 'react';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from './useSocket';

export interface NotaResumen {
  id_tarea:        number;
  total_notas:     number;
  last_message_at: string;
  last_message:    string;
  last_author:     string;
}

export function useNotasResumen() {
  const { user } = useAuth();
  const socket   = useSocket();
  const [resumen,  setResumen] = useState<NotaResumen[]>([]);
  const [loading,  setLoading] = useState(true);

  const fetchResumen = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authFetch('/tareas/notas-resumen');
      if (!res.ok) return;
      const data = await res.json();
      setResumen(data.resumen ?? []);
    } catch { /* non-critical */ } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchResumen(); }, [fetchResumen]);

  useEffect(() => {
    if (!socket) return;
    const onAlert = (payload: { tipo?: string; id_tarea?: number; preview?: string; autor?: string }) => {
      if (payload?.tipo !== 'nota') return;
      // Actualización optimista: mover la tarea al tope sin esperar el HTTP
      const taskId = payload.id_tarea;
      if (taskId) {
        const now = new Date().toISOString();
        setResumen((prev) => {
          const entry = prev.find((r) => r.id_tarea === taskId);
          if (!entry) return prev;
          const updated: NotaResumen = {
            ...entry,
            last_message_at: now,
            last_message:    (payload.preview ?? entry.last_message).slice(0, 100),
            last_author:     payload.autor ?? entry.last_author,
            total_notas:     entry.total_notas + 1,
          };
          return [updated, ...prev.filter((r) => r.id_tarea !== taskId)];
        });
      }
      fetchResumen(); // sincroniza con BD
    };
    const onNewNote = () => fetchResumen();
    socket.on('notification_alert', onAlert);
    socket.on('new_note', onNewNote);
    return () => {
      socket.off('notification_alert', onAlert);
      socket.off('new_note', onNewNote);
    };
  }, [socket, fetchResumen]);

  return { resumen, loading, refreshResumen: fetchResumen };
}
