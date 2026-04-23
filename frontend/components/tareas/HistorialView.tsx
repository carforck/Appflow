"use client";

import { useMemo } from 'react';
import { TaskWithMeta } from '@/context/TaskStoreContext';
import { PRIORIDAD_BADGE, formatDateGroup, groupByDate } from './taskBoardConfig';

export function HistorialView({
  tasks, onCardClick,
}: { tasks: TaskWithMeta[]; onCardClick: (t: TaskWithMeta) => void }) {
  const completadas = tasks.filter((t) => t.status === 'Completada');
  const grouped     = useMemo(() => groupByDate(completadas), [completadas]);

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
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full capitalize">
              🟢 {formatDateGroup(dateKey)}
            </span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
            <span className="text-[10px] text-slate-400">
              {dayTasks.length} tarea{dayTasks.length !== 1 ? 's' : ''}
            </span>
          </div>

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
                  <span className="text-[9px] text-slate-400">💬</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
