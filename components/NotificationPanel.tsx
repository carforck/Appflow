"use client";

import { useEffect, useRef } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { MockNotification } from '@/lib/mockData';

function formatTs(ts: string) {
  try {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return 'ahora';
    if (mins < 60)  return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `hace ${hrs}h`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

const TIPO_ICON: Record<MockNotification['tipo'], string> = {
  asignacion: '📋',
  deadline:   '⚠️',
  nota:       '💬',
  sistema:    '🤖',
  completada: '✅',
};

interface Props {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: Props) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    // Delay so the triggering click doesn't immediately close
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="notif-panel w-80 max-w-[calc(100vw-2rem)] z-50 glass rounded-[20px] shadow-2xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-slate-800 dark:text-white">Notificaciones</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[10px] text-alzak-blue dark:text-alzak-gold hover:underline font-semibold"
            >
              Marcar todo leído
            </button>
          )}
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-72 overflow-y-auto kanban-scroll">
        {notifications.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-8">Sin notificaciones</p>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-slate-100/60 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors last:border-b-0 ${
                !n.leido ? 'bg-alzak-blue/[0.03] dark:bg-alzak-gold/[0.03]' : ''
              }`}
            >
              {/* Dot no-leída */}
              <div className="mt-1.5 shrink-0">
                {!n.leido
                  ? <span className="w-2 h-2 rounded-full bg-alzak-blue dark:bg-alzak-gold block" />
                  : <span className="w-2 h-2 block" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm">{TIPO_ICON[n.tipo]}</span>
                  <p className={`text-xs font-semibold truncate ${n.leido ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                    {n.titulo}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                  {n.mensaje}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{formatTs(n.timestamp)}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-200/60 dark:border-slate-700/60">
        <p className="text-center text-[10px] text-slate-400">
          {notifications.filter((n) => n.leido).length} de {notifications.length} leídas
        </p>
      </div>
    </div>
  );
}
