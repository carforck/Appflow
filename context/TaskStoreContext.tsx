"use client";

import {
  createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode,
} from 'react';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import type { MockTarea, TareaStatus, TareaPrioridad } from '@/lib/mockData';

export interface RevisionTask {
  id: number;
  id_proyecto: string;
  nombre_proyecto: string;
  empresa?: string;
  financiador?: string;
  tarea_descripcion: string;
  responsable_nombre: string;
  responsable_correo: string;
  prioridad: TareaPrioridad;
  fecha_inicio?: string;
  fecha_entrega: string;
  resumen_meeting?: string;
}

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
export interface TaskWithMeta extends MockTarea {
  completedAt: string | null;  // ISO string — cuando pasó a "Completada"
}

interface TaskStoreCtx {
  tasks:                  TaskWithMeta[];
  loading:                boolean;
  tasksLastModified:      number;
  updateStatus:           (id: number, status: TareaStatus) => void;
  createTask:             (data: NewTaskData) => TaskWithMeta;
  refresh:                () => Promise<void>;
  revisionTasks:          RevisionTask[];
  revisionCount:          number;
  refreshRevision:        () => Promise<void>;
  newIngestedFiles:       string[];
  clearNewIngestedFiles:  () => void;
}

// ── ID temporal para tareas creadas localmente (negativo → nunca colisiona con IDs de DB) ──
let _tempId = 0;
const nextTempId = () => --_tempId;

// ── Contexto ───────────────────────────────────────────────────────────────────
const TaskStoreContext = createContext<TaskStoreCtx | null>(null);

function mapApiTask(t: MockTarea): TaskWithMeta {
  return {
    ...t,
    completedAt: t.fecha_finalizacion ?? (t.status === 'Completada' ? t.fecha_entrega : null),
  };
}

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const { user }  = useAuth();
  const socket    = useSocket();
  const [tasks,              setTasks]              = useState<TaskWithMeta[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [tasksLastModified,  setTasksLastModified]  = useState(0);
  const [revisionTasks,      setRevisionTasks]      = useState<RevisionTask[]>([]);
  const [newIngestedFiles, setNewIngestedFiles] = useState<string[]>([]);
  const prevRevisionIds = useRef<Set<number>>(new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/tareas');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTasks((data.tareas ?? []).map(mapApiTask));
    } catch {
      // En caso de error (ej. no autenticado), dejar la lista vacía
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearNewIngestedFiles = useCallback(() => setNewIngestedFiles([]), []);

  const refreshRevision = useCallback(async () => {
    if (!user || user.role === 'user') return;
    try {
      const res = await authFetch('/tareas/revision');
      if (!res.ok) return;
      const data = await res.json();
      const tasks: RevisionTask[] = data.tareas ?? [];

      // Detectar tareas nuevas de ingesta Drive (solo después de la carga inicial)
      if (prevRevisionIds.current.size > 0) {
        const newDriveFiles: string[] = [];
        for (const t of tasks) {
          if (!prevRevisionIds.current.has(t.id)) {
            const match = t.resumen_meeting?.match(/^\[Drive: ([^\]]+)\]/);
            if (match) newDriveFiles.push(match[1]);
          }
        }
        if (newDriveFiles.length > 0) setNewIngestedFiles(newDriveFiles);
      }

      prevRevisionIds.current = new Set(tasks.map((t) => t.id));
      setRevisionTasks(tasks);
    } catch {
      // silently fail — admin-only feature
    }
  }, [user]);

  useEffect(() => { refresh(); },          [refresh]);
  useEffect(() => { refreshRevision(); },  [refreshRevision]);

  // ── Socket: sincronización del tablero en tiempo real ────────────────────
  useEffect(() => {
    if (!socket) return;

    // Admin movió / editó una tarea → actualizar la tarjeta en el board sin recargar
    const handleTaskUpdated = (data: Partial<TaskWithMeta> & { id: number; fecha_finalizacion?: string | null }) => {
      setTasks((prev) => prev.map((t) => {
        if (t.id !== data.id) return t;
        const merged = { ...t, ...data };
        // Usar fecha_finalizacion de BD si viene en el payload; si no, derivar del status
        if ('fecha_finalizacion' in data) {
          merged.completedAt = data.fecha_finalizacion ?? null;
        } else if (data.status === 'Completada' && !t.completedAt) {
          merged.completedAt = new Date().toISOString();
        } else if (data.status && data.status !== 'Completada') {
          merged.completedAt = null;
        }
        return merged as TaskWithMeta;
      }));
      setTasksLastModified(Date.now());
    };

    // Nueva tarea creada / aprobada / rechazada → refrescar ambas listas
    const handleTaskCreated = () => {
      refresh();
      refreshRevision();
    };

    socket.on('task_updated', handleTaskUpdated);
    socket.on('task_created', handleTaskCreated);

    return () => {
      socket.off('task_updated', handleTaskUpdated);
      socket.off('task_created', handleTaskCreated);
    };
  }, [socket, refresh, refreshRevision]);

  const updateStatus = useCallback((id: number, status: TareaStatus) => {
    // Optimistic update — UI reacciona inmediatamente con fecha local provisional
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status, completedAt: status === 'Completada' ? new Date().toISOString() : null }
          : t,
      ),
    );
    setTasksLastModified(Date.now());
    // Persistir en DB y corregir completedAt con el valor real de la BD
    authFetch(`/tareas/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      if (data.fecha_finalizacion !== undefined) {
        setTasks((prev) =>
          prev.map((t) => t.id === id ? { ...t, completedAt: data.fecha_finalizacion ?? null } : t),
        );
      }
    }).catch(() => {/* fallo silencioso — UI ya refleja el cambio optimista */});
  }, []);

  const createTask = useCallback((data: NewTaskData): TaskWithMeta => {
    const newTask: TaskWithMeta = {
      id: nextTempId(),
      id_proyecto: data.id_proyecto,
      nombre_proyecto: data.nombre_proyecto,
      tarea_descripcion: data.tarea_descripcion,
      responsable_nombre: data.responsable_nombre,
      responsable_correo: data.responsable_correo,
      prioridad: data.prioridad,
      status: 'Pendiente',
      fecha_entrega: data.fecha_entrega,
      completedAt: null,
    };
    setTasks((prev) => [newTask, ...prev]);
    return newTask;
  }, []);

  return (
    <TaskStoreContext.Provider value={{
      tasks, loading, tasksLastModified, updateStatus, createTask, refresh,
      revisionTasks, revisionCount: revisionTasks.length, refreshRevision,
      newIngestedFiles, clearNewIngestedFiles,
    }}>
      {children}
    </TaskStoreContext.Provider>
  );
}

export function useTaskStore() {
  const ctx = useContext(TaskStoreContext);
  if (!ctx) throw new Error('useTaskStore must be used within TaskStoreProvider');
  return ctx;
}
