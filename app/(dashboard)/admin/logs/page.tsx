"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MOCK_LOGS, MockLogEntry } from '@/lib/mockData';

// ── Estilos por acción ─────────────────────────────────────────────────────────
const ACCION_STYLE: Record<MockLogEntry['accion'], { badge: string; label: string }> = {
  Create:  { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Create'  },
  Update:  { badge: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',   label: 'Update'  },
  Delete:  { badge: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',    label: 'Delete'  },
  Login:   { badge: 'bg-slate-100  text-slate-600  dark:bg-slate-700/60  dark:text-slate-300',  label: 'Login'   },
  Process: { badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', label: 'Process' },
  Access:  { badge: 'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',  label: 'Access'  },
};

function formatTs(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString('es-ES', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return ts; }
}

// ── System Health Component ────────────────────────────────────────────────────
const HEALTH_SERVICES = [
  { name: 'Groq API',       status: 'operational', latency: '212 ms', detail: 'llama-3.3-70b-versatile' },
  { name: 'MySQL (SSH)',     status: 'warning',     latency: '11 ms',  detail: 'Túnel SSH 127.0.0.1:3307' },
  { name: 'Backend API',    status: 'operational', latency: '6 ms',   detail: 'Express · Puerto 3000'    },
  { name: 'Auth / JWT',     status: 'operational', latency: '2 ms',   detail: 'Exp. 8h · bcryptjs'       },
];

const STATUS_DOT: Record<string, string> = {
  operational: 'bg-emerald-500',
  warning:     'bg-amber-400',
  down:        'bg-red-500',
};
const STATUS_TEXT: Record<string, string> = {
  operational: 'text-emerald-600 dark:text-emerald-400',
  warning:     'text-amber-600 dark:text-amber-400',
  down:        'text-red-600 dark:text-red-400',
};
const STATUS_LABEL: Record<string, string> = {
  operational: 'Operational',
  warning:     'Via SSH',
  down:        'Down',
};

function SystemHealth() {
  return (
    <div className="glass rounded-[20px] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-slate-800 dark:text-white text-sm">System Health</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">Simulado · Actualizado 2026-04-13 17:00</p>
        </div>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          3/4 OK
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {HEALTH_SERVICES.map((svc) => (
          <div
            key={svc.name}
            className="flex items-center gap-3 px-3 py-3 rounded-[14px] bg-white/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50"
          >
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[svc.status]} ${svc.status === 'operational' ? 'shadow-[0_0_6px_2px_rgba(34,197,94,0.4)]' : ''}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{svc.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{svc.detail}</p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-[10px] font-bold ${STATUS_TEXT[svc.status]}`}>{STATUS_LABEL[svc.status]}</p>
              <p className="text-[9px] text-slate-400">{svc.latency}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function LogsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Guard: solo superadmin
  useEffect(() => {
    if (!isLoading && user?.role !== 'superadmin') {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  const [filterAccion, setFilterAccion] = useState<MockLogEntry['accion'] | 'Todas'>('Todas');
  const [filterModulo, setFilterModulo] = useState('Todos');
  const [search, setSearch] = useState('');

  const modulos = ['Todos', ...Array.from(new Set(MOCK_LOGS.map((l) => l.modulo)))];

  const logs = MOCK_LOGS
    .filter((l) => filterAccion === 'Todas' || l.accion === filterAccion)
    .filter((l) => filterModulo === 'Todos' || l.modulo === filterModulo)
    .filter((l) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        l.usuario.toLowerCase().includes(q) ||
        l.detalle.toLowerCase().includes(q) ||
        l.modulo.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (isLoading || user?.role !== 'superadmin') return null;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-alzak-blue dark:text-white">Auditoría del Sistema</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Activity log · {MOCK_LOGS.length} eventos registrados
        </p>
      </div>

      {/* ── System Health ── */}
      <SystemHealth />

      {/* ── Stats rápidos del log ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {(['Login', 'Create', 'Update', 'Delete', 'Process', 'Access'] as MockLogEntry['accion'][]).map((a) => {
          const count = MOCK_LOGS.filter((l) => l.accion === a).length;
          const s = ACCION_STYLE[a];
          return (
            <button
              key={a}
              onClick={() => setFilterAccion(filterAccion === a ? 'Todas' : a)}
              className={`glass rounded-[14px] p-3 text-center transition-all hover:shadow-sm ${filterAccion === a ? 'ring-2 ring-alzak-blue dark:ring-alzak-gold' : ''}`}
            >
              <p className="text-xl font-bold text-slate-800 dark:text-white">{count}</p>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${s.badge}`}>{a}</span>
            </button>
          );
        })}
      </div>

      {/* ── Filtros y buscador ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Módulo */}
        <select
          value={filterModulo}
          onChange={(e) => setFilterModulo(e.target.value)}
          className="px-3 py-2 text-sm rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 dark:focus:ring-alzak-gold/40"
        >
          {modulos.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        {/* Buscador */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar por usuario, acción, módulo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 dark:focus:ring-alzak-gold/40"
          />
          <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <p className="text-xs text-slate-400 self-center shrink-0 hidden sm:block">
          {logs.length} resultado{logs.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Tabla de logs ── */}
      <div className="glass rounded-[20px] overflow-hidden">
        <div className="overflow-x-auto kanban-scroll">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/50">
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Timestamp</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Usuario</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acción</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Módulo</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-sm text-slate-400">
                    Sin resultados para ese filtro
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const s = ACCION_STYLE[log.accion];
                  const initials = log.usuario.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="px-4 py-3 text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatTs(log.timestamp)}
                      </td>

                      {/* Usuario */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-alzak-blue/15 dark:bg-alzak-gold/20 flex items-center justify-center text-[9px] font-bold text-alzak-blue dark:text-alzak-gold shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{log.usuario}</p>
                            <p className="text-[10px] text-slate-400 truncate">{log.correo}</p>
                          </div>
                        </div>
                      </td>

                      {/* Acción */}
                      <td className="px-4 py-3">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${s.badge}`}>
                          {s.label}
                        </span>
                      </td>

                      {/* Módulo */}
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {log.modulo}
                      </td>

                      {/* Detalle */}
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                        <p className="truncate" title={log.detalle}>{log.detalle}</p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
