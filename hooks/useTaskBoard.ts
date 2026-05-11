"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTaskStore, TaskWithMeta } from '@/context/TaskStoreContext';
import type { TareaPrioridad, TareaStatus } from '@/lib/mockData';

export type TaskBoardTab = 'board' | 'historial' | 'lista';

export interface ProyectoOption    { id: string;    nombre: string }
export interface ResponsableOption { correo: string; nombre: string }

export interface TaskBoardState {
  // Datos
  filtered:      TaskWithMeta[];
  activeTasks:   TaskWithMeta[];
  completedCount: number;
  isAdmin:       boolean;
  // Opciones para selects de admin
  proyectoOptions:    ProyectoOption[];
  responsableOptions: ResponsableOption[];
  // UI state
  tab:               TaskBoardTab;
  searchText:        string;
  filterPrioridad:   TareaPrioridad | 'Todas';
  filterStatus:      TareaStatus | 'Todas';
  filterProyecto:    string;
  filterResponsable: string;
  newTaskOpen:       boolean;
  modalTask:         TaskWithMeta | null;
  chatFocus:         boolean;
  // Acciones
  setTab:               (t: TaskBoardTab) => void;
  setSearchText:        (s: string) => void;
  setFilterPrioridad:   (p: TareaPrioridad | 'Todas') => void;
  setFilterStatus:      (s: TareaStatus | 'Todas') => void;
  setFilterProyecto:    (v: string) => void;
  setFilterResponsable: (v: string) => void;
  openModal:            (t: TaskWithMeta) => void;
  closeModal:           () => void;
  setNewTaskOpen:       (v: boolean) => void;
  setChatFocus:         (v: boolean) => void;
}

export function useTaskBoard(initialOpenId?: string | null, initialFocus?: string | null): TaskBoardState {
  const { user }    = useAuth();
  const { tasks }   = useTaskStore();
  const router      = useRouter();
  const isAdmin     = user?.role === 'superadmin' || user?.role === 'admin';

  const [tab,               setTab]               = useState<TaskBoardTab>('board');
  const [searchText,        setSearchText]        = useState('');
  const [filterPrioridad,   setFilterPrioridad]   = useState<TareaPrioridad | 'Todas'>('Todas');
  const [filterStatus,      setFilterStatus]      = useState<TareaStatus | 'Todas'>('Todas');
  const [filterProyecto,    setFilterProyecto]    = useState('');
  const [filterResponsable, setFilterResponsable] = useState('');
  const [selectedTask,      setSelectedTask]      = useState<TaskWithMeta | null>(null);
  const [newTaskOpen,       setNewTaskOpen]        = useState(false);
  const [chatFocus,         setChatFocus]          = useState(false);
  const lastOpenedId = useRef<string | null>(null);

  // Auto-open task from URL param (e.g. /tareas?open=42&focus=notas from a notification click)
  useEffect(() => {
    if (!initialOpenId || tasks.length === 0) return;
    if (lastOpenedId.current === initialOpenId) return;
    const taskId = parseInt(initialOpenId, 10);
    const found  = tasks.find((t) => t.id === taskId);
    if (found) {
      lastOpenedId.current = initialOpenId;
      setSelectedTask(found);
      if (initialFocus === 'notas') setChatFocus(true);
      router.replace('/tareas', { scroll: false });
    }
  }, [initialOpenId, initialFocus, tasks, router]);

  const openModal  = useCallback((t: TaskWithMeta) => { setChatFocus(false); setSelectedTask(t); }, []);
  const closeModal = useCallback(() => { setSelectedTask(null); setChatFocus(false); }, []);

  // Sync modal con la versión más reciente del store
  const modalTask = useMemo(
    () => (selectedTask ? (tasks.find((t) => t.id === selectedTask.id) ?? null) : null),
    [selectedTask, tasks],
  );

  // Base sin filtros de rol (para derivar opciones de selects con el universo completo)
  const adminBase = useMemo(
    () => (isAdmin ? tasks : tasks.filter((t) => t.responsable_correo === user?.email)),
    [tasks, isAdmin, user?.email],
  );

  const proyectoOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of adminBase) {
      if (!seen.has(t.id_proyecto)) seen.set(t.id_proyecto, t.nombre_proyecto);
    }
    return Array.from(seen.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [adminBase]);

  const responsableOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of adminBase) {
      if (!seen.has(t.responsable_correo)) seen.set(t.responsable_correo, t.responsable_nombre);
    }
    return Array.from(seen.entries())
      .map(([correo, nombre]) => ({ correo, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [adminBase]);

  const filtered = useMemo(() => {
    let base = adminBase;
    if (filterPrioridad   !== 'Todas') base = base.filter((t) => t.prioridad === filterPrioridad);
    if (filterProyecto)                base = base.filter((t) => t.id_proyecto === filterProyecto);
    if (filterResponsable)             base = base.filter((t) => t.responsable_correo === filterResponsable);
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      base = base.filter(
        (t) =>
          t.tarea_descripcion.toLowerCase().includes(q) ||
          t.responsable_nombre.toLowerCase().includes(q) ||
          t.id_proyecto.toLowerCase().includes(q),
      );
    }
    return base;
  }, [adminBase, filterPrioridad, filterProyecto, filterResponsable, searchText]);

  const activeTasks    = filtered.filter((t) => t.status !== 'Completada');
  const completedCount = filtered.filter((t) => t.status === 'Completada').length;

  return {
    filtered, activeTasks, completedCount, isAdmin,
    proyectoOptions, responsableOptions,
    tab, searchText, filterPrioridad, filterStatus, filterProyecto, filterResponsable,
    newTaskOpen, modalTask, chatFocus,
    setTab, setSearchText, setFilterPrioridad, setFilterStatus,
    setFilterProyecto, setFilterResponsable,
    openModal, closeModal, setNewTaskOpen, setChatFocus,
  };
}
