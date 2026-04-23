"use client";

import type { DashboardKPI } from '@/hooks/useDashboardBI';

interface Props {
  kpi:     DashboardKPI;
  loading: boolean;
}

function KPICard({
  label, value, sub, color, bg, loading,
}: {
  label: string; value: string | number; sub?: string;
  color: string; bg: string; loading: boolean;
}) {
  return (
    <div className={`glass rounded-[20px] p-5 ${bg}`}>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">{label}</p>
      {loading ? (
        <div className="h-9 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse mt-1" />
      ) : (
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
      )}
      {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export function KPICards({ kpi, loading }: Props) {
  const cumplimientoStr = kpi.cumplimiento != null ? `${kpi.cumplimiento}%` : '—';
  const cumplimientoColor =
    kpi.cumplimiento == null  ? 'text-slate-400' :
    kpi.cumplimiento >= 80    ? 'text-emerald-600' :
    kpi.cumplimiento >= 50    ? 'text-amber-500'   : 'text-red-500';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KPICard
        label="Tareas Vigentes"
        value={kpi.vigentes}
        sub={`${kpi.total} totales`}
        color="text-alzak-blue dark:text-alzak-gold"
        bg="bg-alzak-blue/5 dark:bg-alzak-gold/10"
        loading={loading}
      />
      <KPICard
        label="Tareas Vencidas"
        value={kpi.vencidas}
        sub={kpi.vencidas > 0 ? 'Requieren atención' : 'Sin vencidas ✓'}
        color={kpi.vencidas > 0 ? 'text-red-500' : 'text-emerald-600'}
        bg={kpi.vencidas > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}
        loading={loading}
      />
      <KPICard
        label="Completadas"
        value={kpi.completadas}
        sub={`de ${kpi.total} tareas`}
        color="text-violet-600"
        bg="bg-violet-50 dark:bg-violet-900/20"
        loading={loading}
      />
      <KPICard
        label="Cumplimiento Global"
        value={cumplimientoStr}
        sub="tareas entregadas a tiempo"
        color={cumplimientoColor}
        bg="bg-slate-50 dark:bg-slate-800/40"
        loading={loading}
      />
    </div>
  );
}
