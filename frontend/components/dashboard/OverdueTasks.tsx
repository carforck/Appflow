"use client";

import type { TareaVencida } from '@/hooks/useDashboardBI';

const PRIORIDAD_BADGE: Record<string, string> = {
  Alta:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Media: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Baja:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

interface Props {
  tareas:    TareaVencida[];
  onExport:  () => void;
}

export function OverdueTasks({ tareas, onExport }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Tareas Vencidas</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {tareas.length} tarea{tareas.length !== 1 ? 's' : ''} con fecha expirada
          </p>
        </div>
        {tareas.length > 0 && (
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            ↓ Descargar detalle
          </button>
        )}
      </div>

      {tareas.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-2xl">✅</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Sin tareas vencidas para los filtros seleccionados</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {tareas.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-3 p-3 rounded-[14px] bg-red-50/60 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30"
            >
              <div className="shrink-0 mt-0.5 max-w-[90px]">
                <span className="font-mono text-[9px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold block truncate" title={t.nombre_proyecto ?? t.id_proyecto}>
                  {t.nombre_proyecto ?? t.id_proyecto}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {t.tarea_descripcion}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {t.responsable_nombre}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${PRIORIDAD_BADGE[t.prioridad] ?? ''}`}>
                  {t.prioridad}
                </span>
                <span className="text-[9px] text-red-500 font-semibold">
                  {t.dias_vencida}d vencida
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
