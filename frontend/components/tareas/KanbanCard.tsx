"use client";

import { TaskWithMeta } from '@/context/TaskStoreContext';
import { PRIORIDAD_DOT, PRIORIDAD_BADGE, formatFecha, daysUntil } from './taskBoardConfig';

export function KanbanCard({ t, onClick }: { t: TaskWithMeta; onClick: () => void }) {
  const days      = daysUntil(t.fecha_entrega);
  const isUrgent  = days <= 2 && t.status !== 'Completada';
  const isOverdue = days < 0  && t.status !== 'Completada';
  const initials  = t.responsable_nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group"
    >
      <div className="flex items-start gap-1.5 mb-2.5">
        <span className="shrink-0 text-[9px] font-bold text-alzak-blue/60 dark:text-alzak-gold/60 bg-alzak-blue/8 dark:bg-alzak-gold/10 px-1.5 py-0.5 rounded-full mt-0.5">
          #{t.id}
        </span>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-alzak-blue dark:group-hover:text-alzak-gold transition-colors">
          {t.tarea_descripcion}
        </p>
      </div>

      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-2 ${PRIORIDAD_BADGE[t.prioridad]}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${PRIORIDAD_DOT[t.prioridad]}`} />
        {t.prioridad}
      </span>

      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 shrink-0 rounded-full bg-alzak-blue/15 dark:bg-alzak-gold/20 flex items-center justify-center text-[9px] font-bold text-alzak-blue dark:text-alzak-gold">
            {initials}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate min-w-0">
            {t.responsable_nombre.split(' ')[0]}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">💬</span>
          <span className={`text-[9px] font-semibold ${isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>
            {(isUrgent || isOverdue) && '⚠️ '}{formatFecha(t.fecha_entrega)}
          </span>
        </div>
      </div>
    </div>
  );
}
