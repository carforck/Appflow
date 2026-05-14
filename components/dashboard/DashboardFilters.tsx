"use client";

import { useState, useRef, useEffect } from 'react';
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

  const [projQuery, setProjQuery] = useState('');
  const [projOpen,  setProjOpen]  = useState(false);
  const projRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (projRef.current && !projRef.current.contains(e.target as Node)) setProjOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!filters.project_id) {
      setProjQuery('');
    } else {
      const p = projectOptions.find((pr) => pr.id_proyecto === filters.project_id);
      if (p) setProjQuery(`[${p.id_proyecto}] ${p.nombre_proyecto}`);
    }
  }, [filters.project_id, projectOptions]);

  const filteredProjects = projectOptions.filter((p) =>
    !projQuery ||
    p.id_proyecto.toLowerCase().includes(projQuery.toLowerCase()) ||
    p.nombre_proyecto.toLowerCase().includes(projQuery.toLowerCase()),
  );

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
        <div ref={projRef} className="relative">
          <div className="relative">
            <input
              type="text"
              value={projQuery}
              onChange={(e) => { setProjQuery(e.target.value); onChange({ project_id: '' }); setProjOpen(true); }}
              onFocus={() => setProjOpen(true)}
              placeholder="Todos los proyectos"
              autoComplete="off"
              className={SELECT + ' pr-8'}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setProjOpen((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label="Ver proyectos"
            >
              <svg className={`w-3 h-3 transition-transform ${projOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {projOpen && (
            <ul
              role="listbox"
              className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-y-auto max-h-52 kanban-scroll"
            >
              <li
                role="option"
                aria-selected={!filters.project_id}
                onMouseDown={(e) => { e.preventDefault(); setProjQuery(''); onChange({ project_id: '' }); setProjOpen(false); }}
                className={`px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                  !filters.project_id
                    ? 'bg-alzak-blue/10 dark:bg-alzak-gold/10 text-alzak-blue dark:text-alzak-gold font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                Todos los proyectos
              </li>
              {filteredProjects.map((p) => (
                <li
                  key={p.id_proyecto}
                  role="option"
                  aria-selected={filters.project_id === p.id_proyecto}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setProjQuery(`[${p.id_proyecto}] ${p.nombre_proyecto}`);
                    onChange({ project_id: p.id_proyecto });
                    setProjOpen(false);
                  }}
                  className={`px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                    filters.project_id === p.id_proyecto
                      ? 'bg-alzak-blue/10 dark:bg-alzak-gold/10 text-alzak-blue dark:text-alzak-gold font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="font-mono text-alzak-blue dark:text-alzak-gold">[{p.id_proyecto}]</span>{' '}
                  {p.nombre_proyecto}
                </li>
              ))}
            </ul>
          )}
        </div>
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
