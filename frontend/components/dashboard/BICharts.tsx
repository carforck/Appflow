"use client";

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import type { StackedBarItem, CargaItem, TareaVencida } from '@/hooks/useDashboardBI';

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
function DonutTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; fill: string; payload: { pct: string } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl px-3 py-2 shadow-lg border border-slate-100 dark:border-slate-700 text-xs flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.fill }} />
      <span className="text-slate-600 dark:text-slate-300">{p.name}:</span>
      <span className="font-bold text-slate-800 dark:text-white">{p.value}</span>
      <span className="text-slate-400">({p.payload.pct})</span>
    </div>
  );
}

export function DonutChart({ data }: { data: { pendiente: number; en_proceso: number; completada: number } }) {
  const entries = DONUT_ENTRIES
    .map(({ key, label }) => ({ name: label, value: data[key], color: COLOR[key] }))
    .filter((e) => e.value > 0);

  const total = entries.reduce((s, e) => s + e.value, 0);

  if (total === 0) {
    return <div className="h-[180px] flex items-center justify-center text-xs text-slate-400">Sin datos</div>;
  }

  const withPct = entries.map((e) => ({
    ...e,
    pct: `${Math.round((e.value / total) * 100)}%`,
  }));

  return (
    /* h-full para crecer cuando el padre tiene altura definida (grid admin);
       min-h-[220px] como fallback para la vista usuario (sin altura heredada) */
    <div className="w-full h-full min-h-[220px] flex flex-col items-center gap-3">

      {/* Donut — flex-1 + min-h-0 para que escale con el espacio disponible */}
      <div className="relative w-full flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie
              data={withPct}
              cx="50%"
              cy="50%"
              innerRadius="38%"
              outerRadius="55%"
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {withPct.map((e) => (
                <Cell key={e.name} fill={e.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Total centrado sobre el SVG */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-800 dark:text-white">{total}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">tareas</span>
        </div>
      </div>

      {/* Leyenda HTML — shrink-0 para que no se comprima */}
      <div className="flex items-center justify-center gap-5 flex-wrap shrink-0 pb-1">
        {withPct.map((e) => (
          <div key={e.name} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
            <span className="text-[11px] text-slate-600 dark:text-slate-300">{e.name}</span>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{e.pct}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Barras Apiladas 100% por Responsable ──────────────────────────────────────
function StackedTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string; payload: StackedBarItem }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-lg border border-slate-100 dark:border-slate-700 text-xs space-y-1.5 min-w-[175px]">
      <p className="font-bold text-slate-800 dark:text-white">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLOR.pendiente }} />
        <span className="text-slate-500">Por Hacer:</span>
        <span className="font-bold ml-auto">{item.pendiente} <span className="text-slate-400 font-normal">({item.pendientePct}%)</span></span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLOR.en_proceso }} />
        <span className="text-slate-500">En Progreso:</span>
        <span className="font-bold ml-auto">{item.en_proceso} <span className="text-slate-400 font-normal">({item.en_procesoPct}%)</span></span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLOR.completada }} />
        <span className="text-slate-500">Completada:</span>
        <span className="font-bold ml-auto">{item.completada} <span className="text-slate-400 font-normal">({item.completadaPct}%)</span></span>
      </div>
      <p className="text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-700">
        Total: <span className="font-bold text-slate-700 dark:text-slate-200">{item.total}</span> tareas
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

  // Altura dinámica: mínimo 200px, 46px por persona
  const height = Math.max(200, displayData.length * 46);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={displayData} layout="vertical" margin={{ top: 4, right: 32, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
        <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={96} />
        <Tooltip content={<StackedTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          verticalAlign="top"
          formatter={(v) => <span className="text-[11px] text-slate-600 dark:text-slate-300">{v}</span>}
        />
        <Bar dataKey="pendientePct"  name="Por Hacer"   stackId="a" fill={COLOR.pendiente}  radius={[0, 0, 0, 0]} />
        <Bar dataKey="en_procesoPct" name="En Progreso" stackId="a" fill={COLOR.en_proceso} radius={[0, 0, 0, 0]} />
        <Bar dataKey="completadaPct" name="Completada"  stackId="a" fill={COLOR.completada} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Tareas Vencidas por Responsable ───────────────────────────────────────────

type OverdueRow = { nombre: string; Alta: number; Media: number; Baja: number; total: number };

function OverdueTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: OverdueRow }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-lg border border-slate-100 dark:border-slate-700 text-xs space-y-1 min-w-[150px]">
      <p className="font-bold text-slate-800 dark:text-white mb-1.5 truncate">{label}</p>
      {d.Alta  > 0 && <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-slate-500">Alta:</span><span className="font-bold text-red-600">{d.Alta}</span></div>}
      {d.Media > 0 && <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-slate-500">Media:</span><span className="font-bold text-amber-600">{d.Media}</span></div>}
      {d.Baja  > 0 && <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-slate-500">Baja:</span><span className="font-bold text-emerald-600">{d.Baja}</span></div>}
      <p className="text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">Total: {d.total}</p>
    </div>
  );
}

export function OverdueTasksChart({ tareas }: { tareas: TareaVencida[] }) {
  if (tareas.length === 0) {
    return (
      <div className="h-[160px] flex flex-col items-center justify-center gap-2">
        <p className="text-3xl">✅</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Sin tareas vencidas para los filtros seleccionados</p>
      </div>
    );
  }

  const byPerson: Record<string, OverdueRow> = {};
  for (const t of tareas) {
    const nombre = (t.responsable_nombre?.split(' ').slice(0, 2).join(' ')) || 'Sin asignar';
    if (!byPerson[nombre]) byPerson[nombre] = { nombre, Alta: 0, Media: 0, Baja: 0, total: 0 };
    if (t.prioridad === 'Alta' || t.prioridad === 'Media' || t.prioridad === 'Baja') {
      byPerson[nombre][t.prioridad]++;
    }
    byPerson[nombre].total++;
  }

  const chartData = Object.values(byPerson).sort((a, b) => b.total - a.total);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
        <XAxis
          dataKey="nombre"
          tick={{ fontSize: 10 }}
          interval={0}
          angle={-35}
          textAnchor="end"
        />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip content={<OverdueTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          verticalAlign="top"
          formatter={(v) => <span className="text-[11px] text-slate-600 dark:text-slate-300">{v}</span>}
        />
        <Bar dataKey="Alta"  name="Alta"  stackId="v" fill="#ef4444" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Media" name="Media" stackId="v" fill="#f59e0b" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Baja"  name="Baja"  stackId="v" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Carga Laboral ──────────────────────────────────────────────────────────────
function WorkloadTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const activas  = payload.find((p) => p.name === 'Activas')?.value  ?? 0;
  const vencidas = payload.find((p) => p.name === 'Vencidas activas')?.value ?? 0;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-lg border border-slate-100 dark:border-slate-700 text-xs space-y-1.5 min-w-[170px]">
      <p className="font-bold text-slate-800 dark:text-white">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLOR.en_proceso }} />
        <span className="text-slate-500">Activas:</span>
        <span className="font-bold ml-auto">{activas}</span>
      </div>
      {vencidas > 0 && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLOR.vencida }} />
          <span className="text-slate-500">Vencidas:</span>
          <span className="font-bold text-red-500 ml-auto">{vencidas}</span>
        </div>
      )}
      <p className="text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-700">
        Total: <span className="font-bold text-slate-700 dark:text-slate-200">{activas + vencidas}</span> tareas vigentes
      </p>
    </div>
  );
}

export function WorkloadChart({ data, onExport }: { data: CargaItem[]; onExport: () => void }) {
  if (!data.length) {
    return <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">Sin datos</div>;
  }

  const displayData = data
    .map((d) => ({
      ...d,
      nombre:  d.nombre.split(' ').slice(0, 2).join(' '),
      activas: d.vigentes - d.vencidas_activas,
    }))
    .sort((a, b) => b.vigentes - a.vigentes);

  const height = Math.max(180, displayData.length * 46);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Carga laboral (tareas vigentes por persona)
        </p>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
        >
          ↓ Descargar
        </button>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={displayData} layout="vertical" margin={{ top: 4, right: 32, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
          <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={96} />
          <Tooltip content={<WorkloadTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            verticalAlign="top"
            formatter={(v) => <span className="text-[11px] text-slate-600 dark:text-slate-300">{v}</span>}
          />
          <Bar dataKey="activas"          name="Activas"          stackId="x" fill={COLOR.en_proceso} radius={[0, 0, 0, 0]} />
          <Bar dataKey="vencidas_activas" name="Vencidas activas" stackId="x" fill={COLOR.vencida}   radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
