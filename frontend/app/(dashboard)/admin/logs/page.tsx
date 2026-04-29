"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLogs, type LogEntry, type ActiveUser, type LogFilters } from '@/hooks/useLogs';

// ── Helpers ───────────────────────────────────────────────────────────────────
const ACCION_STYLE: Record<string, { badge: string }> = {
  Create:  { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  Update:  { badge: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400'   },
  Delete:  { badge: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400'    },
  Login:   { badge: 'bg-slate-100  text-slate-600  dark:bg-slate-700/60  dark:text-slate-300'  },
  Process: { badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  Access:  { badge: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400'  },
};

function formatTs(ts: string) {
  try {
    return new Date(ts).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return ts; }
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora mismo';
  if (m < 60) return `hace ${m}m`;
  return `hace ${Math.floor(m / 60)}h`;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ActiveUsersPanel({ users }: { users: ActiveUser[] }) {
  return (
    <div className="glass rounded-[20px] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-slate-800 dark:text-white text-sm">Usuarios Conectados</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">Sesiones activas en este momento</p>
        </div>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {users.length} online
        </span>
      </div>

      {users.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">Sin usuarios conectados</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {users.map((u) => (
            <div key={u.email} className="flex items-center gap-3 px-3 py-2.5 rounded-[14px] bg-white/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-alzak-blue/15 dark:bg-alzak-gold/20 flex items-center justify-center text-[10px] font-bold text-alzak-blue dark:text-alzak-gold">
                  {initials(u.nombre)}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{u.nombre}</p>
                <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${u.role === 'superadmin' ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                  {u.role}
                </span>
                <p className="text-[9px] text-slate-400 mt-0.5">{timeAgo(u.connectedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatsBar({ stats, filters, setFilters }: {
  stats: { byAccion: { accion: string; total: number }[] };
  filters: LogFilters;
  setFilters: (f: LogFilters) => void;
}) {
  const ACCIONES = ['Login', 'Create', 'Update', 'Delete', 'Process', 'Access'];
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {ACCIONES.map((a) => {
        const count = stats.byAccion.find((x) => x.accion === a)?.total ?? 0;
        const s = ACCION_STYLE[a] ?? { badge: 'bg-slate-100 text-slate-600' };
        const active = filters.accion === a;
        return (
          <button
            key={a}
            onClick={() => setFilters({ ...filters, accion: active ? 'Todas' : a, page: 1 })}
            aria-pressed={active}
            className={`glass rounded-[14px] p-3 text-center transition-all hover:shadow-sm ${active ? 'ring-2 ring-alzak-blue dark:ring-alzak-gold' : ''}`}
          >
            <p className="text-xl font-bold text-slate-800 dark:text-white">{count}</p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${s.badge}`}>{a}</span>
          </button>
        );
      })}
    </div>
  );
}

function LogRow({ log }: { log: LogEntry }) {
  const s = ACCION_STYLE[log.accion] ?? { badge: 'bg-slate-100 text-slate-600' };
  return (
    <tr className={`transition-all duration-700 ${log.isNew ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'}`}>
      <td className="px-4 py-3 text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {log.isNew && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
        {formatTs(log.created_at)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-alzak-blue/15 dark:bg-alzak-gold/20 flex items-center justify-center text-[9px] font-bold text-alzak-blue dark:text-alzak-gold shrink-0">
            {initials(log.usuario_nombre)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{log.usuario_nombre}</p>
            <p className="text-[10px] text-slate-400 truncate">{log.usuario_correo}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${s.badge}`}>
          {log.accion}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">{log.modulo}</td>
      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
        <p className="truncate" title={log.detalle ?? ''}>{log.detalle}</p>
      </td>
      <td className="px-4 py-3 text-[10px] font-mono text-slate-400 whitespace-nowrap hidden lg:table-cell">
        {log.ip_address ?? '—'}
      </td>
    </tr>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function LogsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user?.role !== 'superadmin') router.replace('/dashboard');
  }, [user, isLoading, router]);

  const { logs, total, stats, activeUsers, loading, filters, setFilters, totalPages } = useLogs();

  if (isLoading || user?.role !== 'superadmin') return null;

  const modulos = ['Todos', ...Array.from(new Set(stats.byModulo.map((m) => m.modulo)))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-alzak-blue dark:text-white">Auditoría del Sistema</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {total.toLocaleString()} eventos · {stats.recent24h} en las últimas 24h
            {loading && <span className="ml-2 inline-block w-3 h-3 rounded-full border-2 border-alzak-blue/40 border-t-alzak-blue animate-spin" />}
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="shrink-0 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-alzak-blue/40 transition-colors"
          aria-label="Recargar logs"
        >
          ↺ Recargar
        </button>
      </div>

      {/* Active users + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <ActiveUsersPanel users={activeUsers} />
        <StatsBar stats={stats} filters={filters} setFilters={setFilters} />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={filters.modulo}
          onChange={(e) => setFilters({ ...filters, modulo: e.target.value, page: 1 })}
          aria-label="Filtrar por módulo"
          className="px-3 py-2 text-sm rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
        >
          {modulos.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <div className="relative flex-1">
          <input
            type="search"
            placeholder="Buscar por usuario, módulo o detalle…"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })}
            aria-label="Buscar en logs"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
          />
          <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <p className="text-xs text-slate-400 self-center shrink-0 hidden sm:block">
          {total.toLocaleString()} resultado{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tabla */}
      <div className="glass rounded-[20px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50">
                {['Timestamp', 'Usuario', 'Acción', 'Módulo', 'Detalle', 'IP'].map((h, i) => (
                  <th key={h} className={`text-left px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${i === 5 ? 'hidden lg:table-cell' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <span className="inline-block w-5 h-5 rounded-full border-2 border-alzak-blue/30 border-t-alzak-blue animate-spin" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm text-slate-400">Sin resultados para ese filtro</td>
                </tr>
              ) : (
                logs.map((log) => <LogRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={filters.page <= 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            className="px-4 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:border-alzak-blue/40 transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Página {filters.page} de {totalPages}
          </span>
          <button
            disabled={filters.page >= totalPages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            className="px-4 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:border-alzak-blue/40 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
