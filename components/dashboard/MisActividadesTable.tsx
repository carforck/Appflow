"use client";

import type { TaskWithMeta } from '@/context/TaskStoreContext';

const STATUS_STYLE: Record<string, string> = {
  'Pendiente':  'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300',
  'En Proceso': 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  'Completada': 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
};

const PRIO_STYLE: Record<string, string> = {
  'Alta':  'text-red-500 dark:text-red-400 font-bold',
  'Media': 'text-amber-500 dark:text-amber-400 font-bold',
  'Baja':  'text-emerald-600 dark:text-emerald-400 font-bold',
};

const PRIO_DOT: Record<string, string> = {
  'Alta':  'bg-red-500',
  'Media': 'bg-amber-400',
  'Baja':  'bg-emerald-500',
};

function fmtDate(d: string | undefined) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  if (y && m && day) return `${day}/${m}/${y.slice(2)}`;
  return d;
}

function isOverdue(fecha?: string, status?: string) {
  if (!fecha || status === 'Completada') return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return fecha < today;
}

interface Props { tasks: TaskWithMeta[] }

export function MisActividadesTable({ tasks }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-3xl" aria-hidden>✅</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Sin tareas activas</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[12px] border border-slate-100 dark:border-slate-700/60">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">Proyecto</th>
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Tarea</th>
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">Prioridad</th>
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">Estado</th>
            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">Fecha Fin</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const overdue = isOverdue(t.fecha_entrega, t.status);
            return (
              <tr
                key={t.id}
                className="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
              >
                {/* Proyecto */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="font-mono text-[10px] font-bold bg-alzak-blue/10 dark:bg-alzak-gold/10 text-alzak-blue dark:text-alzak-gold px-1.5 py-0.5 rounded-md">
                    {t.id_proyecto}
                  </span>
                  {t.nombre_proyecto && (
                    <p className="text-[9px] text-slate-400 mt-0.5 max-w-[100px] truncate">{t.nombre_proyecto}</p>
                  )}
                </td>

                {/* Tarea */}
                <td className="px-3 py-2 max-w-[260px]">
                  <p className="line-clamp-2 text-slate-700 dark:text-slate-200 leading-snug">
                    {t.tarea_descripcion}
                  </p>
                </td>

                {/* Prioridad */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`flex items-center gap-1 ${PRIO_STYLE[t.prioridad] ?? ''}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIO_DOT[t.prioridad] ?? 'bg-slate-400'}`} />
                    {t.prioridad}
                  </span>
                </td>

                {/* Estado */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLE[t.status] ?? ''}`}>
                    {t.status}
                  </span>
                </td>

                {/* Fecha Fin */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={overdue ? 'text-red-500 font-bold flex items-center gap-1' : 'text-slate-500 dark:text-slate-400'}>
                    {overdue && <span aria-label="Vencida" title="Vencida">⚠️</span>}
                    {fmtDate(t.fecha_entrega)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
