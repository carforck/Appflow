"use client";

import { useUsuariosPage } from '@/hooks/useUsuariosPage';
import { UsersPanel }      from '@/components/usuarios/UsersPanel';

export default function UsuariosPage() {
  const state = useUsuariosPage();

  if (state.isLoading || state.isRedirecting) return null;

  if (state.usersLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 rounded-[10px] bg-slate-200 dark:bg-slate-700 animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="glass rounded-[16px] p-4 h-20 animate-pulse" />)}
        </div>
        <div className="glass rounded-[20px] p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-[14px] bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (state.usersError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-4xl">⚠️</p>
        <p className="text-base font-bold text-slate-700 dark:text-slate-200">No se pudieron cargar los usuarios</p>
        <p className="text-sm text-red-500">{state.usersError}</p>
        <button
          onClick={state.refreshUsers}
          className="px-5 py-2.5 rounded-[12px] bg-alzak-blue text-white text-sm font-bold hover:bg-alzak-blue/90 transition-colors shadow-md"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return <UsersPanel {...state} />;
}
