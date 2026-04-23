"use client";

import { useState, useEffect } from 'react';
import type { RevisionTask, RevisionChanges } from '@/hooks/useRevision';
import type { MockUser }    from '@/lib/mockData';
import type { MockProject } from '@/lib/mockData';

export type ProjectInfo = Pick<MockProject, 'id_proyecto' | 'nombre_proyecto'> & {
  empresa?: string | null;
  financiador?: string | null;
};

const PRIO_PILL: Record<string, string> = {
  Alta:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Baja:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

interface Props {
  task:       RevisionTask;
  users:      MockUser[];
  projects:   ProjectInfo[];
  projectMap: Record<string, ProjectInfo>;
  approving:  boolean;
  rejecting:  boolean;
  isInvalid:  boolean;
  onApprove:  () => void;
  onReject:   () => void;
  onUpdate:   (changes: RevisionChanges) => Promise<boolean>;
}

export default function RevisionRow({
  task, users, projects, projectMap,
  approving, rejecting, isInvalid,
  onApprove, onReject, onUpdate,
}: Props) {
  const [desc,           setDesc]           = useState(task.tarea_descripcion);
  const [showUsers,      setShowUsers]      = useState(false);
  const [userSearch,     setUserSearch]     = useState('');
  const [saving,         setSaving]         = useState(false);
  const [editResponsable, setEditResponsable] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(task.fecha_inicio ?? '');
  const [fechaFin,    setFechaFin]    = useState(task.fecha_entrega ?? '');

  const [proyId,      setProyId]      = useState(task.id_proyecto);
  const [proyNombre,  setProyNombre]  = useState(task.nombre_proyecto);
  const [empresa,     setEmpresa]     = useState(task.empresa ?? '');
  const [financiador, setFinanciador] = useState(task.financiador ?? '');

  // Sync local state when the server refreshes task data
  useEffect(() => { setDesc(task.tarea_descripcion); },           [task.tarea_descripcion]);
  useEffect(() => { setProyId(task.id_proyecto); },               [task.id_proyecto]);
  useEffect(() => { setProyNombre(task.nombre_proyecto); },       [task.nombre_proyecto]);
  useEffect(() => { setEmpresa(task.empresa ?? ''); },            [task.empresa]);
  useEffect(() => { setFinanciador(task.financiador ?? ''); },    [task.financiador]);
  useEffect(() => { setFechaInicio(task.fecha_inicio ?? ''); },   [task.fecha_inicio]);
  useEffect(() => { setFechaFin(task.fecha_entrega ?? ''); },     [task.fecha_entrega]);

  // Granularidad: qué campo específico está vacío
  const isProjectInvalid    = isInvalid && !proyId;
  const isResponsableInvalid = isInvalid && !task.responsable_correo;

  const filteredUsers = users
    .filter((u) => u.activo && (
      !userSearch ||
      u.nombre_completo.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.correo.toLowerCase().includes(userSearch.toLowerCase())
    ))
    .slice(0, 6);

  const saveDesc = async () => {
    if (desc === task.tarea_descripcion) return;
    setSaving(true);
    await onUpdate({ tarea_descripcion: desc });
    setSaving(false);
  };

  const handleProjectChange = async (newId: string) => {
    const info = projectMap[newId];
    setProyId(newId);
    setProyNombre(info?.nombre_proyecto ?? newId);
    setEmpresa(info?.empresa ?? '');
    setFinanciador(info?.financiador ?? '');
    await onUpdate({ id_proyecto: newId });
  };

  return (
    <tr
      data-row-id={task.id}
      className={
        isInvalid
          ? 'border-b border-red-300 dark:border-red-700 bg-red-100 dark:bg-red-900/15 align-top'
          : 'border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors align-top'
      }
    >
      {/* ID Proyecto — dropdown con cascada */}
      <td className="px-2 py-1.5 whitespace-nowrap">
        <select
          value={proyId}
          onChange={(e) => handleProjectChange(e.target.value)}
          aria-label="Seleccionar proyecto"
          className={`text-[10px] font-mono font-bold rounded-md px-1.5 py-0.5 border focus:outline-none focus:ring-1 w-[96px] ${
            isProjectInvalid
              ? 'border-red-500 ring-1 ring-red-400 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              : proyId
                ? 'border-slate-200 dark:border-slate-700 bg-alzak-blue/10 dark:bg-alzak-gold/10 text-alzak-blue dark:text-alzak-gold focus:ring-alzak-blue/40'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 focus:ring-alzak-blue/40'
          }`}
        >
          <option value="">— Proyecto —</option>
          {projects.map((p) => (
            <option key={p.id_proyecto} value={p.id_proyecto}>{p.id_proyecto}</option>
          ))}
        </select>
      </td>

      {/* Nombre Proyecto — cascada */}
      <td className="px-2 py-1.5">
        <span className="text-[10px] font-medium text-slate-700 dark:text-slate-200 line-clamp-2 block">
          {proyNombre || <span className="text-slate-400 italic">—</span>}
        </span>
      </td>

      {/* Empresa — cascada */}
      <td className="px-2 py-1.5">
        <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 block">
          {empresa || '—'}
        </span>
      </td>

      {/* Financiador — cascada */}
      <td className="px-2 py-1.5">
        <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 block">
          {financiador || '—'}
        </span>
      </td>

      {/* Tarea — editable */}
      <td className="px-2 py-1.5">
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={saveDesc}
          rows={2}
          aria-label="Descripción de la tarea"
          className="w-full text-[10px] text-slate-800 dark:text-slate-100 bg-transparent border-0 outline-none resize-none focus:ring-1 focus:ring-alzak-blue/30 rounded px-1 -mx-1 py-0 min-w-[160px]"
        />
        {saving && <span className="text-[9px] text-slate-400 animate-pulse">guardando...</span>}
      </td>

      {/* Responsable — siempre editable */}
      <td className="px-2 py-1.5">
        <div className="relative">
          {task.responsable_nombre && task.responsable_nombre !== 'Por asignar' && !editResponsable ? (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${
              isResponsableInvalid
                ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}>
              <span className="text-[10px] truncate flex-1 text-slate-700 dark:text-slate-200 min-w-0">
                {task.responsable_nombre}
              </span>
              <button
                type="button"
                aria-label="Cambiar responsable"
                onClick={() => { setEditResponsable(true); setShowUsers(true); setUserSearch(''); }}
                className="shrink-0 text-slate-400 hover:text-red-500 dark:hover:text-red-400 text-sm font-bold leading-none w-4 h-4 flex items-center justify-center rounded transition-colors"
              >×</button>
            </div>
          ) : (
            <input
              type="text"
              value={userSearch}
              autoFocus={editResponsable}
              onChange={(e) => { setUserSearch(e.target.value); setShowUsers(true); }}
              onFocus={() => setShowUsers(true)}
              onBlur={() => setTimeout(() => { setShowUsers(false); setEditResponsable(false); setUserSearch(''); }, 150)}
              placeholder="Buscar usuario..."
              aria-label="Buscar responsable"
              className={`w-full text-[10px] px-2 py-1 rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 ${
                isResponsableInvalid
                  ? 'border-red-500 ring-1 ring-red-400 focus:ring-red-400'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-alzak-blue/40'
              }`}
            />
          )}
          {showUsers && filteredUsers.length > 0 && (
            <div className="absolute z-20 left-0 top-full mt-1 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
              {filteredUsers.map((u) => (
                <button
                  key={u.correo}
                  type="button"
                  onMouseDown={() => {
                    onUpdate({ responsable_nombre: u.nombre_completo, responsable_correo: u.correo });
                    setUserSearch('');
                    setShowUsers(false);
                    setEditResponsable(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <p className="text-[10px] font-medium text-slate-700 dark:text-white truncate">{u.nombre_completo}</p>
                  <p className="text-[9px] text-slate-400 truncate">{u.correo}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Prioridad */}
      <td className="px-2 py-1.5">
        <div className="flex flex-col gap-0.5">
          {(['Alta', 'Media', 'Baja'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onUpdate({ prioridad: p })}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all border ${
                task.prioridad === p
                  ? `${PRIO_PILL[p]} border-transparent`
                  : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </td>

      {/* Fecha Inicio */}
      <td className="px-2 py-1.5 whitespace-nowrap">
        <input
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          onBlur={(e) => { if (e.target.value) onUpdate({ fecha_inicio: e.target.value }); }}
          aria-label="Fecha de inicio"
          className="text-[10px] px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-alzak-blue/40 w-[106px]"
        />
      </td>

      {/* Fecha Fin */}
      <td className="px-2 py-1.5 whitespace-nowrap">
        <input
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
          onBlur={(e) => { if (e.target.value) onUpdate({ fecha_entrega: e.target.value }); }}
          aria-label="Fecha de entrega"
          className="text-[10px] px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-alzak-blue/40 w-[106px]"
        />
      </td>

      {/* Acciones */}
      <td className="px-2 py-1.5 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <button
            onClick={onReject}
            disabled={rejecting || approving}
            aria-label="Rechazar tarea"
            className="px-2 py-1 rounded-lg text-[10px] font-semibold text-red-500 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
          >
            {rejecting ? '...' : 'Rechazar'}
          </button>
          <button
            onClick={onApprove}
            disabled={approving || rejecting}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-sm"
          >
            {approving ? '...' : 'Aprobar ✓'}
          </button>
        </div>
      </td>
    </tr>
  );
}
