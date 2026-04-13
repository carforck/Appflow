"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
  PieLabelRenderProps,
} from 'recharts';
import { TaskWithMeta } from '@/context/TaskStoreContext';
import { MOCK_PROJECTS } from '@/lib/mockData';

// ── Colores ────────────────────────────────────────────────────────────────────
const COLOR_PENDIENTE  = '#94a3b8';
const COLOR_EN_PROCESO = '#1a365d';
const COLOR_COMPLETADA = '#22c55e';
const PIE_COLORS       = [COLOR_PENDIENTE, COLOR_EN_PROCESO, COLOR_COMPLETADA];

// ── Tooltip customizado ────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-[12px] px-3 py-2.5 text-xs shadow-lg border border-slate-200/60 dark:border-slate-700/60">
      <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600 dark:text-slate-300">{p.name}:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Bar Chart: Progreso por Proyecto ──────────────────────────────────────────
interface BarChartProps {
  tasks: TaskWithMeta[];
}

export function ProgresoBarChart({ tasks }: BarChartProps) {
  const data = Object.entries(MOCK_PROJECTS)
    .filter(([id]) => id !== '1111')
    .map(([id, nombre]) => {
      const proyTasks = tasks.filter((t) => t.id_proyecto === id);
      if (proyTasks.length === 0) return null;
      return {
        proyecto: id,
        nombre: nombre.split('—')[0].trim(),
        'Por Hacer':   proyTasks.filter((t) => t.status === 'Pendiente').length,
        'En Progreso': proyTasks.filter((t) => t.status === 'En Proceso').length,
        'Hecho':       proyTasks.filter((t) => t.status === 'Completada').length,
      };
    })
    .filter(Boolean) as { proyecto: string; nombre: string; 'Por Hacer': number; 'En Progreso': number; 'Hecho': number }[];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
        <XAxis
          dataKey="proyecto"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
        />
        <Bar dataKey="Por Hacer"   fill={COLOR_PENDIENTE}  radius={[4, 4, 0, 0]} />
        <Bar dataKey="En Progreso" fill={COLOR_EN_PROCESO} radius={[4, 4, 0, 0]} />
        <Bar dataKey="Hecho"       fill={COLOR_COMPLETADA} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Pie Chart: Distribución de Carga ─────────────────────────────────────────
interface PieChartProps {
  tasks: TaskWithMeta[];
}

function renderCustomLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (
    typeof cx !== 'number' || typeof cy !== 'number' ||
    typeof midAngle !== 'number' || typeof innerRadius !== 'number' ||
    typeof outerRadius !== 'number' || typeof percent !== 'number'
  ) return null;
  if (percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x} y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 700 }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function CargaPieChart({ tasks }: PieChartProps) {
  const data = [
    { name: 'Por Hacer',   value: tasks.filter((t) => t.status === 'Pendiente').length  },
    { name: 'En Progreso', value: tasks.filter((t) => t.status === 'En Proceso').length },
    { name: 'Hecho',       value: tasks.filter((t) => t.status === 'Completada').length },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">
        Sin tareas para mostrar
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={90}
          dataKey="value"
          labelLine={false}
          label={renderCustomLabel}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [value, name]}
          contentStyle={{
            borderRadius: '12px',
            fontSize: '11px',
            border: '1px solid rgba(148,163,184,0.3)',
            background: 'rgba(255,255,255,0.9)',
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '11px' }}
          formatter={(value) => <span style={{ color: '#64748b' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
