"use client";

import { useState } from 'react';
import type { MockUser } from '@/lib/mockData';
import { Switch }        from '@/components/ui/Switch';
import { ROLE_CFG }      from './userConstants';

interface UserCardProps {
  u:         MockUser;
  canEdit:   boolean;
  onEdit:    () => void;
  onToggle:  () => void;
  onDelete:  (correo: string) => void;
}

export function UserCard({ u, canEdit, onEdit, onToggle, onDelete }: UserCardProps) {
  const rcfg     = ROLE_CFG[u.role];
  const initials = u.nombre_completo.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={`flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-[16px] border transition-all ${
      u.activo
        ? 'border-slate-100 dark:border-slate-700/50 shadow-sm'
        : 'border-slate-100 dark:border-slate-700/30 opacity-60'
    }`}>
      <div className="w-9 h-9 shrink-0 rounded-full bg-alzak-blue/15 dark:bg-alzak-gold/20 flex items-center justify-center text-xs font-bold text-alzak-blue dark:text-alzak-gold">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{u.nombre_completo}</p>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${rcfg.cls}`}>{rcfg.label}</span>
          {!u.activo && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              Inactivo
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 truncate">{u.correo}</p>
      </div>

      {canEdit && (
        <div className="flex items-center gap-2 shrink-0">
          {/* Confirmación de eliminación */}
          {confirming ? (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-red-500 font-semibold whitespace-nowrap">¿Eliminar?</span>
              <button
                onClick={() => { setConfirming(false); onDelete(u.correo); }}
                className="w-8 h-8 flex items-center justify-center font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                aria-label="Confirmar eliminación"
              >
                Sí
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                aria-label="Cancelar eliminación"
              >
                No
              </button>
            </div>
          ) : (
            <>
              <Switch checked={u.activo} onChange={onToggle} label={`${u.activo ? 'Desactivar' : 'Activar'} ${u.nombre_completo}`} />

              {/* Editar */}
              <button
                onClick={onEdit}
                aria-label={`Editar ${u.nombre_completo}`}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-alzak-blue dark:hover:text-alzak-gold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-alzak-blue/50"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              {/* Eliminar */}
              <button
                onClick={() => setConfirming(true)}
                aria-label={`Eliminar ${u.nombre_completo}`}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus-visible:ring-2 focus-visible:ring-red-400/50"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
