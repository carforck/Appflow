"use client";

import { useMemo } from 'react';
import { StagingTask } from '@/context/StagingContext';
import type { MockUser } from '@/lib/mockData';
import { StagedTaskCard } from './StagedTaskCard';

interface ValidationStepProps {
  stagedTasks:   StagingTask[];
  users:         MockUser[];
  approved:      number;
  approvingAll:  boolean;
  approvingId:   string | null;
  isDirectMode?: boolean;
  onUpdateTask:  (stagingId: string, updates: Partial<Omit<StagingTask, 'stagingId'>>) => void;
  onApproveOne:  (task: StagingTask) => void;
  onDiscardOne:  (stagingId: string) => void;
  onDiscardAll:  () => void;
  onApproveAll:  () => void;
  onReset:       () => void;
}

export function ValidationStep({
  stagedTasks, users, approved, approvingAll, approvingId, isDirectMode,
  onUpdateTask, onApproveOne, onDiscardOne, onDiscardAll, onApproveAll, onReset,
}: ValidationStepProps) {
  const total = stagedTasks.length + approved;

  // Agrupar por responsable; "Sin asignar" siempre al final
  const groups = useMemo((): [string, StagingTask[]][] => {
    const map = new Map<string, StagingTask[]>();
    for (const task of stagedTasks) {
      const key = task.responsable_nombre.trim() || 'Sin asignar';
      const arr = map.get(key) ?? [];
      arr.push(task);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'Sin asignar') return 1;
      if (b === 'Sin asignar') return -1;
      return a.localeCompare(b, 'es');
    });
  }, [stagedTasks]);

  return (
    <>
      {/* Banner contexto — adapta según modo */}
      <div
        className={`glass rounded-[16px] border p-4 flex items-start gap-3 ${
          isDirectMode
            ? 'border-emerald-200/60 dark:border-emerald-700/40'
            : 'border-violet-200/60 dark:border-violet-700/40'
        }`}
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <span className="text-2xl shrink-0">{isDirectMode ? '⚡' : '🤖'}</span>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-white">
            {isDirectMode
              ? `El parser estructuró ${total} tarea${total !== 1 ? 's' : ''} del texto`
              : `La IA extrajo ${total} tarea${total !== 1 ? 's' : ''} de la minuta`}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Revisa cada tarea antes de aprobarla. Puedes editar descripción, responsable, prioridad y fecha.
          </p>
        </div>
      </div>

      {/* Barra de acciones globales */}
      {stagedTasks.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {stagedTasks.length} tarea{stagedTasks.length !== 1 ? 's' : ''} pendiente{stagedTasks.length !== 1 ? 's' : ''} de revisión
          </p>
          <div className="flex gap-2">
            <button
              onClick={onDiscardAll}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-semibold text-red-500 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus-visible:ring-2 focus-visible:ring-red-400/50"
            >
              Descartar todo
            </button>
            <button
              onClick={onApproveAll}
              disabled={approvingAll}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-md focus-visible:ring-2 focus-visible:ring-emerald-400/50"
            >
              {approvingAll ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Aprobando...</span></>
              ) : (
                <><span>📋</span><span>Enviar a Revisión ({stagedTasks.length})</span></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Lista agrupada por responsable */}
      {stagedTasks.length > 0 ? (
        <div className="space-y-6">
          {groups.map(([responsable, groupTasks]) => {
            const initial = responsable === 'Sin asignar' ? '?' : responsable[0]?.toUpperCase() ?? '?';
            return (
              <div key={responsable} className="space-y-2">
                {/* Cabecera de grupo */}
                <div className="flex items-center gap-2 py-1">
                  <div className="w-6 h-6 rounded-full bg-alzak-blue/15 dark:bg-alzak-gold/20 flex items-center justify-center text-[10px] font-bold text-alzak-blue dark:text-alzak-gold shrink-0">
                    {initial}
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {responsable}
                  </span>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full font-semibold">
                    {groupTasks.length}
                  </span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>

                {/* Tarjetas del grupo */}
                {groupTasks.map((task) => (
                  <StagedTaskCard
                    key={task.stagingId}
                    task={task}
                    users={users}
                    onUpdate={(updates) => onUpdateTask(task.stagingId, updates)}
                    onApprove={() => onApproveOne(task)}
                    onDiscard={() => onDiscardOne(task.stagingId)}
                    approving={approvingId === task.stagingId}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        /* Estado vacío */
        <div className="glass rounded-[20px] p-10 text-center space-y-3" style={{ background: 'var(--sidebar-bg)' }}>
          {approved > 0 ? (
            <>
              <p className="text-4xl">🎉</p>
              <p className="text-base font-bold text-slate-800 dark:text-white">
                ¡{approved} tarea{approved !== 1 ? 's' : ''} enviada{approved !== 1 ? 's' : ''} a Revisión!
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Redirigiendo a la Matriz de Revisión para aprobar y publicar al equipo…
              </p>
            </>
          ) : (
            <>
              <p className="text-4xl">🗑️</p>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Todas las tareas fueron descartadas
              </p>
            </>
          )}
          <button
            onClick={onReset}
            className="mt-2 px-5 py-2.5 rounded-[12px] bg-alzak-blue text-white text-sm font-bold hover:bg-alzak-blue/90 transition-colors shadow-md focus-visible:ring-2 focus-visible:ring-alzak-blue/50"
          >
            Procesar otra minuta
          </button>
        </div>
      )}
    </>
  );
}
