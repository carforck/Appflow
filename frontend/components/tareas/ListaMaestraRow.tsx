"use client";

import { useState, useEffect } from 'react';
import type { TaskWithMeta } from '@/context/TaskStoreContext';
import type { MockUser } from '@/lib/mockData';
import type { MaestroChanges, ProjectCascade } from '@/hooks/useListaMaestra';
import type { TareaPrioridad } from '@/lib/mockData';

const PRIO_PILL: Record<TareaPrioridad, string> = {
  Alta:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Baja:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

const STATUS_BADGE: Record<string, string> = {
  'Pendiente':  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  'En Proceso': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Completada': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

interface Props {
  task:       TaskWithMeta;
  users:      MockUser[];
  projectMap: Record<string, ProjectCascade>;
  onUpdate:   (changes: MaestroChanges) => Promise<boolean>;
}

export default function ListaMaestraRow({ task, users, projectMap, onUpdate }: Props) {
  const cascade = projectMap[task.id_proyecto];

  const [showUsers,       setShowUsers]       = useState(false);
  const [userSearch,      setUserSearch]       = useState('');
  const [editResponsable, setEditResponsable] = useState(false);
  const [fechaInicio,     setFechaInicio]     = useState(task.fecha_inicio ?? '');
  const [fechaFin,        setFechaFin]        = useState(task.fecha_entrega ?? '');

  useEffect(() => { setFechaInicio(task.fecha_inicio ?? ''); }, [task.fecha_inicio]);
  useEffect(() => { setFechaFin(task.fecha_entrega ?? ''); },  [task.fecha_entrega]);

  const filteredUsers = users
    .filter((u) => u.activo && (
      !userSearch ||
      u.nombre_completo.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.correo.toLowerCase().includes(userSearch.toLowerCase())
    ))
    .slice(0, 6);

  return (
    <tr className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors align-top">

      {/* ID Proyecto */}
      <td className="px-2 py-1.5 whitespace-nowrap">
        <span className="font-mono text-[10px] font-bold bg-alzak-blue/10 dark:bg-alzak-gold/10 text-alzak-blue dark:text-alzak-gold px-1.5 py-0.5 rounded-md">
          {task.id_proyecto}
        </span>
      </td>

      {/* Nombre Proyecto — cascada */}
      <td className="px-2 py-1.5">
        <span className="text-[10px] font-medium text-slate-700 dark:text-slate-200 line-clamp-2 block">
          {cascade?.nombre_proyecto ?? task.nombre_proyecto}
        </span>
      </td>

      {/* Empresa — cascada */}
      <td className="px-2 py-1.5">
        <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 block">
          {cascade?.empresa ?? '—'}
        </span>
      </td>

      {/* Financiador — cascada */}
      <td className="px-2 py-1.5">
        <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 block">
          {cascade?.financiador ?? '—'}
        </span>
      </td>

      {/* Tarea — solo lectura */}
      <td className="px-2 py-1.5">
        <span className="text-[10px] text-slate-800 dark:text-slate-100 line-clamp-3 block min-w-[140px]">
          {task.tarea_descripcion}
        </span>
      </td>

      {/* Estado — badge solo lectura */}
      <td className="px-2 py-1.5 whitespace-nowrap">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[task.status] ?? STATUS_BADGE['Pendiente']}`}>
          {task.status}
        </span>
      </td>

      {/* Responsable — editable con × */}
      <td className="px-2 py-1.5">
        <div className="relative">
          {task.responsable_nombre && !editResponsable ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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

      {/* Prioridad — pill buttons editables */}
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

      {/* Fecha Inicio — editable */}
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

      {/* Fecha Entrega — editable */}
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
