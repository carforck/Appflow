"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTaskStore, TaskWithMeta } from '@/context/TaskStoreContext';
import type { TareaPrioridad } from '@/lib/mockData';

export type TaskBoardTab = 'board' | 'historial' | 'lista';

export interface TaskBoardState {
  // Datos
  filtered:      TaskWithMeta[];
  activeTasks:   TaskWithMeta[];
  completedCount: number;
  isAdmin:       boolean;
  // UI state
  tab:             TaskBoardTab;
  searchText:      string;
  filterPrioridad: TareaPrioridad | 'Todas';
  newTaskOpen:     boolean;
  modalTask:       TaskWithMeta | null;
  chatFocus:       boolean;
  // Acciones
  setTab:             (t: TaskBoardTab) => void;
  setSearchText:      (s: string) => void;
  setFilterPrioridad: (p: TareaPrioridad | 'Todas') => void;
  openModal:          (t: TaskWithMeta) => void;
  closeModal:         () => void;
  setNewTaskOpen:     (v: boolean) => void;
  setChatFocus:       (v: boolean) => void;
}

export function useTaskBoard(initialOpenId?: string | null, initialFocus?: string | null): TaskBoardState {
  const { user }    = useAuth();
  const { tasks }   = useTaskStore();
  const router      = useRouter();
  const isAdmin     = user?.role === 'superadmin' || user?.role === 'admin';

  const [tab,             setTab]             = useState<TaskBoardTab>('board');
  const [searchText,      setSearchText]      = useState('');
  const [filterPrioridad, setFilterPrioridad] = useState<TareaPrioridad | 'Todas'>('Todas');
  const [selectedTask,    setSelectedTask]    = useState<TaskWithMeta | null>(null);
  const [newTaskOpen,     setNewTaskOpen]     = useState(false);
  const [chatFocus,       setChatFocus]       = useState(false);
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

  const filtered = useMemo(() => {
    let base = isAdmin ? tasks : tasks.filter((t) => t.responsable_correo === user?.email);
    if (filterPrioridad !== 'Todas') base = base.filter((t) => t.prioridad === filterPrioridad);
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
  }, [tasks, isAdmin, user?.email, filterPrioridad, searchText]);

  const activeTasks    = filtered.filter((t) => t.status !== 'Completada');
  const completedCount = filtered.filter((t) => t.status === 'Completada').length;

  return {
    filtered, activeTasks, completedCount, isAdmin,
    tab, searchText, filterPrioridad, newTaskOpen, modalTask, chatFocus,
    setTab, setSearchText, setFilterPrioridad, openModal, closeModal, setNewTaskOpen, setChatFocus,
  };
}
