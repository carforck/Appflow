"use client";

import { useState, useRef, useEffect } from 'react';
import TaskModal    from '@/components/TaskModal';
import NewTaskModal from '@/components/NewTaskModal';
import { KanbanAdminView, KanbanUserView } from './KanbanViews';
import { HistorialView }    from './HistorialView';
import { ListaMaestraView } from './ListaMaestraView';
import { EditTaskModal }    from './EditTaskModal';
import { PRIORIDAD_DOT, STATUS_CFG, ALL_STATUSES } from './taskBoardConfig';
import type { TaskBoardState } from '@/hooks/useTaskBoard';
import type { TareaPrioridad, TareaStatus } from '@/lib/mockData';

export function TaskBoard(props: TaskBoardState) {
  // ── Combobox local: filtro de proyecto ──────────────────────────────────────
  const [proySearch, setProySearch] = useState('');
  const [proyOpen,   setProyOpen]   = useState(false);
  const proyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!proyOpen) return;
    const handler = (e: MouseEvent) => {
      if (proyRef.current && !proyRef.current.contains(e.target as Node)) setProyOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [proyOpen]);

  const {
    filtered, activeTasks, completedCount, isAdmin,
    proyectoOptions, responsableOptions,
    tab, searchText, filterPrioridad, filterStatus, filterProyecto, filterResponsable,
    newTaskOpen, modalTask, chatFocus,
    editTask, deleteConfirm, deletingId,
    setTab, setSearchText, setFilterPrioridad, setFilterStatus,
    setFilterProyecto, setFilterResponsable,
    openModal, closeModal, setNewTaskOpen,
    openEdit, closeEdit, requestDelete, cancelDelete, confirmDelete,
  } = props;

  return (
    <div className="space-y-5">
      {/* Header + Tabs — sticky */}
      <div className="sticky top-14 lg:top-0 z-20 -mx-4 px-4 pt-4 pb-3 backdrop-blur-md" style={{ background: 'var(--background-sticky, var(--background))' }}>
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

        {/* Filtros de admin: Proyecto + Responsable */}
        {isAdmin && tab === 'board' && (
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            {/* Combobox proyecto */}
            <div ref={proyRef} className="relative flex-1 min-w-0">
              <label htmlFor="filter-proyecto" className="sr-only">Filtrar por proyecto</label>
              <svg className="pointer-events-none absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <input
                id="filter-proyecto"
                type="text"
                autoComplete="off"
                placeholder="📁 Buscar proyecto..."
                value={proySearch}
                onChange={(e) => {
                  setProySearch(e.target.value);
                  setProyOpen(true);
                  if (!e.target.value) setFilterProyecto('');
                }}
                onFocus={() => setProyOpen(true)}
                className={`w-full pl-8 pr-8 py-2 text-sm rounded-[12px] border focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 dark:focus:ring-alzak-gold/40 transition-all ${
                  filterProyecto
                    ? 'bg-alzak-blue/5 dark:bg-alzak-gold/10 border-alzak-blue/30 dark:border-alzak-gold/30 text-alzak-blue dark:text-alzak-gold font-semibold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              />
              {(proySearch || filterProyecto) && (
                <button
                  aria-label="Limpiar filtro de proyecto"
                  onClick={() => { setProySearch(''); setFilterProyecto(''); setProyOpen(false); }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {proyOpen && (
                <div className="absolute z-30 left-0 top-full mt-1 w-full min-w-[280px] max-w-[480px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-56 overflow-y-auto kanban-scroll">
                  {(() => {
                    const q = proySearch.toLowerCase();
                    const matches = proyectoOptions.filter(
                      (p) => !q || p.nombre.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
                    );
                    if (matches.length === 0) return (
                      <p className="px-3 py-3 text-xs text-slate-400 text-center">Sin resultados</p>
                    );
                    return matches.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => {
                          setFilterProyecto(p.id);
                          setProySearch(p.nombre);
                          setProyOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors border-b border-slate-100 dark:border-slate-700/40 last:border-0 ${
                          filterProyecto === p.id ? 'bg-alzak-blue/5 dark:bg-alzak-gold/10' : ''
                        }`}
                      >
                        <span className="font-mono text-[10px] font-bold text-alzak-blue dark:text-alzak-gold mr-2">{p.id}</span>
                        <span className="text-xs text-slate-700 dark:text-slate-200 leading-snug">{p.nombre}</span>
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>

            <div className="relative flex-1 min-w-0">
              <label htmlFor="filter-responsable" className="sr-only">Filtrar por responsable</label>
              <select
                id="filter-responsable"
                value={filterResponsable}
                onChange={(e) => setFilterResponsable(e.target.value)}
                className={`w-full pl-8 pr-3 py-2 text-sm rounded-[12px] border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 dark:focus:ring-alzak-gold/40 transition-all ${
                  filterResponsable
                    ? 'bg-alzak-blue/5 dark:bg-alzak-gold/10 border-alzak-blue/30 dark:border-alzak-gold/30 text-alzak-blue dark:text-alzak-gold font-semibold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <option value="">👤 Todos los responsables</option>
                {responsableOptions.map((r) => (
                  <option key={r.correo} value={r.correo}>{r.nombre}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>

            {(filterProyecto || filterResponsable) && (
              <button
                onClick={() => { setFilterProyecto(''); setFilterResponsable(''); }}
                aria-label="Limpiar filtros de proyecto y responsable"
                className="shrink-0 px-3 py-2 rounded-[12px] text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                ✕ Limpiar
              </button>
            )}
          </div>
        )}

        {tab === 'board' && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            {ALL_STATUSES.map((s: TareaStatus) => {
              const cfg      = STATUS_CFG[s];
              const count    = filtered.filter((t) => t.status === s).length;
              const isActive = filterStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(isActive ? 'Todas' : s)}
                  aria-pressed={isActive}
                  aria-label={`Filtrar por ${cfg.label}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alzak-blue/50 ${cfg.headerCls} ${isActive ? 'ring-2 ring-alzak-blue/50 dark:ring-alzak-gold/50 shadow-md scale-[1.03]' : 'sm:hover:shadow-sm'}`}
                >
                  <span className="text-sm">{cfg.icon}</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-100 truncate">{cfg.label}</span>
                  <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.countCls}`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>{/* /sticky */}

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
              <KanbanAdminView tasks={filtered} onCardClick={openModal} filterStatus={filterStatus} onEdit={openEdit} onDelete={requestDelete} />
            ) : (
              <KanbanUserView tasks={filtered} onCardClick={openModal} filterStatus={filterStatus} />
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

      {modalTask && <TaskModal task={modalTask} onClose={closeModal} focusChat={chatFocus} />}
      {newTaskOpen && <NewTaskModal onClose={() => setNewTaskOpen(false)} />}
      {editTask && <EditTaskModal task={editTask} onClose={closeEdit} />}

      {/* Confirmación inline de borrado */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white dark:bg-slate-900 rounded-[20px] shadow-2xl p-6 w-full max-w-sm">
            <p className="text-sm font-bold text-slate-800 dark:text-white mb-1">¿Eliminar esta tarea?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 line-clamp-2">
              #{deleteConfirm.id} — {deleteConfirm.tarea_descripcion}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingId !== null}
                className="px-4 py-2 text-sm font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors focus-visible:ring-2 focus-visible:ring-red-500/50"
              >
                {deletingId !== null ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
