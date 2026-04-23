"use client";

import { useMemo } from 'react';
import { TaskWithMeta } from '@/context/TaskStoreContext';
import type { TareaStatus } from '@/lib/mockData';
import { KanbanCard }  from './KanbanCard';
import { STATUS_CFG, ALL_STATUSES } from './taskBoardConfig';

// ── Column Header ─────────────────────────────────────────────────────────────

function ColumnHeader({ status, count }: { status: TareaStatus; count: number }) {
  const cfg = STATUS_CFG[status];
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${cfg.headerCls}`}>
      <span className="text-sm">{cfg.icon}</span>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-100">{cfg.label}</span>
      <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.countCls}`}>
        {count}
      </span>
    </div>
  );
}

// ── Swimlane Header ───────────────────────────────────────────────────────────

function SwimLaneHeader({ proyectoId, nombre, count }: { proyectoId: string; nombre: string; count: number }) {
  return (
    <div className="col-span-3 flex items-center gap-2.5 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60">
      <span className="font-mono text-[10px] font-bold bg-alzak-blue/10 dark:bg-alzak-gold/15 text-alzak-blue dark:text-alzak-gold px-2 py-0.5 rounded-md">
        {proyectoId}
      </span>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
        {nombre}
      </span>
      <span className="ml-auto text-[10px] text-slate-400 shrink-0">{count} tareas</span>
    </div>
  );
}

// ── Kanban Admin con Swimlanes ────────────────────────────────────────────────

export function KanbanAdminView({
  tasks, onCardClick,
}: { tasks: TaskWithMeta[]; onCardClick: (t: TaskWithMeta) => void }) {
  const proyectos = useMemo(() => {
    const ids = Array.from(new Set(tasks.map((t) => t.id_proyecto)));
    return ids.map((id) => {
      const pt = tasks.filter((t) => t.id_proyecto === id);
      return { id, nombre: pt[0]?.nombre_proyecto ?? id, tasks: pt };
    });
  }, [tasks]);

  const countByStatus = (s: TareaStatus) => tasks.filter((t) => t.status === s).length;

  return (
    <div className="overflow-x-auto kanban-scroll -mx-1 px-1 pb-2">
      <div className="grid grid-cols-3 gap-3 mb-4 sticky top-0 z-10 py-1" style={{ background: 'var(--background)' }}>
        {ALL_STATUSES.map((s) => <ColumnHeader key={s} status={s} count={countByStatus(s)} />)}
      </div>
      <div className="space-y-4">
        {proyectos.map(({ id, nombre, tasks: pt }) => (
          <div key={id} className="border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-3">
              <SwimLaneHeader proyectoId={id} nombre={nombre} count={pt.length} />
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-700/60 bg-white/60 dark:bg-slate-900/30">
              {ALL_STATUSES.map((status) => {
                const cards = pt.filter((t) => t.status === status);
                return (
                  <div key={status} className="p-2.5 space-y-2 min-h-[72px]">
                    {cards.length === 0 ? (
                      <div className="flex items-center justify-center h-full min-h-[50px]">
                        <span className="text-[10px] text-slate-300 dark:text-slate-700">—</span>
                      </div>
                    ) : (
                      cards.map((t) => <KanbanCard key={t.id} t={t} onClick={() => onCardClick(t)} />)
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Kanban User ───────────────────────────────────────────────────────────────

export function KanbanUserView({
  tasks, onCardClick,
}: { tasks: TaskWithMeta[]; onCardClick: (t: TaskWithMeta) => void }) {
  const countByStatus = (s: TareaStatus) => tasks.filter((t) => t.status === s).length;
  return (
    <div className="overflow-x-auto kanban-scroll -mx-1 px-1 pb-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-[520px]">
        {ALL_STATUSES.map((status) => {
          const cards = tasks.filter((t) => t.status === status);
          return (
            <div key={status} className="flex flex-col gap-3">
              <ColumnHeader status={status} count={countByStatus(status)} />
              <div className="flex flex-col gap-2">
                {cards.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700/60 rounded-xl p-6 text-center">
                    <p className="text-xs text-slate-400">Sin tareas</p>
                  </div>
                ) : (
                  cards.map((t) => <KanbanCard key={t.id} t={t} onClick={() => onCardClick(t)} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
