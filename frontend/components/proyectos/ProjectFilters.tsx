"use client";

import { type ProjectStatus, STATUS_LABEL } from '@/schemas/proyecto';

type StatusFilterValue = ProjectStatus | 'all';

interface ProjectFiltersProps {
  search:         string;
  onSearchChange: (v: string) => void;
  statusFilter:   StatusFilterValue;
  onStatusChange: (s: StatusFilterValue) => void;
}

const FILTERS: { value: StatusFilterValue; label: string }[] = [
  { value: 'all',        label: 'Todos' },
  { value: 'activo',     label: STATUS_LABEL.activo },
  { value: 'completado', label: STATUS_LABEL.completado },
  { value: 'inactivo',   label: STATUS_LABEL.inactivo },
];

export function ProjectFilters({
  search, onSearchChange, statusFilter, onStatusChange,
}: ProjectFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Búsqueda */}
      <input
        type="search"
        placeholder="Buscar por nombre o código..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
      />

      {/* Filtros de estado — scroll horizontal en móvil */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 sm:pb-0 no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onStatusChange(f.value)}
            className={[
              'shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
              statusFilter === f.value
                ? 'bg-alzak-blue text-white dark:bg-alzak-gold dark:text-alzak-dark'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
