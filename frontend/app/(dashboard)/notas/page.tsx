"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTaskStore } from '@/context/TaskStoreContext';
import type { TaskNote } from '@/context/TaskStoreContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTs(ts: string) {
  try {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `hace ${hrs}h`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

interface NoteWithContext extends TaskNote {
  taskId: number;
  taskDesc: string;
  projectName: string;
}

const ROLE_RANK: Record<string, number> = { superadmin: 3, admin: 2, user: 1 };

export default function NotasPage() {
  const { user } = useAuth();
  const { tasks, addNote } = useTaskStore();
  const isAdmin = ROLE_RANK[user?.role ?? 'user'] >= 2;

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [replyText, setReplyText]           = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Flatten all notes with task context
  const allNotes: NoteWithContext[] = tasks
    .flatMap((t) =>
      t.notas.map((n) => ({
        ...n,
        taskId:      t.id,
        taskDesc:    t.tarea_descripcion,
        projectName: t.nombre_proyecto,
      })),
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // My tasks (for user role — filter to their tasks)
  const myTasks = isAdmin
    ? tasks.filter((t) => t.notas.length > 0 || true) // admin sees all
    : tasks.filter((t) => t.responsable_correo === user?.email);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const selectedNotes = selectedTask?.notas ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedNotes.length]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !selectedTaskId || !user) return;
    addNote(selectedTaskId, replyText.trim(), user.nombre);
    setReplyText('');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Notas</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {isAdmin ? 'Panel centralizado de notas de todas las tareas' : 'Notas en tus tareas asignadas'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)] min-h-[400px]">

        {/* ── Panel izquierdo: lista de tareas con notas ── */}
        <div className="glass rounded-[20px] border border-slate-200/60 dark:border-slate-700/60 flex flex-col overflow-hidden" style={{ background: 'var(--sidebar-bg)' }}>
          <div className="px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/60 shrink-0">
            <p className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wide">
              Tareas ({myTasks.length})
            </p>
          </div>
          <div className="overflow-y-auto kanban-scroll flex-1">
            {myTasks.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">Sin tareas</p>
            ) : (
              myTasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTaskId(t.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100/60 dark:border-slate-700/40 transition-colors ${
                    selectedTaskId === t.id
                      ? 'bg-alzak-blue/10 dark:bg-alzak-gold/10'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-2 leading-snug">
                    {t.tarea_descripcion}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400">{t.nombre_proyecto}</span>
                    {t.notas.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-alzak-blue/20 dark:bg-alzak-gold/20 text-alzak-blue dark:text-alzak-gold text-[9px] font-bold rounded-full">
                        {t.notas.length}
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{t.responsable_nombre}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Panel derecho: chat de notas ── */}
        <div className="lg:col-span-2 glass rounded-[20px] border border-slate-200/60 dark:border-slate-700/60 flex flex-col overflow-hidden" style={{ background: 'var(--sidebar-bg)' }}>
          {selectedTask ? (
            <>
              {/* Header del chat */}
              <div className="px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/60 shrink-0">
                <p className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">{selectedTask.tarea_descripcion}</p>
                <p className="text-[10px] text-slate-400">{selectedTask.nombre_proyecto} · {selectedTask.responsable_nombre}</p>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto kanban-scroll px-4 py-4 space-y-3">
                {selectedNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-xs">Sin notas aún. Sé el primero en comentar.</p>
                  </div>
                ) : (
                  selectedNotes.map((n) => {
                    const isMe = n.autor === user?.nombre;
                    return (
                      <div key={n.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                          {!isMe && (
                            <p className="text-[10px] text-slate-400 mb-0.5 px-1">{n.autor}</p>
                          )}
                          <div className={`px-3 py-2 rounded-[14px] text-xs leading-snug ${
                            isMe
                              ? 'bg-alzak-blue text-white rounded-br-[4px]'
                              : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 rounded-bl-[4px]'
                          }`}>
                            {n.texto}
                          </div>
                          <p className="text-[9px] text-slate-400 mt-0.5 px-1">{formatTs(n.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input de respuesta */}
              <form onSubmit={handleSend} className="px-4 py-3 border-t border-slate-200/60 dark:border-slate-700/60 shrink-0 flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escribe una nota..."
                  className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="px-4 py-2 rounded-xl bg-alzak-blue text-white text-sm font-semibold hover:bg-alzak-blue/90 disabled:opacity-40 transition-all"
                >
                  Enviar
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
              <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm font-medium">Selecciona una tarea para ver sus notas</p>
            </div>
          )}
        </div>
      </div>

      {/* Resumen global (solo admin) */}
      {isAdmin && allNotes.length > 0 && (
        <div className="glass rounded-[20px] border border-slate-200/60 dark:border-slate-700/60 p-4" style={{ background: 'var(--sidebar-bg)' }}>
          <p className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wide mb-3">
            Actividad reciente ({allNotes.length} notas)
          </p>
          <div className="space-y-2">
            {allNotes.slice(0, 5).map((n) => (
              <button
                key={`${n.taskId}-${n.id}`}
                onClick={() => setSelectedTaskId(n.taskId)}
                className="w-full text-left flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="w-6 h-6 shrink-0 rounded-full bg-alzak-blue/20 dark:bg-alzak-gold/20 text-alzak-blue dark:text-alzak-gold text-[9px] font-bold flex items-center justify-center mt-0.5">
                  {n.autor.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 dark:text-slate-200 line-clamp-1">
                    <span className="font-semibold">{n.autor}</span> en <span className="text-alzak-blue dark:text-alzak-gold">{n.projectName}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{n.texto}</p>
                </div>
                <p className="text-[10px] text-slate-400 shrink-0">{formatTs(n.timestamp)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
