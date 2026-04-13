"use client";

import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTaskStore, TaskWithMeta } from '@/context/TaskStoreContext';
import { MOCK_PROJECTS, TareaStatus, TareaPrioridad } from '@/lib/mockData';
import TaskModal from '@/components/TaskModal';
import NewTaskModal from '@/components/NewTaskModal';

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatFecha(dateStr: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } catch { return dateStr; }
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function groupByDate(tasks: TaskWithMeta[]) {
  const map = new Map<string, TaskWithMeta[]>();
  const sorted = [...tasks].sort((a, b) => {
    const da = a.completedAt ?? a.fecha_entrega;
    const db = b.completedAt ?? b.fecha_entrega;
    return new Date(db).getTime() - new Date(da).getTime();
  });
  for (const t of sorted) {
    const raw = t.completedAt ?? t.fecha_entrega;
    const key = raw.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return map;
}

function formatDateGroup(dateStr: string) {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

// ── Estilos por estado ─────────────────────────────────────────────────────────
const STATUS_CFG: Record<TareaStatus, { label: string; icon: string; headerCls: string; dotCls: string; countCls: string }> = {
  'Pendiente':  {
    label: 'Por Hacer', icon: '⚪',
    headerCls: 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60',
    dotCls:    'bg-slate-400',
    countCls:  'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  },
  'En Proceso': {
    label: 'En Progreso', icon: '🔵',
    headerCls: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40',
    dotCls:    'bg-alzak-blue dark:bg-alzak-gold',
    countCls:  'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  'Completada': {
    label: 'Hecho', icon: '🟢',
    headerCls: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40',
    dotCls:    'bg-emerald-500',
    countCls:  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  },
};

const PRIORIDAD_DOT: Record<TareaPrioridad, string> = {
  Alta:  'bg-red-500',
  Media: 'bg-yellow-400',
  Baja:  'bg-emerald-500',
};

const PRIORIDAD_BADGE: Record<TareaPrioridad, string> = {
  Alta:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Media: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Baja:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const ALL_STATUSES: TareaStatus[] = ['Pendiente', 'En Proceso', 'Completada'];

// ── Status Chip inline en tarjeta ─────────────────────────────────────────────
function StatusChip({ task }: { task: TaskWithMeta }) {
  const { updateStatus } = useTaskStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="text-[9px] font-bold px-2 py-1 rounded-full bg-white/70 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-colors border border-slate-200/60 dark:border-slate-600/60"
        title="Cambiar estado"
      >
        {STATUS_CFG[task.status].icon}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-7 z-20 bg-white dark:bg-slate-800 rounded-[12px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden min-w-[130px]">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  updateStatus(task.id, s);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors ${
                  task.status === s ? 'font-bold text-alzak-blue dark:text-alzak-gold' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <span>{STATUS_CFG[s].icon}</span>
                {STATUS_CFG[s].label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Tarjeta Kanban ─────────────────────────────────────────────────────────────
function KanbanCard({ t, onClick }: { t: TaskWithMeta; onClick: () => void }) {
  const days  = daysUntil(t.fecha_entrega);
  const isUrgent  = days <= 2 && t.status !== 'Completada';
  const isOverdue = days < 0 && t.status !== 'Completada';
  const initials  = t.responsable_nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group"
    >
      {/* Descripción */}
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-100 leading-snug line-clamp-2 mb-2.5 group-hover:text-alzak-blue dark:group-hover:text-alzak-gold transition-colors">
        {t.tarea_descripcion}
      </p>

      {/* Prioridad badge */}
      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-2 ${PRIORIDAD_BADGE[t.prioridad]}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${PRIORIDAD_DOT[t.prioridad]}`} />
        {t.prioridad}
      </span>

      {/* Footer */}
      <div className="flex items-center justify-between gap-1.5">
        {/* Responsable */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 shrink-0 rounded-full bg-alzak-blue/15 dark:bg-alzak-gold/20 flex items-center justify-center text-[9px] font-bold text-alzak-blue dark:text-alzak-gold">
            {initials}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[70px]">
            {t.responsable_nombre.split(' ')[0]}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Notas badge */}
          {t.notas.length > 0 && (
            <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">
              💬{t.notas.length}
            </span>
          )}

          {/* Deadline */}
          <span className={`text-[9px] font-semibold ${isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>
            {(isUrgent || isOverdue) && '⚠️ '}{formatFecha(t.fecha_entrega)}
          </span>

          {/* Status chip */}
          <StatusChip task={t} />
        </div>
      </div>
    </div>
  );
}

// ── Column Header ──────────────────────────────────────────────────────────────
function ColumnHeader({ status, count }: { status: TareaStatus; count: number }) {
  const cfg = STATUS_CFG[status];
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${cfg.headerCls}`}>
      <span className="text-sm">{cfg.icon}</span>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-100">{cfg.label}</span>
      <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.countCls}`}>
        {count}
      </span>
    </div>
  );
}

// ── Swimlane Header ────────────────────────────────────────────────────────────
function SwimLaneHeader({ proyectoId, count }: { proyectoId: string; count: number }) {
  return (
    <div className="col-span-3 flex items-center gap-2.5 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60">
      <span className="font-mono text-[10px] font-bold bg-alzak-blue/10 dark:bg-alzak-gold/15 text-alzak-blue dark:text-alzak-gold px-2 py-0.5 rounded-md">
        {proyectoId}
      </span>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
        {MOCK_PROJECTS[proyectoId] ?? proyectoId}
      </span>
      <span className="ml-auto text-[10px] text-slate-400 shrink-0">{count} tareas</span>
    </div>
  );
}

// ── Kanban Admin con Swimlanes ─────────────────────────────────────────────────
function KanbanAdminView({ tasks, onCardClick }: { tasks: TaskWithMeta[]; onCardClick: (t: TaskWithMeta) => void }) {
  const proyectos = useMemo(() => {
    const ids = Array.from(new Set(tasks.map((t) => t.id_proyecto)));
    return ids.map((id) => ({ id, tasks: tasks.filter((t) => t.id_proyecto === id) }));
  }, [tasks]);

  const countByStatus = (s: TareaStatus) => tasks.filter((t) => t.status === s).length;

  return (
    <div className="overflow-x-auto kanban-scroll -mx-1 px-1 pb-2">
      {/* Sticky column headers */}
      <div className="grid grid-cols-3 gap-3 mb-4 sticky top-0 z-10 py-1" style={{ background: 'var(--background)' }}>
        {ALL_STATUSES.map((s) => <ColumnHeader key={s} status={s} count={countByStatus(s)} />)}
      </div>

      {/* Swimlanes */}
      <div className="space-y-4">
        {proyectos.map(({ id, tasks: pt }) => (
          <div key={id} className="border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-3">
              <SwimLaneHeader proyectoId={id} count={pt.length} />
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-700/60 bg-white/60 dark:bg-slate-900/30">
              {ALL_STATUSES.map((status) => {
                const cards = pt.filter((t) => t.status === status);
                return (
                  <div key={status} className="p-2.5 space-y-2 min-h-[72px]">
                    {cards.length === 0 ? (
                      <div className="flex items-center justify-center h-full min-h-[50px]">
                        <span className="text-[10px] text-slate-300 dark:text-slate-700">—</span>
                      </div>
                    ) : (
                      cards.map((t) => <KanbanCard key={t.id} t={t} onClick={() => onCardClick(t)} />)
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Kanban User ────────────────────────────────────────────────────────────────
function KanbanUserView({ tasks, onCardClick }: { tasks: TaskWithMeta[]; onCardClick: (t: TaskWithMeta) => void }) {
  const countByStatus = (s: TareaStatus) => tasks.filter((t) => t.status === s).length;
  return (
    <div className="overflow-x-auto kanban-scroll -mx-1 px-1 pb-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-[520px]">
        {ALL_STATUSES.map((status) => {
          const cards = tasks.filter((t) => t.status === status);
          return (
            <div key={status} className="flex flex-col gap-3">
              <ColumnHeader status={status} count={countByStatus(status)} />
              <div className="flex flex-col gap-2">
                {cards.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700/60 rounded-xl p-6 text-center">
                    <p className="text-xs text-slate-400">Sin tareas</p>
                  </div>
                ) : (
                  cards.map((t) => <KanbanCard key={t.id} t={t} onClick={() => onCardClick(t)} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Vista Historial ────────────────────────────────────────────────────────────
function HistorialView({ tasks, onCardClick }: { tasks: TaskWithMeta[]; onCardClick: (t: TaskWithMeta) => void }) {
  const completadas = tasks.filter((t) => t.status === 'Completada');
  const grouped = useMemo(() => groupByDate(completadas), [completadas]);

  if (completadas.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-4xl">🟢</p>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Aún no hay tareas completadas
        </p>
        <p className="text-xs text-slate-400">
          Mueve tareas al estado &ldquo;Hecho&rdquo; para verlas aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateKey, dayTasks]) => (
        <div key={dateKey}>
          {/* Separador de fecha */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full capitalize">
              🟢 {formatDateGroup(dateKey)}
            </span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
            <span className="text-[10px] text-slate-400">{dayTasks.length} tarea{dayTasks.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Tareas del día */}
          <div className="space-y-2">
            {dayTasks.map((t) => {
              const initials = t.responsable_nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
              return (
                <div
                  key={t.id}
                  onClick={() => onCardClick(t)}
                  className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-800 rounded-[14px] border border-slate-100 dark:border-slate-700/50 hover:shadow-sm cursor-pointer transition-all group"
                >
                  <span className="text-emerald-500 text-lg shrink-0">✓</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate group-hover:text-alzak-blue dark:group-hover:text-alzak-gold transition-colors">
                      {t.tarea_descripcion}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[9px] text-alzak-blue dark:text-alzak-gold">{t.id_proyecto}</span>
                      <span className="text-[9px] text-slate-400">·</span>
                      <div className="w-4 h-4 rounded-full bg-alzak-blue/15 dark:bg-alzak-gold/20 flex items-center justify-center text-[8px] font-bold text-alzak-blue dark:text-alzak-gold shrink-0">
                        {initials}
                      </div>
                      <span className="text-[9px] text-slate-400 truncate">{t.responsable_nombre}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${PRIORIDAD_BADGE[t.prioridad]}`}>
                    {t.prioridad}
                  </span>
                  {t.notas.length > 0 && (
                    <span className="text-[9px] text-slate-400">💬{t.notas.length}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function TareasPage() {
  const { user } = useAuth();
  const { tasks } = useTaskStore();
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const [tab,             setTab]             = useState<'board' | 'historial'>('board');
  const [searchText,      setSearchText]      = useState('');
  const [filterPrioridad, setFilterPrioridad] = useState<TareaPrioridad | 'Todas'>('Todas');
  const [selectedTask,    setSelectedTask]    = useState<TaskWithMeta | null>(null);
  const [newTaskOpen,     setNewTaskOpen]     = useState(false);

  const openModal  = useCallback((t: TaskWithMeta) => setSelectedTask(t), []);
  const closeModal = useCallback(() => setSelectedTask(null), []);

  // Sync modal task con la versión más reciente del store
  const modalTask = useMemo(
    () => (selectedTask ? tasks.find((t) => t.id === selectedTask.id) ?? null : null),
    [selectedTask, tasks],
  );

  const filtered = useMemo(() => {
    let base = isAdmin ? tasks : tasks.filter((t) => t.responsable_correo === user?.email);
    if (filterPrioridad !== 'Todas') base = base.filter((t) => t.prioridad === filterPrioridad);
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      base = base.filter(
        (t) =>
          t.tarea_descripcion.toLowerCase().includes(q) ||
          t.responsable_nombre.toLowerCase().includes(q) ||
          t.id_proyecto.toLowerCase().includes(q),
      );
    }
    return base;
  }, [tasks, isAdmin, user?.email, filterPrioridad, searchText]);

  const boardTasks     = filtered.filter((t) => t.status !== 'Completada' || tab === 'board');
  const activeTasks    = filtered.filter((t) => t.status !== 'Completada');
  const completedCount = filtered.filter((t) => t.status === 'Completada').length;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-alzak-blue dark:text-white">
            {isAdmin ? 'The Board' : 'Mis Tareas'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {activeTasks.length} activas · {completedCount} completadas
          </p>
        </div>

        {/* Nueva tarea (admin+) */}
        {isAdmin && (
          <button
            onClick={() => setNewTaskOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] bg-alzak-blue text-white text-sm font-bold hover:bg-alzak-blue/90 transition-colors shadow-md shrink-0"
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">Nueva tarea</span>
          </button>
        )}

        {/* Buscador */}
        <div className="relative w-full sm:w-60">
          <input
            type="text"
            placeholder="Buscar tarea, proyecto…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 dark:focus:ring-alzak-gold/40 transition-all"
          />
          <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs + Filtros ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-[14px] w-fit">
          <button
            onClick={() => setTab('board')}
            className={`px-4 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
              tab === 'board'
                ? 'bg-white dark:bg-slate-700 text-alzak-blue dark:text-alzak-gold shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            📋 Board
          </button>
          <button
            onClick={() => setTab('historial')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
              tab === 'historial'
                ? 'bg-white dark:bg-slate-700 text-alzak-blue dark:text-alzak-gold shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            🟢 Historial
            {completedCount > 0 && (
              <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 rounded-full text-[9px] font-bold">
                {completedCount}
              </span>
            )}
          </button>
        </div>

        {/* Filtros de prioridad */}
        {tab === 'board' && (
          <div className="flex gap-2 overflow-x-auto pb-1 kanban-scroll">
            {(['Todas', 'Alta', 'Media', 'Baja'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFilterPrioridad(p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  filterPrioridad === p
                    ? 'bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark shadow-sm'
                    : 'glass text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                {p !== 'Todas' && <span className={`w-2 h-2 rounded-full ${PRIORIDAD_DOT[p as TareaPrioridad]}`} />}
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Contenido ── */}
      <div className="glass rounded-[20px] p-4">
        {tab === 'board' ? (
          <>
            {boardTasks.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-4xl">📋</p>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {searchText ? 'Sin resultados para esa búsqueda' : 'Sin tareas activas'}
                </p>
                {searchText && (
                  <button onClick={() => setSearchText('')} className="text-xs text-alzak-blue dark:text-alzak-gold hover:underline">
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : isAdmin ? (
              <KanbanAdminView tasks={filtered} onCardClick={openModal} />
            ) : (
              <KanbanUserView tasks={filtered} onCardClick={openModal} />
            )}
          </>
        ) : (
          <HistorialView tasks={filtered} onCardClick={openModal} />
        )}
      </div>

      {/* ── Leyenda ── */}
      {tab === 'board' && (
        <div className="flex items-center flex-wrap gap-4 px-1 text-[10px] text-slate-400 dark:text-slate-600">
          <span className="font-semibold uppercase tracking-wider">Prioridad:</span>
          {(['Alta', 'Media', 'Baja'] as TareaPrioridad[]).map((p) => (
            <span key={p} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${PRIORIDAD_DOT[p]}`} />
              {p}
            </span>
          ))}
          <span className="flex items-center gap-1">⚠️ Vence en ≤ 2 días</span>
          <span className="ml-auto text-[9px]">Clic en una tarjeta para ver detalle · Icono {STATUS_CFG['Pendiente'].icon} para cambiar estado</span>
        </div>
      )}

      {/* ── Modal detalle ── */}
      {modalTask && <TaskModal task={modalTask} onClose={closeModal} />}

      {/* ── Modal nueva tarea ── */}
      {newTaskOpen && <NewTaskModal onClose={() => setNewTaskOpen(false)} />}
    </div>
  );
}
