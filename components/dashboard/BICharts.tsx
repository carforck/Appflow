"use client";

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import type { StackedBarItem, CargaItem } from '@/hooks/useDashboardBI';

// ── Paleta ─────────────────────────────────────────────────────────────────────
const COLOR = {
  pendiente:  '#94a3b8',  // slate-400
  en_proceso: '#3b82f6',  // blue-500
  completada: '#10b981',  // emerald-500
  vencida:    '#ef4444',  // red-500
};

// ── Tooltip custom ─────────────────────────────────────────────────────────────
function TooltipBox({ active, payload }: { active?: boolean; payload?: { name: string; value: number; fill: string }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-lg border border-slate-100 dark:border-slate-700 text-xs space-y-1">
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-slate-600 dark:text-slate-300">{p.name}:</span>
          <span className="font-bold text-slate-800 dark:text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// Mapa nombre → color (fijo, no depende del índice tras .filter)
const DONUT_ENTRIES: { key: 'pendiente' | 'en_proceso' | 'completada'; label: string }[] = [
  { key: 'pendiente',  label: 'Por Hacer'   },
  { key: 'en_proceso', label: 'En Progreso' },
  { key: 'completada', label: 'Completada'  },
];

// ── Donut de Estados ───────────────────────────────────────────────────────────
export function DonutChart({ data }: { data: { pendiente: number; en_proceso: number; completada: number } }) {
  const entries = DONUT_ENTRIES
    .map(({ key, label }) => ({ name: label, value: data[key], color: COLOR[key] }))
    .filter((e) => e.value > 0);

  const total = entries.reduce((s, e) => s + e.value, 0);

  if (total === 0) {
    return <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">Sin datos</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={entries}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          label={({ percent }) => percent != null ? `${(percent * 100).toFixed(0)}%` : ''}
          labelLine={false}
        >
          {entries.map((e) => (
            <Cell key={e.name} fill={e.color} />
          ))}
        </Pie>
        <Tooltip content={<TooltipBox />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(v) => <span className="text-[11px] text-slate-600 dark:text-slate-300">{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Barras Apiladas 100% por Responsable ──────────────────────────────────────
function StackedTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string; payload: StackedBarItem }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-lg border border-slate-100 dark:border-slate-700 text-xs space-y-1 min-w-[160px]">
      <p className="font-bold text-slate-800 dark:text-white mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: COLOR.pendiente }} />
        <span className="text-slate-500">Por Hacer:</span>
        <span className="font-bold">{item.pendiente} ({item.pendientePct}%)</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: COLOR.en_proceso }} />
        <span className="text-slate-500">En Progreso:</span>
        <span className="font-bold">{item.en_proceso} ({item.en_procesoPct}%)</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: COLOR.completada }} />
        <span className="text-slate-500">Completada:</span>
        <span className="font-bold">{item.completada} ({item.completadaPct}%)</span>
      </div>
      <p className="text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">
        Total: {item.total} tareas
      </p>
    </div>
  );
}

export function StackedBarChart({ data }: { data: StackedBarItem[] }) {
  if (!data.length) {
    return <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">Sin datos</div>;
  }

  const displayData = data.map((d) => ({
    ...d,
    nombre: d.nombre.split(' ').slice(0, 2).join(' '),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={displayData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
        <XAxis dataKey="nombre" tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
        <Tooltip content={<StackedTooltip />} />
        <Bar dataKey="pendientePct"  name="Por Hacer"   stackId="a" fill={COLOR.pendiente}  radius={[0, 0, 0, 0]} />
        <Bar dataKey="en_procesoPct" name="En Progreso" stackId="a" fill={COLOR.en_proceso} radius={[0, 0, 0, 0]} />
        <Bar dataKey="completadaPct" name="Completada"  stackId="a" fill={COLOR.completada} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Carga Laboral ──────────────────────────────────────────────────────────────
export function WorkloadChart({ data, onExport }: { data: CargaItem[]; onExport: () => void }) {
  if (!data.length) {
    return <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">Sin datos</div>;
  }

  const displayData = data.map((d) => ({
    ...d,
    nombre: d.nombre.split(' ').slice(0, 2).join(' '),
    activas: d.vigentes - d.vencidas_activas,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Carga laboral (vigentes por persona)
        </p>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
        >
          ↓ Descargar detalle
        </button>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={displayData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
          <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={80} />
          <Tooltip
            formatter={(value, name) => [value, name === 'activas' ? 'Activas' : 'Vencidas activas']}
          />
          <Bar dataKey="activas"         name="Activas"          stackId="x" fill={COLOR.en_proceso} radius={[0, 0, 0, 0]} />
          <Bar dataKey="vencidas_activas" name="Vencidas activas" stackId="x" fill={COLOR.vencida}   radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
