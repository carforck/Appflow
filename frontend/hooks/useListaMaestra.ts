"use client";

import { useState, useMemo } from 'react';
import { useTaskStore, TaskWithMeta } from '@/context/TaskStoreContext';
import { useProjectStore } from '@/context/ProjectStoreContext';
import { useUsuarios } from '@/hooks/useUsuarios';
import { authFetch } from '@/lib/api';
import { loadPDFLibs, openPDFPreview, addPDFLogo } from '@/lib/pdfUtils';
import type { TareaStatus, TareaPrioridad, MockProject } from '@/lib/mockData';

export type MaestroChanges = {
  prioridad?:          TareaPrioridad;
  responsable_nombre?: string;
  responsable_correo?: string;
  fecha_inicio?:       string;
  fecha_entrega?:      string;
  id_proyecto?:        string;
  tarea_descripcion?:  string;
  estado_tarea?:       TareaStatus;
};

export type ProjectCascade = Pick<MockProject, 'id_proyecto' | 'nombre_proyecto'> & {
  empresa?:     string | null;
  financiador?: string | null;
};

export function useListaMaestra() {
  const { tasks, refresh } = useTaskStore();
  const { projects }       = useProjectStore();
  const { users }          = useUsuarios();

  const [filterProyecto,   setFilterProyecto]   = useState('');
  const [filterResponsable,setFilterResponsable] = useState('');
  const [filterEstado,     setFilterEstado]      = useState<TareaStatus | ''>('');
  const [filterPrioridad,  setFilterPrioridad]   = useState<TareaPrioridad | ''>('');

  // Cascade map id_proyecto → info del proyecto
  const projectMap = useMemo(() => {
    const map: Record<string, ProjectCascade> = {};
    for (const p of projects) {
      map[p.id_proyecto] = {
        id_proyecto:     p.id_proyecto,
        nombre_proyecto: p.nombre_proyecto,
        empresa:         (p as { empresa?: string | null }).empresa,
        financiador:     (p as { financiador?: string | null }).financiador,
      };
    }
    return map;
  }, [projects]);

  // Responsables únicos de las tareas actuales (para el select de filtro)
  const responsableOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) {
      if (t.responsable_correo) map.set(t.responsable_correo, t.responsable_nombre);
    }
    return Array.from(map.entries()).map(([correo, nombre]) => ({ correo, nombre }));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let base = [...tasks];
    if (filterProyecto)    base = base.filter((t) => t.id_proyecto === filterProyecto);
    if (filterResponsable) base = base.filter((t) => t.responsable_correo === filterResponsable);
    if (filterEstado)      base = base.filter((t) => t.status === filterEstado);
    if (filterPrioridad)   base = base.filter((t) => t.prioridad === filterPrioridad);
    return base;
  }, [tasks, filterProyecto, filterResponsable, filterEstado, filterPrioridad]);

  const hasActiveFilters = !!(filterProyecto || filterResponsable || filterEstado || filterPrioridad);

  function resetFilters() {
    setFilterProyecto('');
    setFilterResponsable('');
    setFilterEstado('');
    setFilterPrioridad('');
  }

  const update = async (taskId: number, changes: MaestroChanges): Promise<boolean> => {
    try {
      const res = await authFetch(`/tareas/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
      if (!res.ok) return false;
      await refresh();
      return true;
    } catch {
      return false;
    }
  };

  const exportPDF = async (tasksToExport: TaskWithMeta[]) => {
    const { JsPDF } = await loadPDFLibs();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc: any = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // ── Banner superior ─────────────────────────────────────────────────────────
    doc.setFillColor(26, 54, 93);
    doc.rect(0, 0, pageW, 20, 'F');
    await addPDFLogo(doc, pageW, 20);

    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('ALZAK FOUNDATION', 14, 9);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 220, 255);
    doc.text('Lista Maestra de Tareas', 14, 15);

    // ── Metadatos ───────────────────────────────────────────────────────────────
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const fechaGen = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Generado: ${fechaGen}`, 14, 27);
    doc.text(`Total tareas: ${tasksToExport.length}`, 14, 32);

    // Filtros activos
    const activeFilters = [
      filterProyecto    && `Proyecto: ${projectMap[filterProyecto]?.nombre_proyecto ?? filterProyecto}`,
      filterResponsable && `Responsable: ${responsableOptions.find((r) => r.correo === filterResponsable)?.nombre ?? filterResponsable}`,
      filterEstado      && `Estado: ${filterEstado}`,
      filterPrioridad   && `Prioridad: ${filterPrioridad}`,
    ].filter(Boolean).join(' · ');

    if (activeFilters) {
      doc.setTextColor(26, 54, 93);
      doc.setFont('helvetica', 'bold');
      doc.text(`Filtros: ${activeFilters}`, 14, 37);
    }

    // ── Tabla ───────────────────────────────────────────────────────────────────
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

    const fmt = (d: string | undefined) => {
      if (!d) return '—';
      try { return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
      catch { return d; }
    };

    // jspdf-autotable UMD patches the prototype → call as doc.autoTable()
    doc.autoTable({
      startY: activeFilters ? 42 : 37,
      head: [['ID Proyecto', 'Proyecto', 'Tarea', 'Responsable', 'Estado', 'Prioridad', 'F. Inicio', 'F. Entrega']],
      body: tasksToExport.map((t) => [
        t.id_proyecto,
        projectMap[t.id_proyecto]?.nombre_proyecto ?? t.nombre_proyecto,
        t.tarea_descripcion,
        t.responsable_nombre || '—',
        t.status,
        t.prioridad,
        fmt(t.fecha_inicio),
        fmt(t.fecha_entrega),
      ]),
      headStyles: {
        fillColor: [26, 54, 93],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: 7.5, cellPadding: 2 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 18, fontStyle: 'bold' },
        1: { cellWidth: 42 },
        2: { cellWidth: 70 },
        3: { cellWidth: 38 },
        4: { cellWidth: 22 },
        5: { cellWidth: 18 },
        6: { cellWidth: 20 },
        7: { cellWidth: 20 },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell: (data: any) => {
        if (data.section === 'body') {
          if (data.column.index === 4) {
            const color = STATUS_COLOR[data.cell.raw as string];
            if (color) data.cell.styles.textColor = color;
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.column.index === 5) {
            const color = PRIO_COLOR[data.cell.raw as string];
            if (color) data.cell.styles.textColor = color;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      // Footer con paginación
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didDrawPage: (data: any) => {
        const pageH = doc.internal.pageSize.getHeight();
        doc.setFillColor(26, 54, 93);
        doc.rect(0, pageH - 8, pageW, 8, 'F');
        doc.setFontSize(7);
        doc.setTextColor(200, 220, 255);
        doc.setFont('helvetica', 'normal');
        doc.text('ALZAK FOUNDATION — Documento Confidencial', 14, pageH - 3);
        doc.text(
          `Página ${data.pageNumber}`,
          pageW - 25,
          pageH - 3,
        );
      },
    });

    openPDFPreview(doc);
  };

  return {
    tasks: filteredTasks,
    users,
    projects,
    projectMap,
    responsableOptions,
    // filtros
    filterProyecto,   setFilterProyecto,
    filterResponsable,setFilterResponsable,
    filterEstado,     setFilterEstado,
    filterPrioridad,  setFilterPrioridad,
    hasActiveFilters,
    resetFilters,
    // acciones
    update,
    exportPDF,
  };
}
