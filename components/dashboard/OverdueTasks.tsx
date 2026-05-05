"use client";

import type { ReactNode } from 'react';
import type { TareaVencida } from '@/hooks/useDashboardBI';

interface Props {
  tareas:   TareaVencida[];
  chart:    ReactNode;
  onExport: () => void;
}

export function OverdueTasks({ tareas, chart, onExport }: Props) {
  const alta  = tareas.filter((t) => t.prioridad === 'Alta').length;
  const media = tareas.filter((t) => t.prioridad === 'Media').length;
  const baja  = tareas.filter((t) => t.prioridad === 'Baja').length;

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Tareas Vencidas</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {tareas.length} tarea{tareas.length !== 1 ? 's' : ''} con fecha expirada · agrupadas por responsable
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Badges resumen por prioridad */}
          {alta  > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
              Alta: {alta}
            </span>
          )}
          {media > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              Media: {media}
            </span>
          )}
          {baja  > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              Baja: {baja}
            </span>
          )}

          {tareas.length > 0 && (
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              ↓ Descargar detalle
            </button>
          )}
        </div>
      </div>

      {/* ── Gráfica ── */}
      {chart}
    </div>
  );
}
