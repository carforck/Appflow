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

// Elimina el emoji inicial del título si ya lo mostramos via TIPO_ICON
const LEADING_EMOJIS = ['💬', '📋', '🔍', '🤖', '⚠️', '⚙️', '✅', '🔔'];
function cleanTitulo(titulo: string): string {
  for (const e of LEADING_EMOJIS) {
    if (titulo.startsWith(e)) return titulo.slice(e.length).trimStart();
  }
  return titulo;
}

function resolveTarget(n: DBNotification): string | null {
  if (n.id_tarea) {
    const base = `/tareas?open=${n.id_tarea}`;
    return n.tipo === 'nota' ? `${base}&focus=notas` : base;
  }
  if (n.id_meeting) return `/procesador`;
  return null;
}

interface Props { onClose: () => void }

export default function NotificationPanel({ onClose }: Props) {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const router   = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
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
    const target = resolveTarget(n);
    markRead(n.id);   // optimistic — no bloquea
    onClose();         // cierra panel
    if (target) router.push(target);  // navega DESPUÉS de cerrar
  };

  const isUnread = (n: DBNotification) => n.leido === 0;

  // Vista por defecto: solo no leídas. Toggle para ver historial.
  const visible   = showAll ? notifications : notifications.filter(isUnread);
  const readCount = notifications.filter((n) => n.leido === 1).length;

  // Skeleton solo en carga inicial (sin datos aún)
  const showSkeleton = loading && notifications.length === 0;

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
              {unreadCount > 99 ? '99+' : unreadCount}
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
        {showSkeleton ? (
          <div className="px-4 py-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-xl">✅</div>
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Todo al día</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Sin notificaciones pendientes</p>
            </div>
          </div>
        ) : (
          visible.map((n) => {
            const target = resolveTarget(n);
            const unread = isUnread(n);
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
                {/* Indicador sin leer */}
                <div className="mt-1.5 shrink-0">
                  {unread
                    ? <span className="w-2 h-2 rounded-full bg-alzak-blue dark:bg-alzak-gold block" />
                    : <span className="w-2 h-2 block" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm leading-none">{TIPO_ICON[n.tipo] ?? '🔔'}</span>
                    <p className={`text-xs font-semibold truncate flex-1 ${
                      unread ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {cleanTitulo(n.titulo)}
                    </p>
                    {target && unread && (
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

      {/* Footer */}
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
