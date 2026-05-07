"use client";

import { useListaMaestra } from '@/hooks/useListaMaestra';
import ListaMaestraRow from './ListaMaestraRow';
import type { TareaStatus, TareaPrioridad } from '@/lib/mockData';

const TH = 'px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap';

const ESTADOS: TareaStatus[]    = ['Pendiente', 'En Proceso', 'Completada'];
const PRIORIDADES: TareaPrioridad[] = ['Alta', 'Media', 'Baja'];

export function ListaMaestraView() {
  const {
    tasks, users, projects, projectMap, responsableOptions,
    filterProyecto,    setFilterProyecto,
    filterResponsable, setFilterResponsable,
    filterEstado,      setFilterEstado,
    filterPrioridad,   setFilterPrioridad,
    hasActiveFilters,  resetFilters,
    update, exportPDF,
  } = useListaMaestra();

  const makeUpdater = (taskId: number) =>
    (changes: Parameters<typeof update>[1]) => update(taskId, changes);

  return (
    <div className="space-y-4">

      {/* ── Filtros ── */}
      <div className="glass rounded-[16px] p-3 flex flex-wrap gap-2 items-end" style={{ background: 'var(--sidebar-bg)' }}>

        {/* Proyecto */}
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Proyecto</label>
          <select
            value={filterProyecto}
            onChange={(e) => setFilterProyecto(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-alzak-blue/40"
          >
            <option value="">Todos</option>
            {projects.map((p) => (
              <option key={p.id_proyecto} value={p.id_proyecto}>
                {p.id_proyecto} — {p.nombre_proyecto}
              </option>
            ))}
          </select>
        </div>

        {/* Responsable */}
        <div className="flex flex-col gap-1 min-w-[150px]">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Responsable</label>
          <select
            value={filterResponsable}
            onChange={(e) => setFilterResponsable(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-alzak-blue/40"
          >
            <option value="">Todos</option>
            {responsableOptions.map((r) => (
              <option key={r.correo} value={r.correo}>{r.nombre}</option>
            ))}
          </select>
        </div>

        {/* Estado */}
        <div className="flex flex-col gap-1 min-w-[110px]">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Estado</label>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as TareaStatus | '')}
            className="text-[11px] px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-alzak-blue/40"
          >
            <option value="">Todos</option>
            {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Prioridad */}
        <div className="flex flex-col gap-1 min-w-[90px]">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Prioridad</label>
          <select
            value={filterPrioridad}
            onChange={(e) => setFilterPrioridad(e.target.value as TareaPrioridad | '')}
            className="text-[11px] px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-alzak-blue/40"
          >
            <option value="">Todas</option>
            {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Acciones filtros */}
        <div className="flex items-end gap-2 ml-auto">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 self-center">
            <strong className="text-slate-800 dark:text-white">{tasks.length}</strong> tarea{tasks.length !== 1 ? 's' : ''}
          </span>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              ✕ Limpiar filtros
            </button>
          )}
          <button
            onClick={() => exportPDF(tasks)}
            disabled={tasks.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-alzak-blue text-white text-[11px] font-bold hover:bg-alzak-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            title="Abre el PDF en una nueva pestaña para revisar y descargar"
          >
            Vista Previa / PDF
          </button>
        </div>
      </div>

      {/* ── Aviso mobile ── */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-xs text-amber-700 dark:text-amber-300">
        <span>📐</span>
        <span>La Lista Maestra está optimizada para pantallas grandes.</span>
      </div>

      {/* ── Tabla ── */}
      {tasks.length > 0 ? (
        <div className="glass rounded-[20px] overflow-hidden" style={{ background: 'var(--sidebar-bg)' }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ tableLayout: 'auto' }}>
              <colgroup>
                <col style={{ width: 90  }} />  {/* ID Proyecto */}
                <col style={{ width: 120 }} />  {/* Nombre */}
                <col style={{ width: 90  }} />  {/* Empresa */}
                <col style={{ width: 90  }} />  {/* Financiador */}
                <col style={{ width: 52  }} />  {/* ID Tarea */}
                <col />                          {/* Tarea */}
                <col style={{ width: 82  }} />  {/* Estado */}
                <col style={{ width: 130 }} />  {/* Responsable */}
                <col style={{ width: 80  }} />  {/* Prioridad */}
                <col style={{ width: 110 }} />  {/* Fecha Inicio */}
                <col style={{ width: 110 }} />  {/* Fecha Entrega */}
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/40">
                  <th className={TH}>ID Proyecto</th>
                  <th className={TH}>Nombre</th>
                  <th className={TH}>Empresa</th>
                  <th className={TH}>Financiador</th>
                  <th className={TH}>#</th>
                  <th className={TH}>Tarea</th>
                  <th className={TH}>Estado</th>
                  <th className={TH}>Responsable</th>
                  <th className={TH}>Prioridad</th>
                  <th className={TH}>Fecha Inicio</th>
                  <th className={TH}>Fecha Entrega</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <ListaMaestraRow
                    key={task.id}
                    task={task}
                    users={users}
                    projects={projects}
                    projectMap={projectMap}
                    onUpdate={makeUpdater(task.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          className="glass rounded-[20px] p-12 text-center space-y-3"
          style={{ background: 'var(--sidebar-bg)' }}
        >
          <p className="text-4xl" aria-hidden>📋</p>
          <p className="text-base font-bold text-slate-800 dark:text-white">
            {hasActiveFilters ? 'Sin tareas para estos filtros' : 'Sin tareas activas'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-sm text-alzak-blue dark:text-alzak-gold hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
