"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications, DBNotification } from '@/context/NotificationContext';

function formatTs(ts: string) {
  try {
    const d    = new Date(ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `hace ${hrs}h`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

const TIPO_ICON: Record<string, string> = {
  asignacion: '📋',
  auditoria:  '🔍',
  ingesta:    '🤖',
  deadline:   '⚠️',
  nota:       '💬',
  sistema:    '⚙️',
  completada: '✅',
};

function resolveTarget(n: DBNotification): string | null {
  if (n.id_tarea)   return `/tareas?open=${n.id_tarea}`;
  if (n.id_meeting) return `/procesador`;
  return null;
}

interface Props { onClose: () => void }

export default function NotificationPanel({ onClose }: Props) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const router      = useRouter();
  const panelRef    = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [onClose]);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleClick = (n: DBNotification) => {
    // Siempre marcar como leída y cerrar el panel primero
    markRead(n.id);
    onClose();
    // Luego navegar si hay destino
    const target = resolveTarget(n);
    if (target) router.push(target);
  };

  const isUnread = (n: DBNotification) => n.leido === 0;

  // Vista por defecto: solo no leídas. Toggle para ver historial.
  const visible   = showAll ? notifications : notifications.filter(isUnread);
  const readCount = notifications.filter((n) => n.leido === 1).length;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Panel de notificaciones"
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
            aria-label="Cerrar notificaciones"
            className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="max-h-72 overflow-y-auto kanban-scroll">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
            <span className="text-2xl">✅</span>
            <p className="text-xs">Todo al día</p>
          </div>
        ) : (
          visible.map((n) => {
            const hasLink = !!resolveTarget(n);
            const unread  = isUnread(n);
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-slate-100/60 dark:border-slate-700/40 transition-colors last:border-b-0 ${
                  unread
                    ? 'bg-alzak-blue/[0.03] dark:bg-alzak-gold/[0.03] hover:bg-alzak-blue/[0.07] dark:hover:bg-alzak-gold/[0.07]'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-60'
                }`}
              >
                {/* Dot */}
                <div className="mt-1.5 shrink-0">
                  {unread
                    ? <span className="w-2 h-2 rounded-full bg-alzak-blue dark:bg-alzak-gold block" />
                    : <span className="w-2 h-2 block" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm">{TIPO_ICON[n.tipo] ?? '🔔'}</span>
                    <p className={`text-xs font-semibold truncate flex-1 ${
                      unread ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {n.titulo}
                    </p>
                    {hasLink && unread && (
                      <svg className="w-2.5 h-2.5 text-alzak-blue dark:text-alzak-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                  {n.mensaje && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                      {n.mensaje}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    {formatTs(n.created_at)}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer — historial toggle */}
      <div className="px-4 py-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
        <p className="text-[10px] text-slate-400">
          {unreadCount} sin leer · {readCount} leídas
        </p>
        {readCount > 0 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-[10px] text-alzak-blue dark:text-alzak-gold hover:underline font-semibold"
          >
            {showAll ? 'Ocultar leídas' : `Ver historial (${readCount})`}
          </button>
        )}
      </div>
    </div>
  );
}
