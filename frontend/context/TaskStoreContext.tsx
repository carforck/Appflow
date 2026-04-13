"use client";

import {
  createContext, useContext, useState, useCallback, ReactNode,
} from 'react';
import { MOCK_TAREAS, MockTarea, TareaStatus, TareaPrioridad } from '@/lib/mockData';

export interface NewTaskData {
  id_proyecto: string;
  nombre_proyecto: string;
  tarea_descripcion: string;
  responsable_nombre: string;
  responsable_correo: string;
  prioridad: TareaPrioridad;
  fecha_inicio: string;
  fecha_entrega: string;
}

// ── Tipos ──────────────────────────────────────────────────────────────────────
export interface TaskNote {
  id: number;
  texto: string;
  autor: string;
  timestamp: string;   // ISO string
}

export interface TaskWithMeta extends MockTarea {
  notas: TaskNote[];
  completedAt: string | null;  // ISO string — cuando pasó a "Completada"
}

interface TaskStoreCtx {
  tasks: TaskWithMeta[];
  updateStatus: (id: number, status: TareaStatus) => void;
  addNote: (id: number, texto: string, autor: string) => void;
  createTask: (data: NewTaskData) => TaskWithMeta;
}

// ── Contexto ───────────────────────────────────────────────────────────────────
const TaskStoreContext = createContext<TaskStoreCtx | null>(null);

// Inicializar con datos mock: añadir notas vacías + completedAt para las Completadas
function initTasks(): TaskWithMeta[] {
  return MOCK_TAREAS.map((t) => ({
    ...t,
    notas: [],
    completedAt: t.status === 'Completada' ? t.fecha_entrega : null,
  }));
}

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<TaskWithMeta[]>(initTasks);

  const updateStatus = useCallback((id: number, status: TareaStatus) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              completedAt:
                status === 'Completada'
                  ? new Date().toISOString()
                  : t.completedAt,
            }
          : t,
      ),
    );
  }, []);

  const addNote = useCallback((id: number, texto: string, autor: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              notas: [
                ...t.notas,
                {
                  id: Date.now(),
                  texto,
                  autor,
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : t,
      ),
    );
  }, []);

  const createTask = useCallback((data: NewTaskData): TaskWithMeta => {
    const newTask: TaskWithMeta = {
      id: Date.now(),
      id_proyecto: data.id_proyecto,
      nombre_proyecto: data.nombre_proyecto,
      tarea_descripcion: data.tarea_descripcion,
      responsable_nombre: data.responsable_nombre,
      responsable_correo: data.responsable_correo,
      prioridad: data.prioridad,
      status: 'Pendiente',
      fecha_entrega: data.fecha_entrega,
      notas: [],
      completedAt: null,
    };
    setTasks((prev) => [newTask, ...prev]);
    return newTask;
  }, []);

  return (
    <TaskStoreContext.Provider value={{ tasks, updateStatus, addNote, createTask }}>
      {children}
    </TaskStoreContext.Provider>
  );
}

export function useTaskStore() {
  const ctx = useContext(TaskStoreContext);
  if (!ctx) throw new Error('useTaskStore must be used within TaskStoreProvider');
  return ctx;
}
