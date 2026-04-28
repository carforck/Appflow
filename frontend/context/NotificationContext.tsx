"use client";

import {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from 'react';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface DBNotification {
  id:                  number;
  tipo:                string;
  titulo:              string;
  mensaje:             string | null;
  leido:               number;
  id_meeting:          number | null;
  id_tarea:            number | null;
  destinatario_correo: string | null;
  created_at:          string;
}

interface NotificationCtx {
  notifications:   DBNotification[];
  unreadCount:     number;
  loading:         boolean;
  refresh:         () => Promise<void>;
  markRead:        (id: number) => Promise<void>;
  markAllRead:     () => Promise<void>;
  addNotification: (n: Pick<DBNotification, 'tipo' | 'titulo' | 'mensaje'>) => void;
}

const NotificationContext = createContext<NotificationCtx>({
  notifications:   [],
  unreadCount:     0,
  loading:         false,
  refresh:         async () => {},
  markRead:        async () => {},
  markAllRead:     async () => {},
  addNotification: () => {},
});

// ── Sonido de notificación (Web Audio API — sin archivos externos) ─────────────

function playNotifSound() {
  try {
    const ctx  = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    // Doble tono descendente — familiar y no intrusivo
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    // ctx.close() es automático al parar el oscilador
  } catch { /* silently ignore — requiere interacción previa del usuario */ }
}

// ── Provider ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user }   = useAuth();
  const socket     = useSocket();
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [loading,       setLoading]       = useState(false);

  const unreadCount = notifications.filter((n) => n.leido === 0).length;

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, [user]);

  // Carga inicial + polling de respaldo (30 s)
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // ── Socket: alerta instantánea de nueva notificación ─────────────────────
  useEffect(() => {
    if (!socket) return;
    const handleAlert = (_payload?: { tipo?: string | null; id_tarea?: number | null }) => {
      refresh();
      if (document.visibilityState === 'visible') playNotifSound();
    };
    socket.on('notification_alert', handleAlert);
    return () => { socket.off('notification_alert', handleAlert); };
  }, [socket, refresh]);

  const markRead = useCallback(async (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, leido: 1 } : n)));
    try {
      await authFetch(`/api/notifications/${id}/leer`, { method: 'PATCH' });
    } catch { refresh(); }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, leido: 1 })));
    try {
      await authFetch('/api/notifications/leer-todo', { method: 'PATCH' });
      refresh(); // confirma con DB para que polling no revierta el estado
    } catch { refresh(); }
  }, [refresh]);

  const addNotification = useCallback(
    (n: Pick<DBNotification, 'tipo' | 'titulo' | 'mensaje'>) => {
      const local: DBNotification = {
        id: Date.now(), leido: 0, id_meeting: null, id_tarea: null,
        destinatario_correo: null, created_at: new Date().toISOString(), ...n,
      };
      setNotifications((prev) => [local, ...prev]);
    },
    [],
  );

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, refresh, markRead, markAllRead, addNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
