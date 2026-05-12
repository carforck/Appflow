import { useState, useCallback, useRef } from 'react';
import { useTaskStore, type RevisionTask } from '@/context/TaskStoreContext';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/api';
import type { TareaPrioridad } from '@/lib/mockData';

export type { RevisionTask };

export type RevisionChanges = {
  id_proyecto?: string;
  tarea_descripcion?: string;
  responsable_nombre?: string;
  responsable_correo?: string;
  prioridad?: TareaPrioridad;
  fecha_inicio?: string;
  fecha_entrega?: string;
};

export function useRevision() {
  const { revisionTasks, revisionCount, refreshRevision } = useTaskStore();
  const { addToast } = useToast();
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const approveAllRunning = useRef(false);
  const rejectAllRunning  = useRef(false);

  const approve = useCallback(async (task: RevisionTask): Promise<void> => {
    setApprovingId(task.id);
    try {
      const res = await authFetch(`/tareas/${task.id}/aprobar`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(`✅ Tarea aprobada y enviada al Kanban`, 'success');
      await refreshRevision();
    } catch (e) {
      addToast(`Error al aprobar: ${e instanceof Error ? e.message : 'Error'}`, 'error');
    } finally {
      setApprovingId(null);
    }
  }, [refreshRevision, addToast]);

  const update = useCallback(async (id: number, changes: RevisionChanges): Promise<boolean> => {
    try {
      const res = await authFetch(`/tareas/${id}/revision`, {
        method: 'PATCH',
        body:   JSON.stringify(changes),
      });
      if (!res.ok) return false;
      await refreshRevision();
      return true;
    } catch {
      return false;
    }
  }, [refreshRevision]);

  const reject = useCallback(async (task: RevisionTask): Promise<void> => {
    setRejectingId(task.id);
    try {
      const res = await authFetch(`/tareas/${task.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast('Tarea rechazada y eliminada', 'info');
      await refreshRevision();
    } catch (e) {
      addToast(`Error al rechazar: ${e instanceof Error ? e.message : 'Error'}`, 'error');
    } finally {
      setRejectingId(null);
    }
  }, [refreshRevision, addToast]);

  const approveAll = useCallback(async (): Promise<void> => {
    if (approveAllRunning.current) return;
    approveAllRunning.current = true;
    const tasks = [...revisionTasks];
    let count = 0;
    try {
      for (const t of tasks) {
        try {
          const res = await authFetch(`/tareas/${t.id}/aprobar`, { method: 'PATCH' });
          if (res.ok) count++;
        } catch { /* continúa */ }
      }
      await refreshRevision();
      addToast(`✅ ${count} tarea${count !== 1 ? 's' : ''} aprobada${count !== 1 ? 's' : ''} y enviadas al Kanban`, 'success');
    } finally {
      approveAllRunning.current = false;
    }
  }, [revisionTasks, refreshRevision, addToast]);

  const rejectAll = useCallback(async (): Promise<void> => {
    if (rejectAllRunning.current) return;
    rejectAllRunning.current = true;
    const snapshot = [...revisionTasks];
    let count = 0;
    try {
      for (const t of snapshot) {
        try {
          const res = await authFetch(`/tareas/${t.id}`, { method: 'DELETE' });
          if (res.ok) count++;
        } catch { /* continúa */ }
      }
      await refreshRevision();
      addToast(`${count} tarea${count !== 1 ? 's' : ''} eliminada${count !== 1 ? 's' : ''} de la matriz`, 'info');
    } finally {
      rejectAllRunning.current = false;
    }
  }, [revisionTasks, refreshRevision, addToast]);

  const addManualTask = useCallback(async (data: {
    id_proyecto?:       string;
    tarea_descripcion:  string;
    responsable_nombre?: string;
    responsable_correo?: string;
    prioridad?:          TareaPrioridad;
    fecha_inicio?:       string;
    fecha_entrega?:      string;
  }): Promise<boolean> => {
    try {
      const res = await authFetch('/tareas/revision', {
        method: 'POST',
        body:   JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        addToast(d.error ?? 'Error al crear tarea', 'error');
        return false;
      }
      await refreshRevision();
      addToast('✅ Tarea agregada a la matriz de revisión', 'success');
      return true;
    } catch {
      addToast('Error de conexión', 'error');
      return false;
    }
  }, [refreshRevision, addToast]);

  return {
    tasks:       revisionTasks,
    count:       revisionCount,
    approvingId,
    rejectingId,
    approve,
    update,
    reject,
    approveAll,
    rejectAll,
    addManualTask,
    refresh:     refreshRevision,
  };
}
