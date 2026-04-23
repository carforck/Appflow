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
  ai_nota?:           string;
}

/** Contexto de la reunión que originó el staging — garantiza id_meeting siempre presente */
export interface MeetingContext {
  id_proyecto: string;
  resumen:     string;
  texto:       string;
}

interface StagingCtx {
  stagedTasks:       StagingTask[];
  hasPending:        boolean;
  /** ID del meeting creado al confirmar la primera aprobación (null hasta entonces) */
  pendingMeetingId:  number | null;
  meetingCtx:        MeetingContext | null;
  /** Clave única de sesión para idempotencia en commit-staging */
  sessionId:         string | null;
  addStagedTasks:    (tasks: Omit<StagingTask, 'stagingId'>[], ctx?: MeetingContext) => void;
  updateStagedTask:  (stagingId: string, updates: Partial<Omit<StagingTask, 'stagingId'>>) => void;
  removeTask:        (stagingId: string) => void;
  clearAll:          () => void;
  setPendingMeetingId: (id: number) => void;
}

// ── Contexto ───────────────────────────────────────────────────────────────────

const StagingContext = createContext<StagingCtx>({
  stagedTasks:         [],
  hasPending:          false,
  pendingMeetingId:    null,
  meetingCtx:          null,
  sessionId:           null,
  addStagedTasks:      () => {},
  updateStagedTask:    () => {},
  removeTask:          () => {},
  clearAll:            () => {},
  setPendingMeetingId: () => {},
});

export function StagingProvider({ children }: { children: ReactNode }) {
  const [stagedTasks,      setStagedTasks]      = useState<StagingTask[]>([]);
  const [pendingMeetingId, setPendingMeetingId_] = useState<number | null>(null);
  const [meetingCtx,       setMeetingCtx]        = useState<MeetingContext | null>(null);
  const [sessionId,        setSessionId]         = useState<string | null>(null);

  const hasPending = stagedTasks.length > 0;

  const addStagedTasks = useCallback(
    (tasks: Omit<StagingTask, 'stagingId'>[], ctx?: MeetingContext) => {
      const withIds = tasks.map((t) => ({
        ...t,
        stagingId: `staging-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      }));
      setStagedTasks((prev) => [...prev, ...withIds]);
      if (ctx) setMeetingCtx(ctx);
      // Nueva clave de sesión — garantiza idempotencia en commit-staging
      setSessionId(`session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    },
    [],
  );

  const updateStagedTask = useCallback(
    (stagingId: string, updates: Partial<Omit<StagingTask, 'stagingId'>>) => {
      setStagedTasks((prev) =>
        prev.map((t) => (t.stagingId === stagingId ? { ...t, ...updates } : t)),
      );
    },
    [],
  );

  const removeTask = useCallback(
    (stagingId: string) => setStagedTasks((prev) => prev.filter((t) => t.stagingId !== stagingId)),
    [],
  );

  const clearAll = useCallback(() => {
    setStagedTasks([]);
    setPendingMeetingId_(null);
    setMeetingCtx(null);
    setSessionId(null);
  }, []);

  const setPendingMeetingId = useCallback((id: number) => setPendingMeetingId_(id), []);

  return (
    <StagingContext.Provider
      value={{
        stagedTasks, hasPending, pendingMeetingId, meetingCtx, sessionId,
        addStagedTasks, updateStagedTask, removeTask, clearAll, setPendingMeetingId,
      }}
    >
      {children}
    </StagingContext.Provider>
  );
}

export const useStaging = () => useContext(StagingContext);
