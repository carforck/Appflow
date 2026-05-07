"use client";

import { useState, useEffect } from 'react';
import type { TaskWithMeta } from '@/context/TaskStoreContext';
import type { MockUser, MockProject } from '@/lib/mockData';
import type { MaestroChanges, ProjectCascade } from '@/hooks/useListaMaestra';
import type { TareaPrioridad, TareaStatus } from '@/lib/mockData';

const PRIO_PILL: Record<TareaPrioridad, string> = {
  Alta:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Baja:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

const STATUS_PILL: Record<string, string> = {
  'Pendiente':  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  'En Proceso': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Completada': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const SEL = 'w-full text-[10px] px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-alzak-blue/40 cursor-pointer';

interface Props {
  task:       TaskWithMeta;
  users:      MockUser[];
  projects:   MockProject[];
  projectMap: Record<string, ProjectCascade>;
  onUpdate:   (changes: MaestroChanges) => Promise<boolean>;
}

export default function ListaMaestraRow({ task, users, projects, projectMap, onUpdate }: Props) {
  const [localProjId,  setLocalProjId]  = useState(task.id_proyecto);
  const [editDesc,     setEditDesc]     = useState(false);
  const [descValue,    setDescValue]    = useState(task.tarea_descripcion);
  const [showUsers,    setShowUsers]    = useState(false);
  const [userSearch,   setUserSearch]   = useState('');
  const [editResp,     setEditResp]     = useState(false);
  const [fechaInicio,  setFechaInicio]  = useState(task.fecha_inicio  ?? '');
  const [fechaFin,     setFechaFin]     = useState(task.fecha_entrega ?? '');

  useEffect(() => { setLocalProjId(task.id_proyecto);      }, [task.id_proyecto]);
  useEffect(() => { setDescValue(task.tarea_descripcion);  }, [task.tarea_descripcion]);
  useEffect(() => { setFechaInicio(task.fecha_inicio ?? ''); }, [task.fecha_inicio]);
  useEffect(() => { setFechaFin(task.fecha_entrega ?? '');   }, [task.fecha_entrega]);

  const cascade = projectMap[localProjId];

  const handleProject = (newId: string) => {
    setLocalProjId(newId);
    onUpdate({ id_proyecto: newId });
  };

  const filteredUsers = users
    .filter((u) => u.activo && (!userSearch
      || u.nombre_completo.toLowerCase().includes(userSearch.toLowerCase())
      || u.correo.toLowerCase().includes(userSearch.toLowerCase())))
    .slice(0, 6);

  return (
    <tr className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors align-top">

      {/* ID Proyecto — select por ID */}
      <td className="px-2 py-1.5">
        <select value={localProjId} onChange={(e) => handleProject(e.target.value)} className={SEL} aria-label="ID de proyecto">
          {projects.map((p) => (
            <option key={p.id_proyecto} value={p.id_proyecto}>{p.id_proyecto}</option>
          ))}
        </select>
      </td>

      {/* Nombre Proyecto — select por nombre, mismo state → bidireccional */}
      <td className="px-2 py-1.5">
        <select value={localProjId} onChange={(e) => handleProject(e.target.value)} className={SEL} aria-label="Nombre de proyecto">
          {projects.map((p) => (
            <option key={p.id_proyecto} value={p.id_proyecto}>{p.nombre_proyecto}</option>
          ))}
        </select>
      </td>

      {/* Empresa — auto-populated desde el proyecto seleccionado */}
      <td className="px-2 py-1.5">
        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{cascade?.empresa ?? '—'}</span>
      </td>

      {/* Financiador — auto-populated */}
      <td className="px-2 py-1.5">
        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{cascade?.financiador ?? '—'}</span>
      </td>

      {/* ID Tarea */}
      <td className="px-2 py-1.5 whitespace-nowrap">
        <span className="text-[9px] font-bold text-alzak-blue/70 dark:text-alzak-gold/70 bg-alzak-blue/8 dark:bg-alzak-gold/10 px-1.5 py-0.5 rounded-full">
          #{task.id}
        </span>
      </td>

      {/* Tarea — clic para editar, Escape para cancelar */}
      <td className="px-2 py-1.5">
        {editDesc ? (
          <textarea
            value={descValue}
            autoFocus
            rows={3}
            onChange={(e) => setDescValue(e.target.value)}
            onBlur={() => {
              setEditDesc(false);
              if (descValue.trim() && descValue !== task.tarea_descripcion)
                onUpdate({ tarea_descripcion: descValue.trim() });
              else setDescValue(task.tarea_descripcion);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setEditDesc(false); setDescValue(task.tarea_descripcion); }
            }}
            aria-label="Descripción de la tarea"
            className="w-full text-[10px] px-2 py-1 rounded-lg border border-alzak-blue/40 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-alzak-blue/40 resize-none min-w-[140px]"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditDesc(true)}
            aria-label="Editar descripción de la tarea"
            className="text-[10px] text-slate-800 dark:text-slate-100 text-left w-full line-clamp-3 hover:bg-slate-100 dark:hover:bg-slate-700/40 rounded px-1 py-0.5 transition-colors min-w-[140px]"
          >
            {descValue || '—'}
          </button>
        )}
      </td>

      {/* Estado — pills editables */}
      <td className="px-2 py-1.5">
        <div className="flex flex-col gap-0.5">
          {(['Pendiente', 'En Proceso', 'Completada'] as TareaStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onUpdate({ estado_tarea: s })}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all border ${
                task.status === s
                  ? `${STATUS_PILL[s]} border-transparent`
                  : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </td>

      {/* Responsable — editable con búsqueda */}
      <td className="px-2 py-1.5">
        <div className="relative">
          {task.responsable_nombre && !editResp ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <span className="text-[10px] truncate flex-1 text-slate-700 dark:text-slate-200 min-w-0">{task.responsable_nombre}</span>
              <button
                type="button"
                aria-label="Cambiar responsable"
                onClick={() => { setEditResp(true); setShowUsers(true); setUserSearch(''); }}
                className="shrink-0 text-slate-400 hover:text-red-500 dark:hover:text-red-400 text-sm font-bold w-4 h-4 flex items-center justify-center rounded transition-colors"
              >×</button>
            </div>
          ) : (
            <input
              type="text"
              value={userSearch}
              autoFocus={editResp}
              onChange={(e) => { setUserSearch(e.target.value); setShowUsers(true); }}
              onFocus={() => setShowUsers(true)}
              onBlur={() => setTimeout(() => { setShowUsers(false); setEditResp(false); setUserSearch(''); }, 150)}
              placeholder="Buscar usuario..."
              aria-label="Buscar responsable"
              className="w-full text-[10px] px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-alzak-blue/40"
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
                    setUserSearch(''); setShowUsers(false); setEditResp(false);
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

      {/* Prioridad — pills editables */}
      <td className="px-2 py-1.5">
        <div className="flex flex-col gap-0.5">
          {(['Alta', 'Media', 'Baja'] as TareaPrioridad[]).map((p) => (
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
        {!fechaInicio && <span className="text-[9px] text-slate-400">—</span>}
      </td>

      {/* Fecha Entrega */}
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
    </tr>
  );
}
