"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTaskStore, TaskWithMeta } from '@/context/TaskStoreContext';
import { useTaskNotes } from '@/hooks/useTaskNotes';
import { useNotasUnread } from '@/hooks/useNotasUnread';
import { authFetch } from '@/lib/api';
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

function formatChatTs(ts: string) {
  try {
    const d    = new Date(ts);
    const now  = new Date();
    const same = d.toDateString() === now.toDateString();
    return same
      ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return ts; }
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0] ?? '').join('').toUpperCase();
}

// ── Config ─────────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<TareaStatus, { label: string; icon: string; cls: string }> = {
  'Pendiente':  { label: 'Por Hacer',   icon: '⚪', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300' },
  'En Proceso': { label: 'En Progreso', icon: '🔵', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  'Completada': { label: 'Hecho',       icon: '🟢', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

const PRIORIDAD_CFG: Record<TareaPrioridad, { cls: string; activeCls: string; dot: string }> = {
  Alta:  { cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500', activeCls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',                dot: 'bg-red-500'     },
  Media: { cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500', activeCls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',    dot: 'bg-yellow-400' },
  Baja:  { cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500', activeCls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

const ALL_STATUSES:    TareaStatus[]    = ['Pendiente', 'En Proceso', 'Completada'];
const ALL_PRIORIDADES: TareaPrioridad[] = ['Alta', 'Media', 'Baja'];

interface TaskModalProps { task: TaskWithMeta | null; onClose: () => void; focusChat?: boolean }

export default function TaskModal({ task, onClose, focusChat }: TaskModalProps) {
  const { user }                        = useAuth();
  const { updateStatus, refresh }       = useTaskStore();
  const { notas, loading: notasLoading, sending, sendNota, bottomRef, typingUser, sendTyping } = useTaskNotes(task?.id ?? null);
  const { clearForTask }                = useNotasUnread();
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const [noteText,    setNoteText]    = useState('');
  const [editFecha,   setEditFecha]   = useState('');
  const [savingField, setSavingField] = useState<'prioridad' | 'fecha' | null>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const chatRef     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (task) setEditFecha(task.fecha_entrega ?? '');
  }, [task?.id, task?.fecha_entrega]);

  // Marcar notas de esta tarea como leídas al abrir el modal
  useEffect(() => {
    if (task?.id) clearForTask(task.id);
  // Solo al montar (task.id cambia) — clearForTask es estable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  // Scroll al chat cuando la notificación es de tipo 'nota'
  useEffect(() => {
    if (!focusChat || !chatRef.current) return;
    const t = setTimeout(() => {
      chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
    return () => clearTimeout(t);
  }, [focusChat, task?.id]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!task) return null;

  const days     = daysUntil(task.fecha_entrega);
  const isUrgent  = days <= 2 && task.status !== 'Completada';
  const isOverdue = days < 0  && task.status !== 'Completada';
  const scfg = STATUS_CFG[task.status];
  const pcfg = PRIORIDAD_CFG[task.prioridad];

  // ── Acciones ────────────────────────────────────────────────────────────────
  const handleStatusChange = (s: TareaStatus) => updateStatus(task.id, s);

  const handlePrioridad = async (p: TareaPrioridad) => {
    if (!isAdmin || p === task.prioridad) return;
    setSavingField('prioridad');
    try {
      await authFetch(`/tareas/${task.id}`, { method: 'PATCH', body: JSON.stringify({ prioridad: p }) });
      await refresh();
    } finally { setSavingField(null); }
  };

  const handleFechaBlur = async () => {
    if (!isAdmin || !editFecha || editFecha === task.fecha_entrega) return;
    setSavingField('fecha');
    try {
      await authFetch(`/tareas/${task.id}`, { method: 'PATCH', body: JSON.stringify({ fecha_entrega: editFecha }) });
      await refresh();
    } finally { setSavingField(null); }
  };

  const handleSendNote = async () => {
    if (!noteText.trim() || sending) return;
    const ok = await sendNota(noteText.trim());
    if (ok) {
      setNoteText('');
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[90vh] flex flex-col glass rounded-t-[24px] sm:rounded-[24px] shadow-2xl overflow-hidden"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-mono text-[10px] font-bold bg-alzak-blue/10 dark:bg-alzak-gold/15 text-alzak-blue dark:text-alzak-gold px-2 py-0.5 rounded-md">
                {task.id_proyecto}
              </span>
              {task.nombre_proyecto && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                  {task.nombre_proyecto}
                </span>
              )}
              <span className="text-[10px] text-slate-400 ml-auto">#{task.id}</span>
            </div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white leading-snug">
              {task.tarea_descripcion}
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-alzak-blue/50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Cuerpo scrollable ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 kanban-scroll">

          {/* Responsable + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-[14px] p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Responsable</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{task.responsable_nombre}</p>
              <p className="text-[10px] text-slate-400 truncate">{task.responsable_correo}</p>
            </div>

            <div className={`rounded-[14px] p-3 ${isOverdue ? 'bg-red-50 dark:bg-red-900/20' : isUrgent ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-slate-50/80 dark:bg-slate-800/40'}`}>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Fecha límite
                {savingField === 'fecha' && <span className="w-2.5 h-2.5 border-2 border-slate-300 border-t-alzak-blue rounded-full animate-spin" />}
              </p>
              {isAdmin ? (
                <input
                  type="date"
                  value={editFecha}
                  onChange={(e) => setEditFecha(e.target.value)}
                  onBlur={handleFechaBlur}
                  className="w-full text-xs font-semibold bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-alzak-blue dark:focus:border-alzak-gold pb-0.5"
                />
              ) : (
                <p className={`text-sm font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                  {isUrgent && <span className="mr-1">⚠️</span>}
                  {formatFecha(task.fecha_entrega)}
                </p>
              )}
              {isAdmin && !isNaN(daysUntil(editFecha)) && (
                <p className={`text-[10px] mt-0.5 ${isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-slate-400'}`}>
                  {isOverdue
                    ? `Vencida hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`
                    : days === 0 ? 'Vence hoy'
                    : days === 1 ? 'Vence mañana'
                    : `${days} días restantes`}
                </p>
              )}
            </div>
          </div>

          {/* Prioridad */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              Prioridad
              {savingField === 'prioridad' && <span className="w-2.5 h-2.5 border-2 border-slate-300 border-t-alzak-blue rounded-full animate-spin" />}
              {!isAdmin && <span className="ml-1 text-[9px] text-slate-300 dark:text-slate-600 font-normal">(solo lectura)</span>}
            </p>
            {isAdmin ? (
              <div className="flex gap-2 flex-wrap">
                {ALL_PRIORIDADES.map((p) => {
                  const cfg    = PRIORIDAD_CFG[p];
                  const active = task.prioridad === p;
                  return (
                    <button
                      key={p}
                      onClick={() => handlePrioridad(p)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        active
                          ? `${cfg.activeCls} ring-2 ring-offset-1 ring-slate-300 dark:ring-slate-600 scale-105`
                          : `${cfg.cls} hover:opacity-80`
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      {p}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${pcfg.activeCls}`}>
                <span className={`w-2 h-2 rounded-full ${pcfg.dot}`} />
                {task.prioridad}
              </span>
            )}
          </div>

          {/* Estado */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Estado</p>
            <div className="flex gap-2 flex-wrap">
              {ALL_STATUSES.map((s) => {
                const cfg    = STATUS_CFG[s];
                const active = task.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all min-h-[36px] ${
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


          {/* ── Chat de notas ── */}
          <div ref={chatRef}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                💬 Notas de seguimiento
                {notas.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-alzak-blue/10 dark:bg-alzak-gold/10 text-alzak-blue dark:text-alzak-gold rounded-full text-[9px] font-bold">
                    {notas.length}
                  </span>
                )}
              </p>
              {notasLoading && (
                <span className="w-3 h-3 border-2 border-slate-200 border-t-alzak-blue dark:border-t-alzak-gold rounded-full animate-spin" />
              )}
            </div>

            {/* Hilo de conversación */}
            <div className="space-y-3 mb-3 max-h-64 overflow-y-auto kanban-scroll px-1">
              {notas.length === 0 && !notasLoading && (
                <p className="text-xs text-slate-400 dark:text-slate-600 italic text-center py-4">
                  Sin notas aún. Sé el primero en comentar.
                </p>
              )}

              {notas.map((nota) => {
                const isOwn = nota.usuario_correo === user?.email;
                return (
                  <div
                    key={nota.id}
                    className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${nota._pending || nota._error ? 'opacity-70' : ''}`}
                  >
                    {/* Avatar */}
                    <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      isOwn
                        ? 'bg-alzak-blue text-white dark:bg-alzak-gold dark:text-alzak-dark'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {getInitials(nota.usuario_nombre)}
                    </div>

                    {/* Burbuja */}
                    <div className={`max-w-[75%] space-y-0.5 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`rounded-[14px] px-3 py-2 text-xs leading-relaxed ${
                        nota._error
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-tr-sm'
                          : isOwn
                            ? 'bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark rounded-tr-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-sm'
                      }`}>
                        {nota.mensaje}
                      </div>
                      <div className={`flex items-center gap-1.5 px-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                          {nota.usuario_nombre.split(' ')[0]}
                        </span>
                        {nota._pending ? (
                          <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                            <span className="w-2 h-2 border border-slate-300 border-t-slate-500 rounded-full animate-spin inline-block" />
                            enviando
                          </span>
                        ) : nota._error ? (
                          <span className="text-[9px] text-red-400 font-semibold">⚠ Error</span>
                        ) : (
                          <span className="text-[9px] text-slate-300 dark:text-slate-600">
                            {formatChatTs(nota.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Anchor for auto-scroll */}
              <div ref={bottomRef} />
            </div>

            {/* Typing indicator */}
            {typingUser && (
              <div className="flex items-center gap-2 px-1 mb-1">
                <div className="flex gap-0.5 items-end">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                  {typingUser} está escribiendo…
                </span>
              </div>
            )}

            {/* Input de mensaje */}
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={noteText}
                onChange={(e) => { setNoteText(e.target.value); sendTyping(); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSendNote();
                  }
                }}
                placeholder="Escribe un mensaje… (Ctrl+Enter para enviar)"
                rows={2}
                disabled={sending}
                className="flex-1 px-3 py-2 text-xs rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30 resize-none transition-all disabled:opacity-50"
              />
              <button
                onClick={handleSendNote}
                disabled={!noteText.trim() || sending}
                aria-label="Enviar nota"
                className="px-3 py-2 rounded-[12px] bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark hover:opacity-90 disabled:opacity-40 transition-all self-end min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                {sending ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${scfg.cls} px-2.5 py-1.5 rounded-full`}>
            <span>{scfg.icon}</span>
            {scfg.label}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-[12px] text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors min-h-[44px] min-w-[80px]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
