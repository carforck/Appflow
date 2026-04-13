"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTaskStore, TaskWithMeta } from '@/context/TaskStoreContext';
import { TareaStatus, TareaPrioridad } from '@/lib/mockData';

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatFecha(dateStr: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return dateStr; }
}

function formatTs(ts: string) {
  try {
    return new Date(ts).toLocaleString('es-ES', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return ts; }
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── Estilos ────────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<TareaStatus, { label: string; icon: string; cls: string; dot: string }> = {
  'Pendiente':  { label: 'Por Hacer',  icon: '⚪', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',     dot: 'bg-slate-400'  },
  'En Proceso': { label: 'En Progreso', icon: '🔵', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',        dot: 'bg-alzak-blue dark:bg-alzak-gold' },
  'Completada': { label: 'Hecho',       icon: '🟢', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', dot: 'bg-emerald-500' },
};

const PRIORIDAD_CFG: Record<TareaPrioridad, { cls: string; dot: string }> = {
  Alta:  { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',       dot: 'bg-red-500'     },
  Media: { cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', dot: 'bg-yellow-400' },
  Baja:  { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

const ALL_STATUSES: TareaStatus[] = ['Pendiente', 'En Proceso', 'Completada'];

// ── Props ──────────────────────────────────────────────────────────────────────
interface TaskModalProps {
  task: TaskWithMeta | null;
  onClose: () => void;
}

export default function TaskModal({ task, onClose }: TaskModalProps) {
  const { user } = useAuth();
  const { updateStatus, addNote } = useTaskStore();
  const [noteText, setNoteText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!task) return null;

  const days = daysUntil(task.fecha_entrega);
  const isUrgent = days <= 2 && task.status !== 'Completada';
  const isOverdue = days < 0 && task.status !== 'Completada';

  const handleStatusChange = (status: TareaStatus) => {
    updateStatus(task.id, status);
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNote(task.id, noteText.trim(), user?.nombre ?? 'Usuario');
    setNoteText('');
    inputRef.current?.focus();
  };

  const scfg = STATUS_CFG[task.status];
  const pcfg = PRIORIDAD_CFG[task.prioridad];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col glass rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="flex-1 min-w-0">
            {/* Proyecto + Prioridad */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-mono text-[10px] font-bold bg-alzak-blue/10 dark:bg-alzak-gold/15 text-alzak-blue dark:text-alzak-gold px-2 py-0.5 rounded-md">
                {task.id_proyecto}
              </span>
              <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${pcfg.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pcfg.dot}`} />
                {task.prioridad}
              </span>
              <span className="text-[10px] text-slate-400">#{task.id}</span>
            </div>
            {/* Título */}
            <h2 className="text-base font-bold text-slate-800 dark:text-white leading-snug">
              {task.tarea_descripcion}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 kanban-scroll">

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3">
            {/* Responsable */}
            <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-[14px] p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Responsable</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{task.responsable_nombre}</p>
              <p className="text-[11px] text-slate-400 truncate">{task.responsable_correo}</p>
            </div>

            {/* Deadline */}
            <div className={`rounded-[14px] p-3 ${isOverdue ? 'bg-red-50 dark:bg-red-900/20' : isUrgent ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-slate-50/80 dark:bg-slate-800/40'}`}>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Fecha límite</p>
              <p className={`text-sm font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {isUrgent && <span className="mr-1">⚠️</span>}
                {formatFecha(task.fecha_entrega)}
              </p>
              <p className={`text-[11px] ${isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-slate-400'}`}>
                {isOverdue
                  ? `Vencida hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`
                  : days === 0
                  ? 'Vence hoy'
                  : days === 1
                  ? 'Vence mañana'
                  : `${days} días restantes`}
              </p>
            </div>
          </div>

          {/* Estado — selector de chips */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Estado</p>
            <div className="flex gap-2 flex-wrap">
              {ALL_STATUSES.map((s) => {
                const cfg = STATUS_CFG[s];
                const active = task.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      active
                        ? `${cfg.cls} ring-2 ring-offset-1 ring-slate-300 dark:ring-slate-600 scale-105`
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{cfg.icon}</span>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resumen IA */}
          {task.resumen_meeting && (
            <div className="bg-alzak-blue/5 dark:bg-alzak-gold/5 border border-alzak-blue/10 dark:border-alzak-gold/10 rounded-[14px] p-4">
              <p className="text-[10px] font-semibold text-alzak-blue dark:text-alzak-gold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Contexto IA — de la minuta
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{task.resumen_meeting}</p>
            </div>
          )}

          {/* Notas de seguimiento */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Notas de seguimiento
              {task.notas.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full text-[9px]">
                  {task.notas.length}
                </span>
              )}
            </p>

            {task.notas.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-600 italic mb-3">Sin notas aún. Añade la primera.</p>
            )}

            <div className="space-y-2 mb-3">
              {task.notas.map((nota) => (
                <div key={nota.id} className="bg-slate-50 dark:bg-slate-800/60 rounded-[12px] px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-alzak-blue dark:text-alzak-gold">{nota.autor}</span>
                    <span className="text-[9px] text-slate-400">{formatTs(nota.timestamp)}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{nota.texto}</p>
                </div>
              ))}
            </div>

            {/* Input nueva nota */}
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddNote(); }}
                placeholder="Añadir nota de seguimiento… (Ctrl+Enter para guardar)"
                rows={2}
                className="flex-1 px-3 py-2 text-xs rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30 resize-none transition-all"
              />
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim()}
                className="px-3 py-2 rounded-[12px] bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-all self-end"
              >
                + Añadir
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${scfg.cls} px-2.5 py-1.5 rounded-full`}>
            <span>{scfg.icon}</span>
            {scfg.label}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[12px] text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
