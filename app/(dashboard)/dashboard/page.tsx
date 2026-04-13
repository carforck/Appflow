"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { useTaskStore } from '@/context/TaskStoreContext';
import { MOCK_PROJECTS, TareaPrioridad } from '@/lib/mockData';

// Charts cargados dinámicamente (evita SSR issues con recharts)
const ProgresoBarChart = dynamic(
  () => import('@/components/ProjectCharts').then((m) => m.ProgresoBarChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
const CargaPieChart = dynamic(
  () => import('@/components/ProjectCharts').then((m) => m.CargaPieChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

function ChartSkeleton() {
  return (
    <div className="h-[220px] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-alzak-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────────
const PRIORIDAD_DOT: Record<TareaPrioridad, string> = {
  Alta:  'bg-red-500',
  Media: 'bg-yellow-400',
  Baja:  'bg-emerald-500',
};

const PRIORIDAD_BADGE: Record<TareaPrioridad, string> = {
  Alta:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Media: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Baja:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

// ── StatCard ───────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, bg }: {
  label: string; value: number | string; sub?: string; color: string; bg: string;
}) {
  return (
    <div className={`glass rounded-[20px] p-5 ${bg}`}>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

// ── Filtros de periodo ─────────────────────────────────────────────────────────
const PERIODOS = [
  { label: 'Este mes',        key: '30d'  },
  { label: 'Últimos 3 meses', key: '90d'  },
  { label: 'Todo',            key: 'all'  },
] as const;
type Periodo = typeof PERIODOS[number]['key'];

function inPeriodo(dateStr: string, periodo: Periodo) {
  if (periodo === 'all') return true;
  const days = periodo === '30d' ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return new Date(dateStr) >= cutoff;
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const { tasks } = useTaskStore();
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const [filterProyecto, setFilterProyecto] = useState('Todos');
  const [periodo,        setPeriodo]        = useState<Periodo>('all');

  const hoy = new Date();

  // Tareas base según rol
  const baseTasks = isAdmin
    ? tasks
    : tasks.filter((t) => t.responsable_correo === user?.email);

  // Aplicar filtros de gráfica
  const filteredForCharts = useMemo(() => {
    return baseTasks
      .filter((t) => filterProyecto === 'Todos' || t.id_proyecto === filterProyecto)
      .filter((t) => inPeriodo(t.fecha_entrega, periodo));
  }, [baseTasks, filterProyecto, periodo]);

  // Stats
  const alta       = baseTasks.filter((t) => t.prioridad === 'Alta' && t.status !== 'Completada').length;
  const vencidas   = baseTasks.filter((t) => t.fecha_entrega && new Date(t.fecha_entrega) < hoy && t.status !== 'Completada').length;
  const enProceso  = baseTasks.filter((t) => t.status === 'En Proceso').length;
  const completadas = baseTasks.filter((t) => t.status === 'Completada').length;
  const proyectos  = new Set(baseTasks.map((t) => t.id_proyecto)).size;

  // Tareas próximas (no completadas, ordenadas por fecha)
  const recientes = [...baseTasks]
    .filter((t) => t.status !== 'Completada')
    .sort((a, b) => new Date(a.fecha_entrega).getTime() - new Date(b.fecha_entrega).getTime())
    .slice(0, 5);

  // Proyectos con progreso
  const proyectoStats = Object.entries(MOCK_PROJECTS)
    .map(([id, nombre]) => {
      const pt = baseTasks.filter((t) => t.id_proyecto === id);
      if (pt.length === 0) return null;
      return {
        id, nombre,
        total:       pt.length,
        completadas: pt.filter((t) => t.status === 'Completada').length,
      };
    })
    .filter(Boolean) as { id: string; nombre: string; total: number; completadas: number }[];

  const proyectosOptions = ['Todos', ...Object.keys(MOCK_PROJECTS).filter((id) => id !== '1111')];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-alzak-blue dark:text-white">
          Hola, {user?.nombre?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {isAdmin ? 'Visión global · Alzak Flow' : 'Tu resumen personal de tareas'}
          {user?.role !== 'user' && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-alzak-blue/10 dark:bg-alzak-gold/10 text-alzak-blue dark:text-alzak-gold text-[10px] font-bold uppercase">
              {user?.role}
            </span>
          )}
        </p>
      </div>

      {/* ── Stats ── */}
      {isAdmin ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Tareas Totales"  value={baseTasks.length} sub={`${completadas} completadas`}    color="text-alzak-blue dark:text-alzak-gold"                                  bg="bg-alzak-blue/5 dark:bg-alzak-gold/10" />
          <StatCard label="Alta Prioridad"  value={alta}             sub="activas sin completar"           color="text-red-500"                                                           bg="bg-red-50 dark:bg-red-900/20"           />
          <StatCard label="En Progreso"     value={enProceso}        sub={vencidas > 0 ? `${vencidas} vencidas` : 'Sin vencidas'} color={vencidas > 0 ? 'text-orange-500' : 'text-violet-600'} bg={vencidas > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-violet-50 dark:bg-violet-900/20'} />
          <StatCard label="Proyectos"       value={proyectos}        sub="activos este ciclo"              color="text-emerald-600"                                                       bg="bg-emerald-50 dark:bg-emerald-900/20"   />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Mis Tareas"     value={baseTasks.length} sub={`${completadas} completadas`} color="text-alzak-blue dark:text-alzak-gold" bg="bg-alzak-blue/5 dark:bg-alzak-gold/10" />
          <StatCard label="Alta Prioridad" value={alta}             sub="pendientes"                   color="text-red-500"                          bg="bg-red-50 dark:bg-red-900/20"           />
        </div>
      )}

      {/* ── Gráficas (solo admin+) ── */}
      {isAdmin && (
        <div className="glass rounded-[20px] p-5 space-y-4">
          {/* Controles */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-bold text-slate-800 dark:text-white text-sm">Métricas del Proyecto</h2>
            <div className="flex gap-2 flex-wrap">
              {/* Filtro proyecto */}
              <select
                value={filterProyecto}
                onChange={(e) => setFilterProyecto(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30"
              >
                {proyectosOptions.map((p) => (
                  <option key={p} value={p}>{p === 'Todos' ? 'Todos los proyectos' : p}</option>
                ))}
              </select>

              {/* Filtro periodo */}
              <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-slate-800/60 rounded-[10px]">
                {PERIODOS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriodo(p.key)}
                    className={`px-3 py-1 rounded-[8px] text-xs font-semibold transition-all ${
                      periodo === p.key
                        ? 'bg-white dark:bg-slate-700 text-alzak-blue dark:text-alzak-gold shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Progreso por Proyecto
              </p>
              <ProgresoBarChart tasks={filteredForCharts} />
            </div>

            {/* Pie Chart */}
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Distribución de Carga
              </p>
              <CargaPieChart tasks={filteredForCharts} />
            </div>
          </div>

          {filteredForCharts.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-4">
              Sin datos para el filtro seleccionado
            </p>
          )}
        </div>
      )}

      {/* ── Tareas próximas ── */}
      <div className="glass rounded-[20px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800 dark:text-white text-sm">
            {isAdmin ? 'Tareas próximas a vencer' : 'Mis próximas tareas'}
          </h2>
          <Link href="/tareas" className="text-xs text-alzak-blue dark:text-alzak-gold font-medium hover:underline">
            Ver board →
          </Link>
        </div>

        {recientes.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">
            Todo al día. No hay tareas pendientes.
          </p>
        ) : (
          <div className="space-y-2">
            {recientes.map((t) => {
              const days = Math.ceil((new Date(t.fecha_entrega).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
              const vencida = days < 0;
              const urgent  = days <= 2;
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-[14px] bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORIDAD_DOT[t.prioridad] ?? 'bg-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{t.tarea_descripcion}</p>
                    <p className="text-xs text-slate-400 truncate">{t.id_proyecto} · {t.responsable_nombre}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORIDAD_BADGE[t.prioridad] ?? ''}`}>
                      {t.prioridad}
                    </span>
                    {(vencida || urgent) && (
                      <span className={`text-[10px] font-bold ${vencida ? 'text-red-500' : 'text-amber-500'}`}>
                        ⚠️ {vencida ? 'Vencida' : days === 0 ? 'Hoy' : 'Mañana'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Progreso por proyecto (solo admin+) ── */}
      {isAdmin && (
        <div className="glass rounded-[20px] p-5">
          <h2 className="font-bold text-slate-800 dark:text-white text-sm mb-4">Estado por Proyecto</h2>
          <div className="space-y-3">
            {proyectoStats.map((p) => {
              const pct = p.total > 0 ? Math.round((p.completadas / p.total) * 100) : 0;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] bg-alzak-blue/10 dark:bg-alzak-gold/15 text-alzak-blue dark:text-alzak-gold px-1.5 py-0.5 rounded font-bold shrink-0">
                        {p.id}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{p.nombre}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 ml-2">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-alzak-blue dark:bg-alzak-gold transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick action ── */}
      {isAdmin && (
        <div className="glass rounded-[20px] p-5 flex items-center gap-4">
          <div className="w-12 h-12 shrink-0 rounded-[14px] bg-alzak-blue dark:bg-alzak-gold flex items-center justify-center text-white dark:text-alzak-dark text-xl">✨</div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 dark:text-white text-sm">¿Nueva minuta?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Procésala con IA en segundos</p>
          </div>
          <Link href="/procesador" className="shrink-0 px-4 py-2.5 bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark text-xs font-bold rounded-[12px] hover:opacity-90 active:scale-95 transition-all shadow-sm">
            Ir →
          </Link>
        </div>
      )}
    </div>
  );
}
