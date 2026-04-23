"use client";

import { useState } from 'react';
import type { RevisionTask, RevisionChanges } from '@/hooks/useRevision';
import type { MockUser } from '@/lib/mockData';

const PRIO_COLOR: Record<string, string> = {
  Alta:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 ring-red-400',
  Media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-amber-400',
  Baja:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 ring-green-400',
};

interface Props {
  task:       RevisionTask;
  users:      MockUser[];
  approving:  boolean;
  rejecting:  boolean;
  onApprove:  () => void;
  onReject:   () => void;
  onUpdate:   (changes: RevisionChanges) => Promise<boolean>;
}

export default function RevisionCard({ task, users, approving, rejecting, onApprove, onReject, onUpdate }: Props) {
  const [expanded,     setExpanded]     = useState(false);
  const [desc,         setDesc]         = useState(task.tarea_descripcion);
  const [userSearch,   setUserSearch]   = useState('');
  const [showDrop,     setShowDrop]     = useState(false);
  const [saving,       setSaving]       = useState(false);

  const filteredUsers = users
    .filter((u) => u.activo && (
      u.nombre_completo.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.correo.toLowerCase().includes(userSearch.toLowerCase())
    ))
    .slice(0, 5);

  const handleSaveDesc = async () => {
    if (desc === task.tarea_descripcion) return;
    setSaving(true);
    await onUpdate({ tarea_descripcion: desc });
    setSaving(false);
  };

  const origen = task.resumen_meeting?.match(/^\[Drive: ([^\]]+)\]/)?.[1];

  return (
    <div className="glass rounded-[18px] border border-slate-200/60 dark:border-slate-700/60 overflow-hidden" style={{ background: 'var(--sidebar-bg)' }}>
      {/* ── Cabecera ── */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="w-8 h-8 shrink-0 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-sm mt-0.5" aria-hidden>
          🤖
        </div>

        <div className="flex-1 min-w-0">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={handleSaveDesc}
            rows={2}
            aria-label="Descripción de la tarea"
            className="w-full text-sm font-medium text-slate-800 dark:text-white bg-transparent border-0 outline-none resize-none focus:ring-1 focus:ring-alzak-blue/30 rounded-lg px-1 -mx-1 py-0.5"
          />
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="font-mono text-[10px] text-alzak-blue dark:text-alzak-gold bg-alzak-blue/10 dark:bg-alzak-gold/10 px-2 py-0.5 rounded-md">
              {task.id_proyecto} · {task.nombre_proyecto}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${PRIO_COLOR[task.prioridad] ?? PRIO_COLOR.Media}`}>
              {task.prioridad}
            </span>
            <span className="text-[10px] text-slate-400">{task.fecha_entrega}</span>
            {saving && <span className="text-[10px] text-slate-400 animate-pulse">guardando...</span>}
            {origen && (
              <span className="text-[10px] text-violet-500 dark:text-violet-400 truncate max-w-[180px]" title={origen}>
                📄 {origen}
              </span>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Colapsar edición' : 'Expandir edición'}
            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✏️
          </button>
          <button
            onClick={onReject}
            disabled={rejecting || approving}
            aria-label="Rechazar tarea"
            className="text-[10px] text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
          >
            {rejecting ? '...' : '✕'}
          </button>
          <button
            onClick={onApprove}
            disabled={approving || rejecting}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-sm"
          >
            {approving ? '...' : 'Aprobar'}
          </button>
        </div>
      </div>

      {/* ── Panel expandible ── */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700/40 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-800/30">

          {/* Responsable */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Responsable
            </label>
            {task.responsable_nombre && task.responsable_nombre !== 'Por asignar' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-alzak-blue/30 bg-alzak-blue/5 dark:bg-alzak-blue/10">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 flex-1 truncate">{task.responsable_nombre}</span>
                <button
                  type="button"
                  aria-label="Quitar responsable"
                  onClick={() => onUpdate({ responsable_nombre: 'Por asignar', responsable_correo: '' })}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >×</button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setShowDrop(true); }}
                  onFocus={() => setShowDrop(true)}
                  placeholder="Buscar usuario..."
                  aria-label="Buscar responsable"
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
                />
                {showDrop && userSearch.length > 0 && filteredUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.correo}
                        type="button"
                        onMouseDown={() => {
                          onUpdate({ responsable_nombre: u.nombre_completo, responsable_correo: u.correo });
                          setUserSearch('');
                          setShowDrop(false);
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
            <label htmlFor={`fecha-${task.id}`} className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Fecha entrega
            </label>
            <input
              id={`fecha-${task.id}`}
              type="date"
              defaultValue={task.fecha_entrega}
              onBlur={(e) => { if (e.target.value) onUpdate({ fecha_entrega: e.target.value }); }}
              className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
            />
          </div>

          {/* Prioridad */}
          <div className="sm:col-span-2">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Prioridad</p>
            <div className="flex gap-1.5">
              {(['Alta', 'Media', 'Baja'] as const).map((p) => (
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
        </div>
      )}
    </div>
  );
}
