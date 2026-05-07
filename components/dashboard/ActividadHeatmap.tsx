"use client";

import { useMemo, useState, useRef, useEffect } from 'react';
import type { ActividadDay } from '@/hooks/useActividadHeatmap';

// ── Helpers ────────────────────────────────────────────────────────────────────

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

function colorLevel(count: number): string {
  if (count === 0) return 'bg-slate-200/80 dark:bg-slate-700/60';
  if (count <= 2)  return 'bg-alzak-gold/35 dark:bg-alzak-gold/30';
  if (count <= 5)  return 'bg-alzak-gold/60 dark:bg-alzak-gold/55';
  if (count <= 9)  return 'bg-alzak-gold/85 dark:bg-alzak-gold/80';
  return 'bg-alzak-gold';
}

const DAYS_ES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAY_LABEL_W = 22; // px columna de etiquetas de día
const GAP         = 2;  // px gap entre celdas

// ── Tooltip (fixed viewport — no afecta layout) ────────────────────────────────

interface TooltipState { date: string; count: number; top: number; left: number }

// ── Componente ─────────────────────────────────────────────────────────────────

interface Props { actividad: ActividadDay[]; loading: boolean }

export function ActividadHeatmap({ actividad, loading }: Props) {
  const containerRef              = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize]   = useState(13);
  const [tooltip,  setTooltip]    = useState<TooltipState | null>(null);

  const { weeks, monthLabels, totalCount } = useMemo(() => {
    const actMap = new Map(actividad.map((a) => [a.date, a.count]));
    const today  = new Date(); today.setHours(0, 0, 0, 0);
    const start  = new Date(today);
    start.setMonth(start.getMonth() - 4);
    start.setDate(start.getDate() - start.getDay()); // retroceder al domingo

    const weeksArr:  { date: string; count: number; inRange: boolean }[][] = [];
    const monthsArr: { label: string; col: number }[]                      = [];
    let cur       = new Date(start);
    let col       = 0;
    let lastMonth = -1;

    while (cur <= today) {
      const week: { date: string; count: number; inRange: boolean }[] = [];
      for (let dow = 0; dow < 7; dow++) {
        const ymd     = toYMD(cur);
        const inRange = cur <= today;
        week.push({ date: ymd, count: actMap.get(ymd) ?? 0, inRange });
        if (inRange && cur.getMonth() !== lastMonth) {
          monthsArr.push({ label: MONTHS_ES[cur.getMonth()], col });
          lastMonth = cur.getMonth();
        }
        cur = addDays(cur, 1);
      }
      weeksArr.push(week);
      col++;
    }
    return {
      weeks:       weeksArr,
      monthLabels: monthsArr,
      totalCount:  actividad.reduce((s, a) => s + a.count, 0),
    };
  }, [actividad]);

  // Recalcular tamaño de celda para llenar el contenedor
  useEffect(() => {
    const el = containerRef.current;
    if (!el || weeks.length === 0) return;
    const compute = () => {
      const avail = el.offsetWidth - DAY_LABEL_W - GAP - (weeks.length - 1) * GAP;
      const size  = Math.min(18, Math.max(8, Math.floor(avail / weeks.length)));
      setCellSize(size);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [weeks.length]);

  const handleEnter = (e: React.MouseEvent<HTMLDivElement>, day: { date: string; count: number; inRange: boolean }) => {
    if (!day.inRange) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ date: day.date, count: day.count, top: r.top - 52, left: r.left + r.width / 2 });
  };

  return (
    <>
      {/* Tooltip fixed — fuera del flow del card */}
      {tooltip && (
        <div className="fixed z-50 pointer-events-none" style={{ top: tooltip.top, left: tooltip.left, transform: 'translateX(-50%)' }}>
          <div className="bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
            {tooltip.count === 0 ? 'Sin actividad' : `${tooltip.count} acción${tooltip.count !== 1 ? 'es' : ''}`}
            <span className="block text-slate-400 text-[9px]">
              {new Date(tooltip.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>
      )}

      <div className="glass rounded-[20px] p-4 sm:p-5 space-y-3" style={{ background: 'var(--sidebar-bg)' }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Mi Actividad</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Tareas completadas + notas enviadas · últimos 4 meses</p>
          </div>
          {!loading && (
            <span className="text-xs font-bold text-alzak-blue dark:text-alzak-gold">
              {totalCount} acción{totalCount !== 1 ? 'es' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[100px]">
            <div className="w-5 h-5 border-2 border-alzak-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div ref={containerRef} className="w-full">
            {/* Etiquetas de mes */}
            <div className="flex mb-1" style={{ paddingLeft: DAY_LABEL_W + GAP }}>
              {weeks.map((_, wi) => {
                const label = monthLabels.find((m) => m.col === wi);
                return (
                  <div
                    key={wi}
                    className="text-[9px] text-slate-400 font-medium overflow-visible whitespace-nowrap"
                    style={{ width: cellSize + GAP, minWidth: cellSize + GAP }}
                  >
                    {label ? label.label : ''}
                  </div>
                );
              })}
            </div>

            {/* Grid: etiquetas día + celdas */}
            <div className="flex" style={{ gap: GAP }}>
              {/* Etiquetas de día */}
              <div className="flex flex-col shrink-0" style={{ gap: GAP, width: DAY_LABEL_W }}>
                {DAYS_ES.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-end text-[8px] text-slate-400 pr-1"
                    style={{ height: cellSize }}
                  >
                    {i % 2 === 1 ? d.slice(0, 3) : ''}
                  </div>
                ))}
              </div>

              {/* Semanas — llenan el ancho restante */}
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col shrink-0" style={{ gap: GAP }}>
                  {week.map((day) => (
                    <div
                      key={day.date}
                      className={`rounded-sm cursor-default transition-colors ${
                        day.inRange ? colorLevel(day.count) : 'opacity-0'
                      } ${day.inRange && day.count > 0 ? 'hover:ring-1 hover:ring-alzak-gold/70' : ''}`}
                      style={{ width: cellSize, height: cellSize }}
                      onMouseEnter={(e) => handleEnter(e, day)}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leyenda */}
        {!loading && (
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-[9px] text-slate-400">Menos</span>
            {[0, 2, 5, 8, 11].map((v) => (
              <div key={v} className={`rounded-sm ${colorLevel(v)}`} style={{ width: cellSize, height: cellSize }} />
            ))}
            <span className="text-[9px] text-slate-400">Más</span>
          </div>
        )}
      </div>
    </>
  );
}
