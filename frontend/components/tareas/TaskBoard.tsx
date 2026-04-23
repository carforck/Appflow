"use client";

import TaskModal    from '@/components/TaskModal';
import NewTaskModal from '@/components/NewTaskModal';
import { KanbanAdminView, KanbanUserView } from './KanbanViews';
import { HistorialView }    from './HistorialView';
import { ListaMaestraView } from './ListaMaestraView';
import { PRIORIDAD_DOT } from './taskBoardConfig';
import type { TaskBoardState } from '@/hooks/useTaskBoard';
import type { TareaPrioridad } from '@/lib/mockData';

export function TaskBoard(props: TaskBoardState) {
  const {
    filtered, activeTasks, completedCount, isAdmin,
    tab, searchText, filterPrioridad, newTaskOpen, modalTask,
    setTab, setSearchText, setFilterPrioridad, openModal, closeModal, setNewTaskOpen,
  } = props;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-alzak-blue dark:text-white">
            {isAdmin ? 'The Board' : 'Mis Tareas'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {activeTasks.length} activas · {completedCount} completadas
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setNewTaskOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] bg-alzak-blue text-white text-sm font-bold hover:bg-alzak-blue/90 transition-colors shadow-md shrink-0 focus-visible:ring-2 focus-visible:ring-alzak-blue/50"
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">Nueva tarea</span>
          </button>
        )}
        <div className="relative w-full sm:w-60">
          <label htmlFor="task-search" className="sr-only">Buscar tarea o proyecto</label>
          <input
            id="task-search"
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
            <button onClick={() => setSearchText('')} aria-label="Limpiar búsqueda" className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs + Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-[14px] w-fit">
          {(['board', 'historial'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
                tab === t
                  ? 'bg-white dark:bg-slate-700 text-alzak-blue dark:text-alzak-gold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {t === 'board' ? '📋 Board' : '🟢 Historial'}
              {t === 'historial' && completedCount > 0 && (
                <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 rounded-full text-[9px] font-bold">
                  {completedCount}
                </span>
              )}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => setTab('lista')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
                tab === 'lista'
                  ? 'bg-white dark:bg-slate-700 text-alzak-blue dark:text-alzak-gold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              📄 Lista Maestra
            </button>
          )}
        </div>
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

      {/* Contenido */}
      {tab === 'lista' ? (
        <ListaMaestraView />
      ) : (
        <div className="glass rounded-[20px] p-4">
          {tab === 'board' ? (
            filtered.length === 0 ? (
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
            )
          ) : (
            <HistorialView tasks={filtered} onCardClick={openModal} />
          )}
        </div>
      )}

      {/* Leyenda */}
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
          <span className="ml-auto text-[9px]">
            Clic en una tarjeta para ver detalle y cambiar estado
          </span>
        </div>
      )}

      {modalTask && <TaskModal task={modalTask} onClose={closeModal} />}
      {newTaskOpen && <NewTaskModal onClose={() => setNewTaskOpen(false)} />}
    </div>
  );
}
