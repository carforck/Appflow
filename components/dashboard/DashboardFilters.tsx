"use client";

import type { DashboardFilters } from '@/hooks/useDashboardBI';
import type { MockProject } from '@/lib/mockData';

interface Props {
  filters:        DashboardFilters;
  projectOptions: MockProject[];
  empresas:       string[];
  financiadores:  string[];
  onChange:       (patch: Partial<DashboardFilters>) => void;
  onReset:        () => void;
}

const PRIORIDADES = ['Alta', 'Media', 'Baja'];

const SELECT = 'w-full px-3 py-2 text-xs rounded-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30';
const LABEL  = 'text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider';

export function DashboardFilters({ filters, projectOptions, empresas, financiadores, onChange, onReset }: Props) {
  const hasActive = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">

      {/* Empresa */}
      {empresas.length > 0 && (
        <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[160px]">
          <label className={LABEL}>Empresa</label>
          <select
            value={filters.empresa}
            onChange={(e) => onChange({ empresa: e.target.value, project_id: '', financiador: '' })}
            className={SELECT}
          >
            <option value="">Todas las empresas</option>
            {empresas.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      )}

      {/* Financiador */}
      {financiadores.length > 0 && (
        <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[160px]">
          <label className={LABEL}>Financiador</label>
          <select
            value={filters.financiador}
            onChange={(e) => onChange({ financiador: e.target.value, project_id: '' })}
            className={SELECT}
          >
            <option value="">Todos los financiadores</option>
            {financiadores.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      )}

      {/* Proyecto — ancho completo en móvil */}
      <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[180px] sm:flex-1 sm:max-w-xs">
        <label className={LABEL}>Proyecto</label>
        <select
          value={filters.project_id}
          onChange={(e) => onChange({ project_id: e.target.value })}
          className={SELECT}
        >
          <option value="">Todos los proyectos</option>
          {projectOptions.map((p) => (
            <option key={p.id_proyecto} value={p.id_proyecto}>
              [{p.id_proyecto}] {p.nombre_proyecto}
            </option>
          ))}
        </select>
      </div>

      {/* Prioridad */}
      <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[110px]">
        <label className={LABEL}>Prioridad</label>
        <select
          value={filters.prioridad}
          onChange={(e) => onChange({ prioridad: e.target.value })}
          className={SELECT}
        >
          <option value="">Todas</option>
          {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Fechas — en móvil se muestran en fila de dos columnas */}
      <div className="grid grid-cols-2 gap-2 w-full sm:contents">
        <div className="flex flex-col gap-1 sm:min-w-[130px]">
          <label className={LABEL}>Desde</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => onChange({ date_from: e.target.value })}
            className={SELECT}
          />
        </div>

        <div className="flex flex-col gap-1 sm:min-w-[130px]">
          <label className={LABEL}>Hasta</label>
          <input
            type="date"
            value={filters.date_to}
            min={filters.date_from}
            onChange={(e) => onChange({ date_to: e.target.value })}
            className={SELECT}
          />
        </div>
      </div>

      {/* Limpiar filtros */}
      {hasActive && (
        <button
          onClick={onReset}
          className="w-full sm:w-auto self-end px-4 py-2 text-xs rounded-[10px] border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Limpiar ×
        </button>
      )}
    </div>
  );
}
