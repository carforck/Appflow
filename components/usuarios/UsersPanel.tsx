"use client";

import type { UserRole } from '@/context/AuthContext';
import type { MockUser }  from '@/lib/mockData';
import { UserCard }       from './UserCard';
import { UserFormModal }  from './UserFormModal';
import { ROLE_CFG }       from './userConstants';
import type { useUsuariosPage } from '@/hooks/useUsuariosPage';

type UsersPanelProps = ReturnType<typeof useUsuariosPage>;

export function UsersPanel(props: UsersPanelProps) {
  const {
    filtered, stats, canEdit, existingEmails,
    search, setSearch,
    filterRole, setFilterRole,
    filterActivo, setFilterActivo,
    modalUser, setModalUser,
    handleSave, handleToggleActivo, handleDelete,
  } = props;

  const total = stats.total;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-alzak-blue dark:text-white">Usuarios</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {stats.activos} activos · {total - stats.activos} inactivos · {stats.admins} con roles elevados
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setModalUser(null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark text-xs font-bold rounded-[12px] hover:opacity-90 active:scale-95 transition-all shadow-sm shrink-0 focus-visible:ring-2 focus-visible:ring-alzak-blue/50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo usuario
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-[16px] p-4 text-center">
          <p className="text-2xl font-bold text-alzak-blue dark:text-alzak-gold">{total}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Total</p>
        </div>
        <div className="glass rounded-[16px] p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.activos}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Activos</p>
        </div>
        <div className="glass rounded-[16px] p-4 text-center">
          <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{stats.admins}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Con acceso</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="user-search" className="sr-only">Buscar por nombre o correo</label>
          <input
            id="user-search"
            type="text"
            placeholder="Buscar por nombre o correo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30"
          />
          <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <label htmlFor="user-role-filter" className="sr-only">Filtrar por rol</label>
        <select
          id="user-role-filter"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as UserRole | 'Todos')}
          className="px-3 py-2 text-xs rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30"
        >
          <option value="Todos">Todos los roles</option>
          {(Object.keys(ROLE_CFG) as UserRole[]).map((r) => (
            <option key={r} value={r}>{ROLE_CFG[r].label}</option>
          ))}
        </select>

        <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-slate-800/60 rounded-[12px]">
          {(['Todos', 'Activos', 'Inactivos'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterActivo(f)}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
                filterActivo === f
                  ? 'bg-white dark:bg-slate-700 text-alzak-blue dark:text-alzak-gold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="glass rounded-[20px] p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <p className="text-3xl">👥</p>
            <p className="text-sm text-slate-400">Sin usuarios para este filtro</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((u: MockUser) => (
              <UserCard
                key={u.correo}
                u={u}
                canEdit={canEdit}
                onEdit={() => setModalUser(u)}
                onToggle={() => handleToggleActivo(u.correo)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 mt-3">
          {filtered.length} de {total} usuarios
        </p>
      </div>

      {/* Modal */}
      {modalUser !== undefined && (
        <UserFormModal
          initial={
            modalUser
              ? { correo: modalUser.correo, nombre_completo: modalUser.nombre_completo, role: modalUser.role, activo: modalUser.activo }
              : null
          }
          existingEmails={existingEmails}
          onSave={handleSave}
          onClose={() => setModalUser(undefined)}
        />
      )}
    </div>
  );
}
