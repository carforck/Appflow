"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTaskStore, TaskWithMeta } from '@/context/TaskStoreContext';
import { useTaskNotes, TaskNota } from '@/hooks/useTaskNotes';
import { useNotasUnread } from '@/hooks/useNotasUnread';

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0] ?? '').join('').toUpperCase();
}

// ── Chat panel (hook lives here so taskId can change) ─────────────────────────
function ChatPanel({ task, userEmail }: { task: TaskWithMeta; userEmail: string }) {
  const { notas, loading, sending, sendNota, bottomRef, typingUser, sendTyping } = useTaskNotes(task.id);
  const [text, setText] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    const ok = await sendNota(text.trim());
    if (ok) setText('');
  };

  return (
    <>
      {/* Header del chat */}
      <div className="px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/60 shrink-0">
        <p className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">{task.tarea_descripcion}</p>
        <p className="text-[10px] text-slate-400">{task.nombre_proyecto} · {task.responsable_nombre}</p>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto kanban-scroll px-4 py-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-4">
            <span className="w-5 h-5 border-2 border-slate-200 border-t-alzak-blue dark:border-t-alzak-gold rounded-full animate-spin" />
          </div>
        )}
        {!loading && notas.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <svg className="w-10 h-10 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xs">Sin notas aún. Sé el primero en comentar.</p>
          </div>
        )}
        {notas.map((n: TaskNota) => {
          const isMe = n.usuario_correo === userEmail;
          return (
            <div
              key={n.id}
              className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${n._pending || n._error ? 'opacity-70' : ''}`}
            >
              <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold ${
                isMe
                  ? 'bg-alzak-blue text-white dark:bg-alzak-gold dark:text-alzak-dark'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {getInitials(n.usuario_nombre)}
              </div>
              <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`px-3 py-2 rounded-[14px] text-xs leading-snug ${
                  n._error
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-tr-sm'
                    : isMe
                      ? 'bg-alzak-blue text-white dark:bg-alzak-gold dark:text-alzak-dark rounded-tr-sm'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 rounded-tl-sm'
                }`}>
                  {n.mensaje}
                </div>
                <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-[9px] font-semibold text-slate-400">{n.usuario_nombre.split(' ')[0]}</span>
                  {n._pending ? (
                    <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                      <span className="w-2 h-2 border border-slate-300 border-t-slate-500 rounded-full animate-spin inline-block" />
                      enviando
                    </span>
                  ) : n._error ? (
                    <span className="text-[9px] text-red-400 font-semibold">⚠ Error</span>
                  ) : (
                    <span className="text-[9px] text-slate-300 dark:text-slate-600">{formatTs(n.created_at)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {typingUser && (
        <div className="px-4 pb-1 flex items-center gap-2">
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

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 py-3 border-t border-slate-200/60 dark:border-slate-700/60 shrink-0 flex gap-2 items-center">
        <input
          type="text"
          value={text}
          onChange={(e) => { setText(e.target.value); sendTyping(); }}
          placeholder="Escribe una nota…"
          disabled={sending}
          className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="Enviar nota"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark hover:opacity-90 disabled:opacity-40 transition-all"
        >
          {sending ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          )}
        </button>
      </form>
    </>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const ROLE_RANK: Record<string, number> = { superadmin: 3, admin: 2, user: 1 };

export default function NotasPage() {
  const { user }  = useAuth();
  const { tasks } = useTaskStore();
  const isAdmin   = ROLE_RANK[user?.role ?? 'user'] >= 2;
  const { unreadByTask, clearForTask } = useNotasUnread();

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const handleSelectTask = (id: number) => {
    setSelectedTaskId(id);
    if (unreadByTask[id]) clearForTask(id);
  };

  const myTasks = isAdmin
    ? tasks
    : tasks.filter((t) => t.responsable_correo === user?.email);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Notas</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {isAdmin ? 'Panel centralizado de notas de todas las tareas' : 'Notas en tus tareas asignadas'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)] min-h-[400px]">

        {/* Panel izquierdo — lista de tareas */}
        <div
          className="glass rounded-[20px] border border-slate-200/60 dark:border-slate-700/60 flex flex-col overflow-hidden"
          style={{ background: 'var(--sidebar-bg)' }}
        >
          <div className="px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/60 shrink-0">
            <p className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wide">
              Tareas ({myTasks.length})
            </p>
          </div>
          <div className="overflow-y-auto kanban-scroll flex-1">
            {myTasks.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">Sin tareas asignadas</p>
            ) : (
              myTasks.map((t) => {
                const unread = unreadByTask[t.id] ?? 0;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTask(t.id)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100/60 dark:border-slate-700/40 transition-colors ${
                      selectedTaskId === t.id
                        ? 'bg-alzak-blue/10 dark:bg-alzak-gold/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-2 leading-snug flex-1">
                        {t.tarea_descripcion}
                      </p>
                      {unread > 0 && (
                        <span className="shrink-0 flex items-center gap-0.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                          🔔 {unread}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400">{t.nombre_proyecto}</span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-alzak-blue/10 dark:bg-alzak-gold/10 text-alzak-blue dark:text-alzak-gold">
                        💬
                      </span>
                    </div>
                    {isAdmin && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{t.responsable_nombre}</p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Panel derecho — chat */}
        <div
          className="lg:col-span-2 glass rounded-[20px] border border-slate-200/60 dark:border-slate-700/60 flex flex-col overflow-hidden"
          style={{ background: 'var(--sidebar-bg)' }}
        >
          {selectedTask && user ? (
            <ChatPanel task={selectedTask} userEmail={user.email} />
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
    </div>
  );
}
