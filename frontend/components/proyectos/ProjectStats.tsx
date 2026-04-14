interface StatItem {
  label: string;
  value: number;
  color: string;
}

interface ProjectStatsProps {
  total:      number;
  activo:     number;
  completado: number;
  inactivo:   number;
}

export function ProjectStats({ total, activo, completado, inactivo }: ProjectStatsProps) {
  const stats: StatItem[] = [
    { label: 'Total',       value: total,      color: 'text-slate-700 dark:text-slate-200' },
    { label: 'Activos',     value: activo,     color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Completados', value: completado, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Inactivos',   value: inactivo,   color: 'text-slate-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="glass rounded-[16px] border border-slate-200/60 dark:border-slate-700/60 p-4"
          style={{ background: 'var(--sidebar-bg)' }}
        >
          <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
