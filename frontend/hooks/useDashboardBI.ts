"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { authFetch } from '@/lib/api';
import { useAuth }         from '@/context/AuthContext';
import { useProjectStore } from '@/context/ProjectStoreContext';
import { useTaskStore, TaskWithMeta } from '@/context/TaskStoreContext';
import { loadPDFLibs, openPDFPreview, addPDFLogo } from '@/lib/pdfUtils';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface DashboardFilters {
  project_id: string;
  prioridad:  string;
  date_from:  string;
  date_to:    string;
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
  project_id: '',
  prioridad:  '',
  date_from:  '',
  date_to:    '',
};

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

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useDashboardBI() {
  const { user }               = useAuth();
  const { projects }           = useProjectStore();
  const { tasks, tasksLastModified } = useTaskStore();

  const [filters,  setFilters]  = useState<DashboardFilters>(EMPTY_FILTERS);
  const [data,     setData]     = useState<DashboardData>(EMPTY);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  // Tareas del usuario actual (excluye Pendiente Revisión)
  const myTasks = useMemo<TaskWithMeta[]>(() =>
    tasks.filter((t) => (t.status as string) !== 'Pendiente Revisión'),
    [tasks],
  );

  const fetchData = useCallback(async (f: DashboardFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f.project_id) params.set('project_id', f.project_id);
      if (f.prioridad)  params.set('prioridad',  f.prioridad);
      if (f.date_from)  params.set('date_from',  f.date_from);
      if (f.date_to)    params.set('date_to',    f.date_to);
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
    setFilters((prev) => ({ ...prev, ...patch }));
  }
  function resetFilters() { setFilters(EMPTY_FILTERS); }

  // ── Exportación CSV ────────────────────────────────────────────────────────
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

  // ── Reporte personal PDF (vista previa en nueva pestaña) ───────────────────
  const generateReport = useCallback(async () => {
    if (!user) return;
    const { JsPDF } = await loadPDFLibs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc: any = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // ── Encabezado ──────────────────────────────────────────────────────────
    doc.setFillColor(26, 54, 93);
    doc.rect(0, 0, pageW, 22, 'F');
    await addPDFLogo(doc, pageW, 22);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ALZAK FOUNDATION', 14, 10);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 220, 255);
    doc.text('Reporte Personal de Actividades', 14, 16);

    // ── Info del usuario ─────────────────────────────────────────────────────
    const fechaGen = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 54, 93);
    doc.text(user.nombre ?? '', 14, 30);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(user.email ?? '', 14, 35);
    doc.text(`Generado: ${fechaGen}`, 14, 40);

    // ── KPI boxes ────────────────────────────────────────────────────────────
    const kpi = data.kpi;
    const kpiItems: { label: string; value: string | number; color: [number, number, number] }[] = [
      { label: 'Vigentes',     value: kpi.vigentes,    color: [26,  54,  93]  },
      { label: 'Completadas',  value: kpi.completadas, color: [16,  185, 129] },
      { label: 'Vencidas',     value: kpi.vencidas,    color: [239, 68,  68]  },
      { label: 'Cumplimiento', value: kpi.cumplimiento != null ? `${kpi.cumplimiento}%` : '—', color: [59, 130, 246] },
    ];
    const boxW = (pageW - 28 - 6) / 4;
    kpiItems.forEach((item, i) => {
      const x = 14 + i * (boxW + 2);
      doc.setFillColor(...item.color);
      doc.roundedRect(x, 46, boxW, 16, 2, 2, 'F');
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(String(item.value), x + boxW / 2, 54.5, { align: 'center' });
      doc.setFontSize(6); doc.setFont('helvetica', 'normal');
      doc.text(item.label.toUpperCase(), x + boxW / 2, 59, { align: 'center' });
    });

    // ── Tabla de actividades ─────────────────────────────────────────────────
    const fmt = (d: string | undefined) => {
      if (!d) return '—';
      try { return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
      catch { return d; }
    };

    doc.autoTable({
      startY: 68,
      head: [['Proyecto', 'Tarea', 'Prioridad', 'Estado', 'Fecha Entrega']],
      body: myTasks.map((t) => [
        t.nombre_proyecto ?? t.id_proyecto,
        t.tarea_descripcion,
        t.prioridad,
        t.status,
        fmt(t.fecha_entrega),
      ]),
      headStyles:           { fillColor: [26, 54, 93], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles:           { fontSize: 7.5, cellPadding: 2 },
      alternateRowStyles:   { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 80 },
        2: { cellWidth: 20 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
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
        const pageH = doc.internal.pageSize.getHeight();
        doc.setFillColor(26, 54, 93);
        doc.rect(0, pageH - 8, pageW, 8, 'F');
        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.setTextColor(200, 220, 255);
        doc.text('ALZAK FOUNDATION — Documento Confidencial', 14, pageH - 3);
        doc.text(`Página ${d.pageNumber}`, pageW - 25, pageH - 3);
      },
    });

    openPDFPreview(doc);
  }, [user, data, myTasks]);

  // ── Reporte BI admin PDF (landscape, previsualización en nueva pestaña) ──────
  const generateAdminReport = useCallback(async () => {
    const { JsPDF } = await loadPDFLibs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc: any = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const footer = (pageNum: number) => {
      doc.setFillColor(26, 54, 93);
      doc.rect(0, pageH - 8, pageW, 8, 'F');
      doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 220, 255);
      doc.text('ALZAK FOUNDATION — Dashboard BI · Documento Confidencial', 14, pageH - 3);
      doc.text(`Página ${pageNum}`, pageW - 20, pageH - 3);
    };

    // ── Encabezado ────────────────────────────────────────────────────────────
    doc.setFillColor(26, 54, 93);
    doc.rect(0, 0, pageW, 22, 'F');
    await addPDFLogo(doc, pageW, 22);
    doc.setFontSize(15); doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ALZAK FOUNDATION', 14, 10);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 220, 255);
    doc.text('Dashboard de Inteligencia de Negocios', 14, 16);

    // ── Metadatos y filtros activos ───────────────────────────────────────────
    const fechaGen = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado: ${fechaGen}`, 14, 29);

    const filtersActive = [
      filters.project_id && `Proyecto: ${filters.project_id}`,
      filters.prioridad  && `Prioridad: ${filters.prioridad}`,
      filters.date_from  && `Desde: ${filters.date_from}`,
      filters.date_to    && `Hasta: ${filters.date_to}`,
    ].filter(Boolean).join(' · ');
    if (filtersActive) {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(26, 54, 93);
      doc.text(`Filtros: ${filtersActive}`, 14, 34);
    }

    // ── KPI boxes (4 columnas) ────────────────────────────────────────────────
    const kpi = data.kpi;
    const kpiItems: { label: string; value: string | number; color: [number, number, number] }[] = [
      { label: 'Total Tareas',  value: kpi.total,       color: [26,  54,  93]  },
      { label: 'Vigentes',      value: kpi.vigentes,    color: [59,  130, 246] },
      { label: 'Completadas',   value: kpi.completadas, color: [16,  185, 129] },
      { label: 'Vencidas',      value: kpi.vencidas,    color: [239, 68,  68]  },
    ];
    const cumplimiento = kpi.cumplimiento != null ? `${kpi.cumplimiento}%` : '—';
    kpiItems.push({ label: 'Avance', value: cumplimiento, color: [234, 179, 8] });

    const startKPI = filtersActive ? 39 : 34;
    const boxW = (pageW - 28 - (kpiItems.length - 1) * 2) / kpiItems.length;
    kpiItems.forEach((item, i) => {
      const x = 14 + i * (boxW + 2);
      doc.setFillColor(...item.color);
      doc.roundedRect(x, startKPI, boxW, 18, 2, 2, 'F');
      doc.setFontSize(15); doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(String(item.value), x + boxW / 2, startKPI + 10, { align: 'center' });
      doc.setFontSize(6); doc.setFont('helvetica', 'normal');
      doc.text(item.label.toUpperCase(), x + boxW / 2, startKPI + 15.5, { align: 'center' });
    });

    // ── Tabla: Tareas Vencidas ────────────────────────────────────────────────
    const startTbl = startKPI + 23;
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 54, 93);
    doc.text('Tareas Vencidas', 14, startTbl - 2);

    const fmt = (d: string | undefined) => {
      if (!d) return '—';
      try { return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
      catch { return d; }
    };

    if (data.tareas_vencidas.length === 0) {
      doc.setFontSize(8); doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('Sin tareas vencidas', 14, startTbl + 4);
    } else {
      doc.autoTable({
        startY: startTbl,
        head: [['ID', 'Proyecto', 'Tarea', 'Responsable', 'Prioridad', 'F. Entrega', 'Días']],
        body: data.tareas_vencidas.map((t) => [
          t.id_proyecto,
          t.nombre_proyecto ?? t.id_proyecto,
          t.tarea_descripcion,
          t.responsable_nombre || '—',
          t.prioridad,
          fmt(t.fecha_entrega),
          t.dias_vencida,
        ]),
        headStyles:         { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
        bodyStyles:         { fontSize: 7, cellPadding: 1.8 },
        alternateRowStyles: { fillColor: [255, 245, 245] },
        columnStyles: {
          0: { cellWidth: 18, fontStyle: 'bold' },
          1: { cellWidth: 40 },
          2: { cellWidth: 90 },
          3: { cellWidth: 42 },
          4: { cellWidth: 18 },
          5: { cellWidth: 22 },
          6: { cellWidth: 12, halign: 'center' as const },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didParseCell: (d: any) => {
          if (d.section !== 'body') return;
          if (d.column.index === 4) {
            const c = PRIO_COLOR[d.cell.raw as string];
            if (c) { d.cell.styles.textColor = c; d.cell.styles.fontStyle = 'bold'; }
          }
          if (d.column.index === 6 && Number(d.cell.raw) > 7) {
            d.cell.styles.textColor = [239, 68, 68];
            d.cell.styles.fontStyle = 'bold';
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didDrawPage: (d: any) => footer(d.pageNumber),
      });
    }

    // ── Tabla: Carga laboral ──────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const afterVencidas = (doc as any).lastAutoTable?.finalY ?? startTbl + 10;
    const startCarga = afterVencidas + 10;

    if (startCarga < pageH - 50) {
      doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 54, 93);
      doc.text('Carga Laboral por Responsable', 14, startCarga - 2);

      doc.autoTable({
        startY: startCarga,
        head: [['Responsable', 'Vigentes', 'Vencidas Activas', 'Estado']],
        body: data.cargaLaboral.map((c) => [
          c.nombre,
          c.vigentes,
          c.vencidas_activas,
          c.vencidas_activas > 0 ? '⚠ Con retrasos' : '✓ Al día',
        ]),
        headStyles:         { fillColor: [26, 54, 93], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
        bodyStyles:         { fontSize: 7.5, cellPadding: 2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 25, halign: 'center' as const },
          2: { cellWidth: 30, halign: 'center' as const },
          3: { cellWidth: 35 },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didParseCell: (d: any) => {
          if (d.section !== 'body') return;
          if (d.column.index === 2 && Number(d.cell.raw) > 0) {
            d.cell.styles.textColor = [239, 68, 68]; d.cell.styles.fontStyle = 'bold';
          }
          if (d.column.index === 3) {
            d.cell.styles.textColor = String(d.cell.raw).startsWith('⚠')
              ? [245, 158, 11] : [16, 185, 129];
            d.cell.styles.fontStyle = 'bold';
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didDrawPage: (d: any) => footer(d.pageNumber),
      });
    }

    // Footer de la primera página (si no hubo tabla que lo dibujara)
    if (data.tareas_vencidas.length === 0 && data.cargaLaboral.length === 0) {
      footer(1);
    }

    openPDFPreview(doc);
  }, [data, filters]);

  return {
    data, loading, error,
    filters, patchFilters, resetFilters,
    projectOptions: projects.filter((p) => p.id_proyecto !== '1111'),
    myTasks,
    exportCSV,
    generateReport,
    generateAdminReport,
    refresh: () => fetchData(filters),
  };
}
