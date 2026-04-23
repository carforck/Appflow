"use client";

import { useState } from 'react';
import { StagingTask } from '@/context/StagingContext';
import type { MockUser }  from '@/lib/mockData';
import { PRIORIDADES, PRIO_COLOR, STATUSES } from './procesadorConstants';

interface StagedTaskCardProps {
  task:      StagingTask;
  users:     MockUser[];
  onUpdate:  (updates: Partial<Omit<StagingTask, 'stagingId'>>) => void;
  onApprove: () => void;
  onDiscard: () => void;
  approving: boolean;
}

export function StagedTaskCard({ task, users, onUpdate, onApprove, onDiscard, approving }: StagedTaskCardProps) {
  const [expanded,     setExpanded]     = useState(false);
  const [userSearch,   setUserSearch]   = useState('');
  const [showUserDrop, setShowUserDrop] = useState(false);

  const filteredUsers = users
    .filter((u) =>
      u.activo &&
      (u.nombre_completo.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.correo.toLowerCase().includes(userSearch.toLowerCase())),
    )
    .slice(0, 5);

  return (
    <div className="glass rounded-[18px] border border-slate-200/60 dark:border-slate-700/60 overflow-hidden" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Cabecera */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="w-8 h-8 shrink-0 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-sm mt-0.5">
          🤖
        </div>
        <div className="flex-1 min-w-0">
          <label htmlFor={`task-desc-${task.stagingId}`} className="sr-only">Descripción de tarea</label>
          <textarea
            id={`task-desc-${task.stagingId}`}
            value={task.tarea_descripcion}
            onChange={(e) => onUpdate({ tarea_descripcion: e.target.value })}
            rows={2}
            className="w-full text-sm font-medium text-slate-800 dark:text-white bg-transparent border-0 outline-none resize-none focus:ring-1 focus:ring-alzak-blue/30 rounded-lg px-1 -mx-1 py-0.5"
          />
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-[10px] text-alzak-blue dark:text-alzak-gold bg-alzak-blue/10 dark:bg-alzak-gold/10 px-2 py-0.5 rounded-md">
              {task.id_proyecto}
            </span>
            {task.ai_nota && (
              <span className="text-[10px] text-slate-400 truncate max-w-[200px]" title={task.ai_nota}>
                💡 {task.ai_nota}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-label="Editar detalles de la tarea"
            aria-expanded={expanded}
            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-alzak-blue/50"
          >
            ✏️
          </button>
          <button
            onClick={onDiscard}
            aria-label="Descartar tarea"
            className="text-[10px] text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus-visible:ring-2 focus-visible:ring-red-400/50"
          >
            ✕
          </button>
          <button
            onClick={onApprove}
            disabled={approving}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-alzak-blue text-white hover:bg-alzak-blue/90 disabled:opacity-50 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-alzak-blue/50"
          >
            {approving ? '...' : 'Aprobar'}
          </button>
        </div>
      </div>

      {/* Panel expandible */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700/40 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-800/30">

          {/* Responsable */}
          <div className="relative">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Responsable</p>
            {task.responsable_nombre && task.responsable_nombre !== 'Por asignar' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-alzak-blue/30 bg-alzak-blue/5 dark:bg-alzak-blue/10">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 flex-1 truncate">{task.responsable_nombre}</span>
                <button
                  type="button"
                  aria-label="Quitar responsable"
                  onClick={() => { onUpdate({ responsable_nombre: 'Por asignar', responsable_correo: '' }); setUserSearch(''); }}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >×</button>
              </div>
            ) : (
              <div>
                <label htmlFor={`user-search-${task.stagingId}`} className="sr-only">Buscar responsable</label>
                <input
                  id={`user-search-${task.stagingId}`}
                  type="text"
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setShowUserDrop(true); }}
                  onFocus={() => setShowUserDrop(true)}
                  placeholder="Buscar usuario..."
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
                />
                {showUserDrop && userSearch.length > 0 && filteredUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.correo}
                        type="button"
                        onMouseDown={() => {
                          onUpdate({ responsable_nombre: u.nombre_completo, responsable_correo: u.correo });
                          setUserSearch('');
                          setShowUserDrop(false);
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                      >
                        <span className="text-xs font-medium text-slate-700 dark:text-white">{u.nombre_completo}</span>
                        <span className="text-[10px] text-slate-400 ml-auto">{u.correo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fecha */}
          <div>
            <label htmlFor={`task-fecha-${task.stagingId}`} className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Fecha entrega
            </label>
            <input
              id={`task-fecha-${task.stagingId}`}
              type="date"
              value={task.fecha_entrega}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => onUpdate({ fecha_entrega: e.target.value })}
              className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
            />
          </div>

          {/* Prioridad */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Prioridad</p>
            <div className="flex gap-1.5">
              {PRIORIDADES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onUpdate({ prioridad: p })}
                  className={`flex-1 py-1 rounded-xl text-[10px] font-bold transition-all border ${
                    task.prioridad === p
                      ? `${PRIO_COLOR[p]} ring-1 border-transparent`
                      : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Estado inicial */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Estado inicial</p>
            <div className="flex gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onUpdate({ status_inicial: s })}
                  className={`flex-1 py-1 rounded-xl text-[10px] font-semibold transition-all border ${
                    task.status_inicial === s
                      ? 'bg-alzak-blue text-white border-transparent'
                      : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {s === 'Pendiente' ? '⚪' : s === 'En Proceso' ? '🔵' : '🟢'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
