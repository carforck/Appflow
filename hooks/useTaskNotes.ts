"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useSocket } from './useSocket';

export interface TaskNota {
  id:             number;
  id_tarea:       number;
  usuario_correo: string;
  usuario_nombre: string;
  mensaje:        string;
  created_at:     string;
  _pending?: true; // UI-only: optimistic — esperando confirmación del servidor
  _error?:   true; // UI-only: el servidor rechazó — desaparece en ~2 s
}

export function useTaskNotes(taskId: number | null) {
  const { user }                    = useAuth();
  const { refresh: refreshNotifs }  = useNotifications();
  const socket                      = useSocket();
  const [notas,      setNotas]      = useState<TaskNota[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [sending,    setSending]    = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const bottomRef      = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  const fetchNotas = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/tareas/${taskId}/notas`);
      if (!res.ok) return;
      const data = await res.json();
      setNotas(data.notas ?? []);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    setNotas([]);
    setTypingUser(null);
    fetchNotas();
  }, [fetchNotas]);

  // ── Socket: chat en tiempo real + typing indicators ───────────────────────
  useEffect(() => {
    if (!socket || !taskId) return;

    socket.emit('join_task', taskId);

    const handleNewNote = (nota: TaskNota) => {
      if (nota.id_tarea !== taskId) return;
      setTypingUser(null); // limpia el indicador de escritura al llegar la nota
      setNotas((prev) => {
        if (prev.some((n) => n.id === nota.id)) return prev; // deduplicar
        return [...prev, nota];
      });
    };

    const handleTypingStart = ({ userName }: { userName: string }) => {
      if (userName !== user?.nombre) setTypingUser(userName);
    };

    const handleTypingStop = () => setTypingUser(null);

    socket.on('new_note',     handleNewNote);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop',  handleTypingStop);

    return () => {
      socket.off('new_note',     handleNewNote);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop',  handleTypingStop);
      socket.emit('leave_task', taskId);
    };
  }, [socket, taskId, user?.nombre]);

  // ── Auto-scroll al último mensaje ─────────────────────────────────────────
  useEffect(() => {
    if (notas.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [notas.length]);

  // ── Limpiar timer al desmontar ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  // ── Emitir evento de escritura (debounced 3 s) ────────────────────────────
  const sendTyping = useCallback(() => {
    if (!socket || !taskId) return;
    socket.emit('typing_start', { taskId, userName: user?.nombre ?? 'Alguien' });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing_stop', { taskId });
    }, 3000);
  }, [socket, taskId, user?.nombre]);

  // ── Envío con optimistic UI ───────────────────────────────────────────────
  const sendNota = useCallback(async (mensaje: string): Promise<boolean> => {
    if (!taskId || !mensaje.trim() || sending) return false;

    // Detener el indicador de escritura propio al enviar
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    socket?.emit('typing_stop', { taskId });

    setSending(true);

    const tempId: number = Date.now();
    const optimistic: TaskNota = {
      id:             tempId,
      id_tarea:       taskId,
      usuario_correo: user?.email ?? '',
      usuario_nombre: user?.nombre ?? 'Yo',
      mensaje:        mensaje.trim(),
      created_at:     new Date().toISOString(),
      _pending:       true,
    };
    setNotas((prev) => [...prev, optimistic]);

    try {
      const res = await authFetch(`/tareas/${taskId}/notas`, {
        method: 'POST',
        body:   JSON.stringify({ mensaje: mensaje.trim() }),
      });

      if (!res.ok) {
        setNotas((prev) => prev.map((n) => n.id === tempId ? { ...n, _pending: undefined, _error: true } : n));
        setTimeout(() => setNotas((prev) => prev.filter((n) => n.id !== tempId)), 2000);
        return false;
      }

      const data = await res.json();

      // Sustituir optimista por la real; si el socket ya la añadió, eliminar solo el temporal
      setNotas((prev) => {
        const realExists = prev.some((n) => n.id === data.nota.id);
        if (realExists) return prev.filter((n) => n.id !== tempId);
        return prev.map((n) => (n.id === tempId ? data.nota : n));
      });

      refreshNotifs();
      return true;
    } catch {
      setNotas((prev) => prev.map((n) => n.id === tempId ? { ...n, _pending: undefined, _error: true } : n));
      setTimeout(() => setNotas((prev) => prev.filter((n) => n.id !== tempId)), 2000);
      return false;
    } finally {
      setSending(false);
    }
  }, [taskId, user, sending, socket, refreshNotifs]);

  return { notas, loading, sending, sendNota, bottomRef, typingUser, sendTyping };
}
