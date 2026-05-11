"use client";

import { Suspense, useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTaskStore, TaskWithMeta } from '@/context/TaskStoreContext';
import { useTaskNotes, TaskNota } from '@/hooks/useTaskNotes';
import { useNotasUnread } from '@/hooks/useNotasUnread';
import { useNotasResumen, NotaResumen } from '@/hooks/useNotasResumen';
import { useSocket } from '@/hooks/useSocket';

// ── Helpers ────────────────────────────────────────────────────────────────────
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

// ── Chat list item ─────────────────────────────────────────────────────────────
interface ChatItemData extends NotaResumen { task: TaskWithMeta; unread: number }

function ChatListItem({ item, isSelected, isAdmin, onClick }: {
  item:       ChatItemData;
  isSelected: boolean;
  isAdmin:    boolean;
  onClick:    () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-slate-100/60 dark:border-slate-700/40 transition-colors ${
        isSelected ? 'bg-alzak-blue/10 dark:bg-alzak-gold/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="shrink-0 text-[9px] font-bold text-alzak-blue/60 dark:text-alzak-gold/60 bg-alzak-blue/8 dark:bg-alzak-gold/10 px-1.5 py-0.5 rounded-full">
            #{item.task.id}
          </span>
          <p className={`text-xs font-semibold line-clamp-1 leading-snug ${
            item.unread > 0 ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'
          }`}>
            {item.task.tarea_descripcion}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {item.unread > 0 && (
            <span className="flex items-center gap-0.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
              🔔 {item.unread}
            </span>
          )}
          <span className="text-[9px] text-slate-400 whitespace-nowrap">{formatTs(item.last_message_at)}</span>
        </div>
      </div>
      <p className={`text-[10px] mt-0.5 line-clamp-1 ${
        item.unread > 0 ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-400'
      }`}>
        {item.last_author ? `${item.last_author.split(' ')[0]}: ` : ''}{item.last_message}
      </p>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-[9px] text-slate-400">{item.task.nombre_proyecto}</span>
        {isAdmin && item.task.responsable_nombre && (
          <span className="text-[9px] text-slate-400">· {item.task.responsable_nombre}</span>
        )}
      </div>
    </button>
  );
}

// ── Chat panel ─────────────────────────────────────────────────────────────────
function ChatPanel({ task, userEmail, onNoteSent, clearForTask }: {
  task:         TaskWithMeta;
  userEmail:    string;
  onNoteSent:   () => void;
  clearForTask: (id: number) => Promise<void>;
}) {
  const socket = useSocket();
  const { notas, loading, sending, sendNota, bottomRef, typingUser, sendTyping } = useTaskNotes(task.id);
  const [text, setText]     = useState('');
  const textareaRef         = useRef<HTMLTextAreaElement>(null);

  // Auto-marcar leídas cuando llega una nota nueva y este chat está abierto
  useEffect(() => {
    if (!socket) return;
    const onAlert = (payload: { tipo?: string; id_tarea?: number }) => {
      if (payload?.tipo === 'nota' && payload.id_tarea === task.id) clearForTask(task.id);
    };
    socket.on('notification_alert', onAlert);
    return () => { socket.off('notification_alert', onAlert); };
  }, [socket, task.id, clearForTask]);

  const doSend = async () => {
    if (!text.trim() || sending) return;
    const ok = await sendNota(text.trim());
    if (ok) {
      setText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      onNoteSent();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    sendTyping();
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 96)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  };

  return (
    <>
      <div className="px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/60 shrink-0">
        <p className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">{task.tarea_descripcion}</p>
        <p className="text-[10px] text-slate-400">{task.nombre_proyecto} · {task.responsable_nombre}</p>
      </div>

      <div className="flex-1 overflow-y-auto kanban-scroll px-4 py-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-4">
            <span className="w-5 h-5 border-2 border-slate-200 border-t-alzak-blue dark:border-t-alzak-gold rounded-full animate-spin" />
          </div>
        )}
        {!loading && notas.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
            <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xs">Sin notas aún. Sé el primero en comentar.</p>
          </div>
        )}
        {notas.map((n: TaskNota) => {
          const isMe = n.usuario_correo === userEmail;
          return (
            <div key={n.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${n._pending || n._error ? 'opacity-70' : ''}`}>
              <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold ${
                isMe ? 'bg-alzak-blue text-white dark:bg-alzak-gold dark:text-alzak-dark' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
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

      {typingUser && (
        <div className="px-4 pb-1 flex items-center gap-2">
          <div className="flex gap-0.5 items-end">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">{typingUser} está escribiendo…</span>
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); doSend(); }}
        className="px-4 py-3 border-t border-slate-200/60 dark:border-slate-700/60 shrink-0 flex gap-2 items-end"
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Escribe una nota… (Enter para enviar, Shift+Enter nueva línea)"
          disabled={sending}
          rows={1}
          className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 disabled:opacity-50 resize-none overflow-y-auto leading-snug"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="Enviar nota"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
        >
          {sending
            ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
          }
        </button>
      </form>
    </>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────────
const ROLE_RANK: Record<string, number> = { superadmin: 3, admin: 2, user: 1 };

function NotasContent() {
  const searchParams = useSearchParams();
  const openId       = searchParams.get('open');

  const { user }  = useAuth();
  const { tasks, refresh: refreshTasks } = useTaskStore();
  const isAdmin   = ROLE_RANK[user?.role ?? 'user'] >= 2;

  const { unreadByTask, clearForTask, setActiveTaskId }      = useNotasUnread();
  const { resumen, loading: loadingResumen, refreshResumen } = useNotasResumen();

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Guard: evitar loop infinito si el store no devuelve la tarea (e.g. >500 tasks)
  const refreshingRef = useRef(false);

  // Si resumen tiene tareas que aún no están en el store (race condition al crear tarea nueva),
  // forzar refresh para que chatList pueda renderizarlas — una sola vez por ausencia
  useEffect(() => {
    if (refreshingRef.current) return;
    const taskIds = new Set(tasks.map((t) => t.id));
    if (resumen.some((r) => !taskIds.has(r.id_tarea))) {
      refreshingRef.current = true;
      refreshTasks().finally(() => { refreshingRef.current = false; });
    }
  }, [resumen, tasks, refreshTasks]);

  const handleSelectTask = (id: number) => {
    setSelectedTaskId(id);
    setActiveTaskId(id);
    if (unreadByTask[id]) clearForTask(id);
  };

  const chatList = useMemo(() => {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    return resumen
      .map((r) => ({ ...r, task: taskMap.get(r.id_tarea), unread: unreadByTask[r.id_tarea] ?? 0 }))
      .filter((item): item is ChatItemData => !!item.task)
      .sort((a, b) => {
        if (a.unread > 0 && b.unread === 0) return -1;
        if (a.unread === 0 && b.unread > 0) return 1;
        return b.last_message_at.localeCompare(a.last_message_at);
      });
  }, [resumen, tasks, unreadByTask]);

  // Auto-abrir tarea desde URL param ?open=id (click en notificación toast)
  const lastOpenedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!openId || openId === lastOpenedRef.current) return;
    const taskId = parseInt(openId, 10);
    if (chatList.some((c) => c.id_tarea === taskId)) {
      lastOpenedRef.current = openId;
      handleSelectTask(taskId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, chatList]);

  // Limpiar chat activo al abandonar la página
  useEffect(() => {
    return () => { setActiveTaskId(null); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const unreadItems  = chatList.filter((c) => c.unread > 0);
  const historyItems = chatList.filter((c) => c.unread === 0);
  // Contar solo desde los items visibles — evita badges fantasma por tasks fuera del resumen
  const totalUnread  = unreadItems.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Notas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isAdmin ? 'Chats de todas las tareas con actividad' : 'Chats de tus tareas asignadas'}
          </p>
        </div>
        {totalUnread > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
            {totalUnread} sin leer
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)] min-h-[400px]">

        {/* Lista de chats */}
        <div className="glass rounded-[20px] border border-slate-200/60 dark:border-slate-700/60 flex flex-col overflow-hidden" style={{ background: 'var(--sidebar-bg)' }}>
          <div className="px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/60 shrink-0 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wide">Chats activos</p>
            {!loadingResumen && <span className="text-[10px] text-slate-400">{chatList.length}</span>}
          </div>
          <div className="overflow-y-auto kanban-scroll flex-1">
            {loadingResumen ? (
              <div className="flex justify-center py-8">
                <span className="w-5 h-5 border-2 border-slate-200 border-t-alzak-blue rounded-full animate-spin" />
              </div>
            ) : chatList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 space-y-2">
                <svg className="w-10 h-10 opacity-20 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-xs text-slate-400 text-center px-4">
                  Sin chats iniciados.<br />Las notas de tareas aparecerán aquí.
                </p>
              </div>
            ) : (
              <>
                {unreadItems.length > 0 && (
                  <p className="px-4 pt-3 pb-1 text-[9px] font-bold text-red-400 uppercase tracking-wider">Sin leer</p>
                )}
                {unreadItems.map((item) => (
                  <ChatListItem key={item.id_tarea} item={item} isSelected={selectedTaskId === item.id_tarea} isAdmin={isAdmin} onClick={() => handleSelectTask(item.id_tarea)} />
                ))}
                {unreadItems.length > 0 && historyItems.length > 0 && (
                  <p className="px-4 pt-3 pb-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 dark:border-slate-700/40 mt-1">Historial</p>
                )}
                {historyItems.map((item) => (
                  <ChatListItem key={item.id_tarea} item={item} isSelected={selectedTaskId === item.id_tarea} isAdmin={isAdmin} onClick={() => handleSelectTask(item.id_tarea)} />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Panel de chat */}
        <div className="lg:col-span-2 glass rounded-[20px] border border-slate-200/60 dark:border-slate-700/60 flex flex-col overflow-hidden" style={{ background: 'var(--sidebar-bg)' }}>
          {selectedTask && user ? (
            <ChatPanel task={selectedTask} userEmail={user.email} onNoteSent={refreshResumen} clearForTask={clearForTask} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
              <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm font-medium">Selecciona un chat para ver las notas</p>
              {chatList.length === 0 && !loadingResumen && (
                <p className="text-xs text-center px-8 text-slate-400">
                  Inicia una conversación desde el detalle de cualquier tarea.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotasPage() {
  return (
    <Suspense fallback={null}>
      <NotasContent />
    </Suspense>
  );
}
