"use client";

import { useState, useRef, useEffect } from 'react';
import { TaskWithMeta } from '@/context/TaskStoreContext';
import { PRIORIDAD_DOT, PRIORIDAD_BADGE, formatFecha, daysUntil } from './taskBoardConfig';

interface Props {
  t:        TaskWithMeta;
  isAdmin?: boolean;
  onClick:  () => void;
  onEdit?:  (t: TaskWithMeta) => void;
  onDelete?:(t: TaskWithMeta) => void;
}

export function KanbanCard({ t, isAdmin, onClick, onEdit, onDelete }: Props) {
  const days      = daysUntil(t.fecha_entrega);
  const isUrgent  = days <= 2 && t.status !== 'Completada';
  const isOverdue = days < 0  && t.status !== 'Completada';
  const initials  = t.responsable_nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div
      onClick={onClick}
      className="relative bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group"
    >
      <div className="flex items-start gap-1.5 mb-2.5">
        <span className="shrink-0 text-[9px] font-bold text-alzak-blue/60 dark:text-alzak-gold/60 bg-alzak-blue/8 dark:bg-alzak-gold/10 px-1.5 py-0.5 rounded-full mt-0.5">
          #{t.id}
        </span>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-alzak-blue dark:group-hover:text-alzak-gold transition-colors flex-1">
          {t.tarea_descripcion}
        </p>

        {isAdmin && (
          <div ref={menuRef} className="relative shrink-0 -mt-0.5 -mr-1" onClick={(e) => e.stopPropagation()}>
            <button
              aria-label="Opciones de tarea"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-alzak-blue/50"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="4"  r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="10" cy="16" r="1.5" />
              </svg>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-7 z-30 min-w-[130px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 overflow-hidden"
              >
                <button
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onEdit?.(t); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-alzak-blue/5 dark:hover:bg-alzak-gold/10 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-alzak-blue dark:text-alzak-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modificar
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onDelete?.(t); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-2 ${PRIORIDAD_BADGE[t.prioridad]}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${PRIORIDAD_DOT[t.prioridad]}`} />
        {t.prioridad}
      </span>

      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 shrink-0 rounded-full bg-alzak-blue/15 dark:bg-alzak-gold/20 flex items-center justify-center text-[9px] font-bold text-alzak-blue dark:text-alzak-gold">
            {initials}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate min-w-0">
            {t.responsable_nombre.split(' ')[0]}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">💬</span>
          <span className={`text-[9px] font-semibold ${isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>
            {(isUrgent || isOverdue) && '⚠️ '}{formatFecha(t.fecha_entrega)}
          </span>
        </div>
      </div>
    </div>
  );
}
