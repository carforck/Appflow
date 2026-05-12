"use client";

import { useMemo } from 'react';
import { TaskWithMeta } from '@/context/TaskStoreContext';
import { KanbanCard }  from './KanbanCard';
import { ALL_STATUSES, STATUS_CFG } from './taskBoardConfig';
import type { TareaStatus } from '@/lib/mockData';

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
  tasks, onCardClick, filterStatus = 'Todas', onEdit, onDelete,
}: { tasks: TaskWithMeta[]; onCardClick: (t: TaskWithMeta) => void; filterStatus?: TareaStatus | 'Todas'; onEdit?: (t: TaskWithMeta) => void; onDelete?: (t: TaskWithMeta) => void }) {
  const proyectos = useMemo(() => {
    const ids = Array.from(new Set(tasks.map((t) => t.id_proyecto)));
    return ids.map((id) => {
      const pt = tasks.filter((t) => t.id_proyecto === id);
      return { id, nombre: pt[0]?.nombre_proyecto ?? id, tasks: pt };
    });
  }, [tasks]);

  const isMobileFiltered = filterStatus !== 'Todas';

  return (
    <div className="overflow-x-auto kanban-scroll -mx-1 px-1 pb-2">
      {/* Vista móvil filtrada por columna */}
      {isMobileFiltered && (
        <div className="sm:hidden space-y-3">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 px-1">
            {STATUS_CFG[filterStatus as TareaStatus].icon} {STATUS_CFG[filterStatus as TareaStatus].label} — toca el botón de estado para cambiar columna
          </p>
          {proyectos.map(({ id, nombre, tasks: pt }) => {
            const cards = pt.filter((t) => t.status === filterStatus);
            if (cards.length === 0) return null;
            return (
              <div key={id} className="border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60">
                  <span className="font-mono text-[10px] font-bold bg-alzak-blue/10 dark:bg-alzak-gold/15 text-alzak-blue dark:text-alzak-gold px-2 py-0.5 rounded-md">{id}</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{nombre}</span>
                  <span className="ml-auto text-[10px] text-slate-400 shrink-0">{cards.length}</span>
                </div>
                <div className="p-2.5 space-y-2 bg-white/60 dark:bg-slate-900/30">
                  {cards.map((t) => <KanbanCard key={t.id} t={t} isAdmin onClick={() => onCardClick(t)} onEdit={onEdit} onDelete={onDelete} />)}
                </div>
              </div>
            );
          })}
          {proyectos.every(({ tasks: pt }) => pt.filter((t) => t.status === filterStatus).length === 0) && (
            <div className="text-center py-8 text-slate-400 text-sm">Sin tareas en esta columna</div>
          )}
        </div>
      )}

      {/* Vista desktop (siempre) + móvil sin filtro */}
      <div className={`space-y-4 min-w-[640px] ${isMobileFiltered ? 'hidden sm:block' : 'block'}`}>
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
                      cards.map((t) => <KanbanCard key={t.id} t={t} isAdmin onClick={() => onCardClick(t)} onEdit={onEdit} onDelete={onDelete} />)
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
  tasks, onCardClick, filterStatus = 'Todas',
}: { tasks: TaskWithMeta[]; onCardClick: (t: TaskWithMeta) => void; filterStatus?: TareaStatus | 'Todas' }) {
  return (
    <div className="-mx-1 px-1 pb-2">
      {filterStatus !== 'Todas' && (
        <p className="sm:hidden text-[11px] text-slate-400 dark:text-slate-500 px-1 mb-3">
          {STATUS_CFG[filterStatus as TareaStatus].icon} {STATUS_CFG[filterStatus as TareaStatus].label} — toca el botón de estado para cambiar columna
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ALL_STATUSES.map((status) => {
          const cards  = tasks.filter((t) => t.status === status);
          const hidden = filterStatus !== 'Todas' && filterStatus !== status;
          return (
            <div key={status} className={`flex flex-col gap-2 ${hidden ? 'hidden sm:flex' : ''}`}>
              {cards.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700/60 rounded-xl p-6 text-center">
                  <p className="text-xs text-slate-400">Sin tareas</p>
                </div>
              ) : (
                cards.map((t) => <KanbanCard key={t.id} t={t} onClick={() => onCardClick(t)} />)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
