"use client";

import type { RevisionTask } from '@/hooks/useRevision';

interface Props {
  tasks:     RevisionTask[];
  onConfirm: () => void;
  onCancel:  () => void;
  loading:   boolean;
}

export function ApproveAllModal({ tasks, onConfirm, onCancel, loading }: Props) {
  const byResponsable = tasks.reduce<Record<string, { nombre: string; count: number }>>((acc, t) => {
    const key = t.responsable_correo || '__sin__';
    if (!acc[key]) acc[key] = { nombre: t.responsable_nombre || 'Sin asignar', count: 0 };
    acc[key].count++;
    return acc;
  }, {});

  const sorted = Object.values(byResponsable).sort((a, b) => b.count - a.count);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approve-modal-title"
    >
      <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto kanban-scroll">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xl shrink-0">
            ✅
          </div>
          <div>
            <h2 id="approve-modal-title" className="text-base font-bold text-slate-800 dark:text-white">
              Resumen de aprobación
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Revisa antes de confirmar</p>
          </div>
        </div>

        {/* Total */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-[16px] p-4 space-y-1">
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            {tasks.length} tarea{tasks.length !== 1 ? 's' : ''} serán aprobadas
          </p>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
            Pasarán al tablero Kanban y se enviarán notificaciones y correos a cada responsable.
          </p>
        </div>

        {/* Distribución por responsable */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Distribución por responsable
          </p>
          <div className="space-y-1.5 max-h-52 overflow-y-auto kanban-scroll pr-1">
            {sorted.map((r) => (
              <div
                key={r.nombre}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/40"
              >
                <span className="text-sm text-slate-700 dark:text-slate-200 truncate flex-1 mr-2">
                  {r.nombre}
                </span>
                <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-alzak-blue/10 dark:bg-alzak-gold/15 text-alzak-blue dark:text-alzak-gold">
                  {r.count} tarea{r.count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : '✅ Confirmar y aprobar'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
