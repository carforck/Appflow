"use client";

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { useDashboardBI } from '@/hooks/useDashboardBI';
import { KPICards }             from '@/components/dashboard/KPICards';
import { DashboardFilters }     from '@/components/dashboard/DashboardFilters';
import { OverdueTasks }         from '@/components/dashboard/OverdueTasks';
import { MisActividadesTable }  from '@/components/dashboard/MisActividadesTable';

const DonutChart      = dynamic(() => import('@/components/dashboard/BICharts').then((m) => m.DonutChart),      { ssr: false, loading: () => <ChartSkeleton /> });
const StackedBarChart = dynamic(() => import('@/components/dashboard/BICharts').then((m) => m.StackedBarChart), { ssr: false, loading: () => <ChartSkeleton /> });
const WorkloadChart   = dynamic(() => import('@/components/dashboard/BICharts').then((m) => m.WorkloadChart),   { ssr: false, loading: () => <ChartSkeleton /> });

function ChartSkeleton() {
  return (
    <div className="h-[200px] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-alzak-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'superadmin' || user?.role === 'admin';

  const {
    data, loading, error,
    filters, patchFilters, resetFilters,
    projectOptions, exportCSV, refresh,
    myTasks, generateReport, generateAdminReport,
  } = useDashboardBI();

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-alzak-blue dark:text-white">
            Hola, {user?.nombre?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {isAdmin ? 'Dashboard de Inteligencia de Negocios · Alzak Flow' : 'Tu resumen personal de actividades'}
            {user?.role !== 'user' && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-alzak-blue/10 dark:bg-alzak-gold/10 text-alzak-blue dark:text-alzak-gold text-[10px] font-bold uppercase">
                {user?.role}
              </span>
            )}
          </p>
        </div>
        {/* Botones: fila completa en móvil, agrupados en desktop */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          {isAdmin ? (
            <button
              onClick={generateAdminReport}
              disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-alzak-blue text-white text-xs font-bold hover:bg-alzak-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              title="Genera el reporte BI en PDF. Se abre en nueva pestaña para revisar y descargar."
            >
              Reporte PDF
            </button>
          ) : (
            <button
              onClick={generateReport}
              disabled={loading || myTasks.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-alzak-blue text-white text-xs font-bold hover:bg-alzak-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              title="Genera un PDF con tus métricas y tareas. Se abre en nueva pestaña para revisar antes de descargar."
            >
              Generar Reporte PDF
            </button>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            aria-label="Actualizar dashboard"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 shrink-0"
          >
            {loading
              ? <><div className="w-3 h-3 border-2 border-slate-300 border-t-alzak-blue rounded-full animate-spin" />Actualizando...</>
              : <>↻ Actualizar</>}
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[14px] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          <span>⚠️</span>
          <span className="flex-1">{error}</span>
          <button onClick={refresh} className="text-xs font-bold underline">Reintentar</button>
        </div>
      )}

      {/* ── Filtros globales (solo admin+) ── */}
      {isAdmin && (
        <div className="glass rounded-[20px] p-4">
          <DashboardFilters
            filters={filters}
            projectOptions={projectOptions}
            onChange={patchFilters}
            onReset={resetFilters}
          />
        </div>
      )}

      {/* ── KPI Cards ── */}
      {isAdmin ? (
        <KPICards kpi={data.kpi} loading={loading} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Vigentes',     value: data.kpi.vigentes,    bg: 'bg-alzak-blue/5 dark:bg-alzak-gold/10',    color: 'text-alzak-blue dark:text-alzak-gold' },
            { label: 'Completadas',  value: data.kpi.completadas, bg: 'bg-emerald-50 dark:bg-emerald-900/20',    color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Vencidas',     value: data.kpi.vencidas,    bg: 'bg-red-50 dark:bg-red-900/20',            color: data.kpi.vencidas > 0 ? 'text-red-500' : 'text-emerald-600' },
            { label: 'Cumplimiento', value: data.kpi.cumplimiento != null ? `${data.kpi.cumplimiento}%` : '—', bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600 dark:text-blue-400' },
          ].map(({ label, value, bg, color }) => (
            <div key={label} className={`glass rounded-[20px] p-5 ${bg}`}>
              <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{loading ? '—' : value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Vista usuario: donut personal + mis actividades ── */}
      {!isAdmin && (
        <>
          <div className="glass rounded-[20px] p-5 space-y-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Mis Tareas por Estado
            </p>
            <DonutChart data={data.donut} />
          </div>

          <div className="glass rounded-[20px] p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Mis Actividades</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {myTasks.length} tarea{myTasks.length !== 1 ? 's' : ''} · excluye pendientes de revisión
                </p>
              </div>
            </div>
            <MisActividadesTable tasks={myTasks} />
          </div>
        </>
      )}

      {/* ── Gráficas BI (solo admin+) ── */}
      {isAdmin && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass rounded-[20px] p-5 space-y-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Distribución de Estados
              </p>
              <DonutChart data={data.donut} />
            </div>
            <div className="glass rounded-[20px] p-5 space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Eficiencia por Responsable (100%)
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Barras normalizadas · verde = más completado proporcionalmente
                </p>
              </div>
              <StackedBarChart data={data.stackedBars} />
            </div>
          </div>

          <div className="glass rounded-[20px] p-5">
            <WorkloadChart data={data.cargaLaboral} onExport={() => exportCSV('carga')} />
          </div>

          <div className="glass rounded-[20px] p-5">
            <OverdueTasks tareas={data.tareas_vencidas} onExport={() => exportCSV('vencidas')} />
          </div>

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
        </>
      )}
    </div>
  );
}
