"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { authFetch } from '@/lib/api';
import { useAuth }         from '@/context/AuthContext';
import { useProjectStore } from '@/context/ProjectStoreContext';
import { useTaskStore, TaskWithMeta } from '@/context/TaskStoreContext';
import { loadPDFLibs, openPDFPreview, addPDFLogo, captureChart } from '@/lib/pdfUtils';

export interface DashboardFilters {
  project_id:  string;
  prioridad:   string;
  date_from:   string;
  date_to:     string;
  empresa:     string;
  financiador: string;
}

export interface DashboardKPI {
  total:        number;
  vigentes:     number;
  completadas:  number;
  vencidas:     number;
  cumplimiento: number | null;
}

export interface StackedBarItem {
  nombre:        string;
  total:         number;
  pendientePct:  number;
  en_procesoPct: number;
  completadaPct: number;
  pendiente:     number;
  en_proceso:    number;
  completada:    number;
}

export interface CargaItem {
  nombre:           string;
  vigentes:         number;
  vencidas_activas: number;
}

export interface VencimientoBucket {
  label: string;
  count: number;
  color: string;
}

export interface ProgresoProyecto {
  nombre:        string;
  completadaPct: number;
  pendientePct:  number;
  completadas:   number;
  total:         number;
}

export interface TareaVencida {
  id:                  number;
  id_proyecto:         string;
  nombre_proyecto:     string;
  tarea_descripcion:   string;
  responsable_nombre:  string;
  responsable_correo:  string;
  prioridad:           string;
  fecha_entrega:       string;
  status:              string;
  dias_vencida:        number;
}

interface DashboardData {
  kpi:             DashboardKPI;
  donut:           { pendiente: number; en_proceso: number; completada: number };
  stackedBars:     StackedBarItem[];
  cargaLaboral:    CargaItem[];
  tareas_vencidas: TareaVencida[];
}

const EMPTY: DashboardData = {
  kpi:             { total: 0, vigentes: 0, completadas: 0, vencidas: 0, cumplimiento: null },
  donut:           { pendiente: 0, en_proceso: 0, completada: 0 },
  stackedBars:     [],
  cargaLaboral:    [],
  tareas_vencidas: [],
};

export const EMPTY_FILTERS: DashboardFilters = {
  project_id:  '',
  prioridad:   '',
  date_from:   '',
  date_to:     '',
  empresa:     '',
  financiador: '',
};

const LS_EMPRESA_KEY = 'alzak_filter_empresa';

const STATUS_COLOR: Record<string, [number, number, number]> = {
  'Pendiente':  [148, 163, 184],
  'En Proceso': [59, 130, 246],
  'Completada': [16, 185, 129],
};
const PRIO_COLOR: Record<string, [number, number, number]> = {
  'Alta':  [239, 68, 68],
  'Media': [245, 158, 11],
  'Baja':  [16, 185, 129],
};

export function useDashboardBI() {
  const { user }               = useAuth();
  const { projects }           = useProjectStore();
  const { tasks, tasksLastModified } = useTaskStore();

  const [filters,  setFilters]  = useState<DashboardFilters>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(LS_EMPRESA_KEY) : null;
      return saved ? { ...EMPTY_FILTERS, empresa: saved } : EMPTY_FILTERS;
    } catch { return EMPTY_FILTERS; }
  });
  const [data,     setData]     = useState<DashboardData>(EMPTY);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const myTasks = useMemo<TaskWithMeta[]>(() =>
    tasks.filter((t) => (t.status as string) !== 'Pendiente Revisión'),
    [tasks],
  );

  const prioridad = useMemo(() => {
    const counts = { Alta: 0, Media: 0, Baja: 0 };
    for (const t of myTasks) {
      if (t.prioridad === 'Alta' || t.prioridad === 'Media' || t.prioridad === 'Baja') {
        counts[t.prioridad]++;
      }
    }
    return counts;
  }, [myTasks]);

  const vencimientos = useMemo<VencimientoBucket[]>(() => {
    const now = new Date();
    const toStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const today = toStr(now);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
    const endOfNextWeek = new Date(endOfWeek);
    endOfNextWeek.setDate(endOfWeek.getDate() + 7);
    const endOfWeekStr     = toStr(endOfWeek);
    const endOfNextWeekStr = toStr(endOfNextWeek);

    const c = { vencidas: 0, esta_semana: 0, proxima: 0, despues: 0 };
    for (const t of myTasks) {
      if (t.status === 'Completada' || !t.fecha_entrega) continue;
      const f = t.fecha_entrega;
      if      (f < today)             c.vencidas++;
      else if (f <= endOfWeekStr)     c.esta_semana++;
      else if (f <= endOfNextWeekStr) c.proxima++;
      else                            c.despues++;
    }
    return [
      { label: 'Vencidas',     count: c.vencidas,     color: '#ef4444' },
      { label: 'Esta sem.',    count: c.esta_semana,  color: '#f59e0b' },
      { label: 'Próx. sem.',   count: c.proxima,      color: '#3b82f6' },
      { label: 'Futuras',      count: c.despues,      color: '#10b981' },
    ];
  }, [myTasks]);

  const progresoProyectos = useMemo<ProgresoProyecto[]>(() => {
    const byProject: Record<string, { nombre: string; total: number; completadas: number }> = {};
    for (const t of myTasks) {
      if (!byProject[t.id_proyecto]) {
        byProject[t.id_proyecto] = {
          nombre: (t.nombre_proyecto || t.id_proyecto).split(' ').slice(0, 3).join(' '),
          total: 0, completadas: 0,
        };
      }
      byProject[t.id_proyecto].total++;
      if (t.status === 'Completada') byProject[t.id_proyecto].completadas++;
    }
    return Object.values(byProject)
      .map((p) => {
        const completadaPct = Math.round((p.completadas / p.total) * 100);
        return {
          nombre: p.nombre,
          completadaPct,
          pendientePct: 100 - completadaPct,
          completadas:  p.completadas,
          total:        p.total,
        };
      })
      .sort((a, b) => b.completadaPct - a.completadaPct);
  }, [myTasks]);

  const fetchData = useCallback(async (f: DashboardFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.project_id)  params.set('project_id',  f.project_id);
      if (f.prioridad)   params.set('prioridad',   f.prioridad);
      if (f.date_from)   params.set('date_from',   f.date_from);
      if (f.date_to)     params.set('date_to',     f.date_to);
      if (f.empresa)     params.set('empresa',     f.empresa);
      if (f.financiador) params.set('financiador', f.financiador);
      params.set('_ts', Date.now().toString());

      const res = await authFetch(`/api/stats/dashboard?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as DashboardData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(filters); }, [fetchData, filters]);

  useEffect(() => {
    if (tasksLastModified === 0) return;
    const timer = setTimeout(() => fetchData(filters), 800);
    return () => clearTimeout(timer);
  }, [tasksLastModified, fetchData, filters]);

  function patchFilters(patch: Partial<DashboardFilters>) {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(LS_EMPRESA_KEY, next.empresa); } catch { /* ignore */ }
      return next;
    });
  }
  function resetFilters() {
    try { localStorage.removeItem(LS_EMPRESA_KEY); } catch { /* ignore */ }
    setFilters(EMPTY_FILTERS);
  }

  function exportCSV(type: 'vencidas' | 'carga') {
    let rows: string[];
    if (type === 'vencidas') {
      rows = [
        ['ID', 'Proyecto', 'Descripción', 'Responsable', 'Prioridad', 'Fecha Entrega', 'Días Vencida'].join(','),
        ...data.tareas_vencidas.map((t) =>
          [t.id, t.id_proyecto, `"${t.tarea_descripcion}"`, `"${t.responsable_nombre}"`,
           t.prioridad, t.fecha_entrega, t.dias_vencida].join(',')
        ),
      ];
    } else {
      rows = [
        ['Responsable', 'Tareas Vigentes', 'Vencidas Activas'].join(','),
        ...data.cargaLaboral.map((c) =>
          [`"${c.nombre}"`, c.vigentes, c.vencidas_activas].join(',')
        ),
      ];
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `alzak-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Reporte personal PDF (usuario) — captura las 4 graficas + tabla de tareas
  const generateReport = useCallback(async () => {
    if (!user) return;

    const [{ JsPDF }, donutImg, prioImg, vencImg, progresoImg] = await Promise.all([
      loadPDFLibs(),
      captureChart('chart-donut-user'),
      captureChart('chart-prio-user'),
      captureChart('chart-venc-user'),
      captureChart('chart-progreso-user'),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc: any  = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW     = doc.internal.pageSize.getWidth();
    const pageH     = doc.internal.pageSize.getHeight();
    const FOOTER_H  = 8;
    const MARGIN    = 14;
    const contentW  = pageW - MARGIN * 2;
    const LABEL_H   = 6;
    const PAD       = 3;
    const GAP       = 4;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const drawFooter = (pageNum: number) => {
      doc.setFillColor(26, 54, 93);
      doc.rect(0, pageH - FOOTER_H, pageW, FOOTER_H, 'F');
      doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 220, 255);
      doc.text('ALZAK FOUNDATION — Documento Confidencial', MARGIN, pageH - 2.5);
      doc.text(`Página ${pageNum}`, pageW - 22, pageH - 2.5);
    };

    const drawCell = (x: number, y: number, w: number, h: number, title: string) => {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, w, h, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, h, 3, 3, 'S');
      doc.setFontSize(6); doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(title.toUpperCase(), x + w / 2, y + LABEL_H - 1, { align: 'center' });
    };

    const placeChart = (
      img: { dataUrl: string; pxW: number; pxH: number } | null,
      x: number, y: number, cw: number, ch: number,
    ) => {
      if (!img) return;
      const availW = cw - PAD * 2;
      const availH = ch - LABEL_H - PAD;
      const ratio  = img.pxH / img.pxW;
      let iw = availW;
      let ih = iw * ratio;
      if (ih > availH) { ih = availH; iw = ih / ratio; }
      doc.addImage(img.dataUrl, 'PNG', x + (cw - iw) / 2, y + LABEL_H + (availH - ih) / 2, iw, ih);
    };

    // ── Encabezado ────────────────────────────────────────────────────────────
    doc.setFillColor(26, 54, 93);
    doc.rect(0, 0, pageW, 22, 'F');
    await addPDFLogo(doc, pageW, 22);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ALZAK FOUNDATION', MARGIN, 10);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 220, 255);
    doc.text('Reporte Personal de Actividades', MARGIN, 16);

    // ── Info del usuario ──────────────────────────────────────────────────────
    const fechaGen = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 54, 93);
    doc.text(user.nombre ?? '', MARGIN, 30);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(user.email ?? '', MARGIN, 35);
    doc.text(`Generado: ${fechaGen}`, MARGIN, 40);

    // ── KPI boxes ─────────────────────────────────────────────────────────────
    const kpi = data.kpi;
    const kpiItems: { label: string; value: string | number; color: [number, number, number] }[] = [
      { label: 'Vigentes',     value: kpi.vigentes,    color: [26,  54,  93]  },
      { label: 'Completadas',  value: kpi.completadas, color: [16,  185, 129] },
      { label: 'Vencidas',     value: kpi.vencidas,    color: [239, 68,  68]  },
      { label: 'Cumplimiento', value: kpi.cumplimiento != null ? `${kpi.cumplimiento}%` : '—', color: [59, 130, 246] },
    ];
    const boxW = (contentW - (kpiItems.length - 1) * 2) / kpiItems.length;
    kpiItems.forEach((item, i) => {
      const x = MARGIN + i * (boxW + 2);
      doc.setFillColor(...item.color);
      doc.roundedRect(x, 45, boxW, 16, 2, 2, 'F');
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      doc.text(String(item.value), x + boxW / 2, 53.5, { align: 'center' });
      doc.setFontSize(6); doc.setFont('helvetica', 'normal');
      doc.text(item.label.toUpperCase(), x + boxW / 2, 58, { align: 'center' });
    });

    // ── Gráficas — layout en 3 filas ─────────────────────────────────────────
    let y = 66;
    const halfW = (contentW - GAP) / 2;

    // Fila 1: Estado (izq) + Prioridad (der)
    const row1H = 58;
    drawCell(MARGIN,              y, halfW, row1H, 'Estado de Tareas');
    drawCell(MARGIN + halfW + GAP, y, halfW, row1H, 'Distribución por Prioridad');
    placeChart(donutImg, MARGIN,               y, halfW, row1H);
    placeChart(prioImg,  MARGIN + halfW + GAP, y, halfW, row1H);
    y += row1H + GAP;

    // Fila 2: Próximos vencimientos (ancho completo)
    const row2H = 42;
    drawCell(MARGIN, y, contentW, row2H, 'Próximos Vencimientos · tareas activas');
    placeChart(vencImg, MARGIN, y, contentW, row2H);
    y += row2H + GAP;

    // Fila 3: Progreso por proyecto (ancho completo)
    const row3H = 50;
    drawCell(MARGIN, y, contentW, row3H, 'Progreso por Proyecto');
    placeChart(progresoImg, MARGIN, y, contentW, row3H);
    y += row3H + GAP;

    drawFooter(1);

    // ── Tabla de tareas ───────────────────────────────────────────────────────
    const fmt = (d: string | undefined) => {
      if (!d) return '—';
      const [yr, m, day] = d.split('-');
      if (yr && m && day) return `${day}/${m}/${yr.slice(2)}`;
      return d;
    };

    // Separador de sección antes de la tabla
    doc.setFillColor(26, 54, 93);
    doc.rect(MARGIN, y, 3, 5, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 54, 93);
    doc.text('DETALLE DE ACTIVIDADES', MARGIN + 5, y + 3.5);
    y += 9;

    doc.autoTable({
      startY: y,
      head: [['Proyecto', 'Tarea', 'Prioridad', 'Estado', 'Fecha Fin']],
      body: myTasks.map((t) => [
        t.nombre_proyecto ?? t.id_proyecto,
        t.tarea_descripcion,
        t.prioridad,
        t.status,
        fmt(t.fecha_entrega),
      ]),
      headStyles:         { fillColor: [26, 54, 93], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles:         { fontSize: 7.5, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin:             { left: MARGIN, right: MARGIN },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20 },
        3: { cellWidth: 26 },
        4: { cellWidth: 22 },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell: (d: any) => {
        if (d.section !== 'body') return;
        if (d.column.index === 3) {
          const c = STATUS_COLOR[d.cell.raw as string];
          if (c) d.cell.styles.textColor = c;
          d.cell.styles.fontStyle = 'bold';
        }
        if (d.column.index === 2) {
          const c = PRIO_COLOR[d.cell.raw as string];
          if (c) d.cell.styles.textColor = c;
          d.cell.styles.fontStyle = 'bold';
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didDrawPage: (d: any) => {
        if (d.pageNumber === 1) return; // footer ya dibujado en pág 1
        drawFooter(d.pageNumber);
      },
    });

    openPDFPreview(doc);
  }, [user, data, myTasks]);

  // Reporte BI admin PDF — solo graficas (landscape A4, una pagina)
  const generateAdminReport = useCallback(async () => {
    const [{ JsPDF }, donutImg, stackedImg, workloadImg, overdueImg] = await Promise.all([
      loadPDFLibs(),
      captureChart('chart-donut'),
      captureChart('chart-stacked'),
      captureChart('chart-workload'),
      captureChart('chart-overdue'),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc: any = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Encabezado
    doc.setFillColor(26, 54, 93);
    doc.rect(0, 0, pageW, 22, 'F');
    await addPDFLogo(doc, pageW, 22);
    doc.setFontSize(15); doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ALZAK FOUNDATION', 14, 10);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 220, 255);
    doc.text('Dashboard de Inteligencia de Negocios', 14, 16);

    // Fecha y filtros
    const fechaGen = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado: ${fechaGen}`, 14, 27);

    const filtersActive = [
      filters.empresa     && `Empresa: ${filters.empresa}`,
      filters.financiador && `Financiador: ${filters.financiador}`,
      filters.project_id  && `Proyecto: ${filters.project_id}`,
      filters.prioridad   && `Prioridad: ${filters.prioridad}`,
      filters.date_from   && `Desde: ${filters.date_from}`,
      filters.date_to     && `Hasta: ${filters.date_to}`,
    ].filter(Boolean).join(' · ');
    if (filtersActive) {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 54, 93);
      doc.text(`Filtros: ${filtersActive}`, 14, 32);
    }

    // KPI boxes
    const kpi = data.kpi;
    const kpiItems: { label: string; value: string | number; color: [number, number, number] }[] = [
      { label: 'Total Tareas', value: kpi.total,       color: [26,  54,  93]  },
      { label: 'Vigentes',     value: kpi.vigentes,    color: [59,  130, 246] },
      { label: 'Completadas',  value: kpi.completadas, color: [16,  185, 129] },
      { label: 'Vencidas',     value: kpi.vencidas,    color: [239, 68,  68]  },
      { label: 'Avance',       value: kpi.cumplimiento != null ? `${kpi.cumplimiento}%` : '—', color: [234, 179, 8] },
    ];

    const startKPI = filtersActive ? 36 : 31;
    const kpiBoxW  = (pageW - 28 - (kpiItems.length - 1) * 2) / kpiItems.length;
    kpiItems.forEach((item, i) => {
      const x = 14 + i * (kpiBoxW + 2);
      doc.setFillColor(...item.color);
      doc.roundedRect(x, startKPI, kpiBoxW, 16, 2, 2, 'F');
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(String(item.value), x + kpiBoxW / 2, startKPI + 8.5, { align: 'center' });
      doc.setFontSize(6); doc.setFont('helvetica', 'normal');
      doc.text(item.label.toUpperCase(), x + kpiBoxW / 2, startKPI + 13, { align: 'center' });
    });

    // Layout de graficas: asimetrico y con tarjetas
    const gridY   = startKPI + 19;
    const colGap  = 5;
    const rowGap  = 5;
    const LABEL_H = 7;
    const PAD     = 3;
    const totalW  = pageW - 28;
    const totalH  = pageH - 8 - gridY;
    const row1H   = Math.round(totalH * 0.52);
    const row2H   = totalH - rowGap - row1H;
    // Fila 1 asimetrica: donut cuadrado (37%) | stacked horizontal (63%)
    const donutW   = Math.round(totalW * 0.37);
    const stackedW = totalW - colGap - donutW;
    // Fila 2 simetrica
    const halfW    = (totalW - colGap) / 2;

    const drawCell = (x: number, y: number, w: number, h: number, title: string) => {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, w, h, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, h, 3, 3, 'S');
      doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(title.toUpperCase(), x + w / 2, y + LABEL_H - 1, { align: 'center' });
    };

    const placeChart = (
      img: { dataUrl: string; pxW: number; pxH: number } | null,
      x: number, y: number, cw: number, ch: number,
    ) => {
      if (!img) return;
      const availW = cw - PAD * 2;
      const availH = ch - LABEL_H - PAD;
      const ratio  = img.pxH / img.pxW;
      let iw = availW;
      let ih = iw * ratio;
      if (ih > availH) { ih = availH; iw = ih / ratio; }
      doc.addImage(img.dataUrl, 'PNG', x + (cw - iw) / 2, y + LABEL_H + (availH - ih) / 2, iw, ih);
    };

    const r1y = gridY;
    const r2y = gridY + row1H + rowGap;

    drawCell(14,                  r1y, donutW,   row1H, 'Distribucion de Estados');
    drawCell(14 + donutW + colGap, r1y, stackedW, row1H, 'Eficiencia por Responsable');
    drawCell(14,                  r2y, halfW,    row2H, 'Carga Laboral');
    drawCell(14 + halfW + colGap, r2y, halfW,    row2H, 'Tareas Vencidas');

    placeChart(donutImg,    14,                   r1y, donutW,   row1H);
    placeChart(stackedImg,  14 + donutW + colGap, r1y, stackedW, row1H);
    placeChart(workloadImg, 14,                   r2y, halfW,    row2H);
    placeChart(overdueImg,  14 + halfW + colGap,  r2y, halfW,    row2H);

    // Footer
    doc.setFillColor(26, 54, 93);
    doc.rect(0, pageH - 8, pageW, 8, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 220, 255);
    doc.text('ALZAK FOUNDATION — Dashboard BI · Documento Confidencial', 14, pageH - 3);
    doc.text('Página 1', pageW - 20, pageH - 3);

    openPDFPreview(doc);
  }, [data, filters]);

  const empresas = useMemo(() =>
    Array.from(new Set(projects.map((p) => p.empresa).filter((e): e is string => !!e))).sort()
  , [projects]);

  const financiadores = useMemo(() =>
    Array.from(new Set(projects.map((p) => (p as { financiador?: string }).financiador).filter((f): f is string => !!f))).sort()
  , [projects]);

  return {
    data, loading, error,
    filters, patchFilters, resetFilters,
    projectOptions: projects.filter((p) => p.id_proyecto !== '1111'),
    empresas,
    financiadores,
    myTasks,
    prioridad,
    vencimientos,
    progresoProyectos,
    exportCSV,
    generateReport,
    generateAdminReport,
    refresh: () => fetchData(filters),
  };
}
