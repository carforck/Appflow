"use client";

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from '@/context/AuthContext';
import { useNotasUnread } from '@/context/NotasUnreadContext';

export interface NotifToastItem {
  id:        string;
  titulo:    string;
  preview:   string;
  autor:     string;
  id_tarea:  number;
  createdAt: number;
  exiting:   boolean;
}

// ── Sonido tipo iOS (dos notas ascendentes, Web Audio API) ────────────────────
function playNotifSound() {
  try {
    const ctx = new AudioContext();
    const make = (freq: number, t: number, dur: number, vol: number) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t);
      osc.stop(t + dur);
    };
    const now = ctx.currentTime;
    make(1046, now,        0.18, 0.22);  // C6
    make(1318, now + 0.11, 0.22, 0.18); // E6
  } catch { /* autoplay policy — ignorar silenciosamente */ }
}

const MAX_TOASTS    = 3;
const VISIBLE_MS    = 4000;
const EXIT_ANIM_MS  = 350;

export function useNotifToast() {
  const { user }       = useAuth();
  const socket         = useSocket();
  const { activeTaskId } = useNotasUnread();
  const [toasts, setToasts] = useState<NotifToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), EXIT_ANIM_MS);
  }, []);

  const addToast = useCallback((item: Omit<NotifToastItem, 'id' | 'createdAt' | 'exiting'>) => {
    const id = `nt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [{ ...item, id, createdAt: Date.now(), exiting: false }, ...prev].slice(0, MAX_TOASTS));
    playNotifSound();
    // Iniciar animación de salida antes de eliminar del DOM
    setTimeout(() => setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t)), VISIBLE_MS);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), VISIBLE_MS + EXIT_ANIM_MS);
  }, []);

  useEffect(() => {
    if (!socket || !user) return;
    const handler = (payload: {
      tipo?:         string;
      id_tarea?:     number;
      titulo?:       string;
      preview?:      string;
      autor?:        string;
      autor_correo?: string;
    }) => {
      if (payload?.tipo !== 'nota') return;
      // No mostrar toast del propio mensaje enviado
      if (payload.autor_correo && payload.autor_correo === user.email) return;
      // No mostrar toast si el usuario ya está viendo ese chat
      if (payload.id_tarea != null && payload.id_tarea === activeTaskId) return;
      addToast({
        titulo:   payload.titulo   ?? 'Nueva nota',
        preview:  payload.preview  ?? '',
        autor:    payload.autor    ?? '',
        id_tarea: payload.id_tarea ?? 0,
      });
    };
    socket.on('notification_alert', handler);
    return () => { socket.off('notification_alert', handler); };
  }, [socket, user, addToast, activeTaskId]);

  return { toasts, dismiss };
}
