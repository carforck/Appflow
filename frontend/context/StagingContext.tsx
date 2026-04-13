"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { TareaPrioridad, TareaStatus } from '@/lib/mockData';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface StagingTask {
  stagingId:          string;
  id_proyecto:        string;
  nombre_proyecto:    string;
  tarea_descripcion:  string;
  responsable_nombre: string;
  responsable_correo: string;
  prioridad:          TareaPrioridad;
  fecha_entrega:      string;
  status_inicial:     TareaStatus;
  // contexto IA — para mostrar en la vista de validación
  ai_nota?:           string;
}

interface StagingCtx {
  stagedTasks:      StagingTask[];
  hasPending:       boolean;
  addStagedTasks:   (tasks: Omit<StagingTask, 'stagingId'>[]) => void;
  updateStagedTask: (stagingId: string, updates: Partial<Omit<StagingTask, 'stagingId'>>) => void;
  removeTask:       (stagingId: string) => void;
  clearAll:         () => void;
}

// ── Contexto ───────────────────────────────────────────────────────────────────

const StagingContext = createContext<StagingCtx>({
  stagedTasks:      [],
  hasPending:       false,
  addStagedTasks:   () => {},
  updateStagedTask: () => {},
  removeTask:       () => {},
  clearAll:         () => {},
});

export function StagingProvider({ children }: { children: ReactNode }) {
  const [stagedTasks, setStagedTasks] = useState<StagingTask[]>([]);

  const hasPending = stagedTasks.length > 0;

  const addStagedTasks = useCallback((tasks: Omit<StagingTask, 'stagingId'>[]) => {
    const withIds = tasks.map((t) => ({
      ...t,
      stagingId: `staging-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    }));
    setStagedTasks((prev) => [...prev, ...withIds]);
  }, []);

  const updateStagedTask = useCallback(
    (stagingId: string, updates: Partial<Omit<StagingTask, 'stagingId'>>) => {
      setStagedTasks((prev) =>
        prev.map((t) => (t.stagingId === stagingId ? { ...t, ...updates } : t)),
      );
    },
    [],
  );

  const removeTask = useCallback((stagingId: string) => {
    setStagedTasks((prev) => prev.filter((t) => t.stagingId !== stagingId));
  }, []);

  const clearAll = useCallback(() => setStagedTasks([]), []);

  return (
    <StagingContext.Provider
      value={{ stagedTasks, hasPending, addStagedTasks, updateStagedTask, removeTask, clearAll }}
    >
      {children}
    </StagingContext.Provider>
  );
}

export const useStaging = () => useContext(StagingContext);
