"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStaging, StagingTask } from '@/context/StagingContext';
import { useTaskStore }     from '@/context/TaskStoreContext';
import { useNotifications } from '@/context/NotificationContext';
import { useToast }         from '@/components/Toast';
import { useUsuarios }      from '@/hooks/useUsuarios';
import { useProjectStore }  from '@/context/ProjectStoreContext';
import { authFetch }        from '@/lib/api';
import { parseTextToTasks } from '@/lib/textParser';
import { prepareTasksForRevision, DEFAULT_PROJECT_ID } from '@/lib/prepareTasksForRevision';
import type { TareaPrioridad, TareaStatus } from '@/lib/mockData';

export type ProcessorStep = 'input' | 'validacion';
export type ProcessorMode = 'texto' | 'archivo' | null;

const AI_PHASES = [
  { label: 'Analizando documento...', pct: 20 },
  { label: 'Extrayendo tareas con IA...', pct: 55 },
  { label: 'Sincronizando con base de datos...', pct: 85 },
] as const;

const TEXT_PHASES = [
  { label: 'Estructurando jerarquías...', pct: 30 },
  { label: 'Vinculando con base de datos...', pct: 70 },
  { label: 'Preparando tareas...', pct: 90 },
] as const;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useProcesador() {
  const router = useRouter();
  const { users }     = useUsuarios();
  const { projects }  = useProjectStore();
  const {
    stagedTasks, addStagedTasks, updateStagedTask, removeTask, clearAll, hasPending,
    pendingMeetingId, setPendingMeetingId, meetingCtx, sessionId,
  } = useStaging();
  const { refreshRevision }       = useTaskStore();
  const { refresh: refreshNotif } = useNotifications();
  const { addToast }              = useToast();

  const [step,          setStep]          = useState<ProcessorStep>('input');
  const [texto,         setTexto]         = useState('');
  const [mode,          setMode]          = useState<ProcessorMode>(null);
  const [cargando,      setCargando]      = useState(false);
  const [progressPhase, setProgressPhase] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [approvingId,   setApprovingId]   = useState<string | null>(null);
  const [approvingAll,  setApprovingAll]  = useState(false);
  const [approved,      setApproved]      = useState(0);

  // ── Modo Texto Directo — parser semántico, sin IA ────────────────────────────
  const procesarTextoDirecto = async () => {
    if (!texto.trim()) { addToast('Pega algún texto primero', 'warning'); return; }

    setCargando(true);
    try {
      for (const phase of TEXT_PHASES) {
        setProgressPhase(phase.pct);
        setProgressLabel(phase.label);
        await delay(380);
      }

      const tasks = parseTextToTasks(texto, users, projects);

      if (tasks.length === 0) {
        addToast('No se detectaron tareas. Revisa el formato del texto.', 'warning');
        return;
      }

      clearAll();
      addStagedTasks(tasks, { id_proyecto: '', resumen: 'Texto directo', texto });
      setProgressPhase(100);
      setProgressLabel(`${tasks.length} tareas estructuradas`);
      setApproved(0);
      setTimeout(() => setStep('validacion'), 400);
    } catch (e) {
      addToast(`Error al estructurar texto: ${e instanceof Error ? e.message : 'Error desconocido'}`, 'error');
    } finally {
      setCargando(false);
      setProgressPhase(0);
      setProgressLabel('');
    }
  };

  // ── Modo Archivo — con IA ────────────────────────────────────────────────────
  const procesarMinuta = async () => {
    if (!texto.trim()) { addToast('Sube un archivo primero', 'warning'); return; }
    setCargando(true);
    setProgressPhase(0);
    setProgressLabel('Iniciando...');

    let phaseIdx = 0;
    const nextPhase = () => {
      if (phaseIdx < AI_PHASES.length) {
        const p = AI_PHASES[phaseIdx++];
        setProgressPhase(p.pct);
        setProgressLabel(p.label);
      }
    };
    nextPhase();
    const interval = setInterval(nextPhase, 1800);

    let didSucceed = false;
    try {
      const res = await authFetch('/procesar-reunion', {
        method: 'POST',
        body: JSON.stringify({ texto, responsable_sugerido: '', preview: true }),
      });
      clearInterval(interval);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setProgressPhase(95);
      setProgressLabel('Preparando tareas...');

      const data = await res.json() as {
        tareas?: Array<{
          id_proyecto: string; nombre_proyecto: string; tarea_descripcion: string;
          responsable_nombre: string; responsable_correo: string;
          prioridad: TareaPrioridad; fecha_entrega: string;
          status_inicial: TareaStatus; ai_nota?: string;
        }>;
        proyecto?: string; resumen?: string;
      };

      const tasks: Omit<StagingTask, 'stagingId'>[] = (data.tareas ?? []).map((t) => ({
        id_proyecto: t.id_proyecto, nombre_proyecto: t.nombre_proyecto,
        tarea_descripcion: t.tarea_descripcion, responsable_nombre: t.responsable_nombre,
        responsable_correo: t.responsable_correo, prioridad: t.prioridad,
        fecha_entrega: t.fecha_entrega, status_inicial: 'Pendiente' as TareaStatus,
        ai_nota: t.ai_nota,
      }));

      clearAll();
      addStagedTasks(tasks, { id_proyecto: data.proyecto ?? '', resumen: data.resumen ?? '', texto });
      setProgressPhase(100);
      setProgressLabel('¡Listo!');
      setApproved(0);
      didSucceed = true;
      setTimeout(() => setStep('validacion'), 400);
    } catch (e) {
      clearInterval(interval);
      addToast(`Error al procesar con IA: ${e instanceof Error ? e.message : 'Error desconocido'}`, 'error');
    } finally {
      setCargando(false);
      if (!didSucceed) { setProgressPhase(0); setProgressLabel(''); }
    }
  };

  // ── Acciones comunes ─────────────────────────────────────────────────────────
  const approveOne = async (task: StagingTask) => {
    setApprovingId(task.stagingId);
    try {
      const ctx = meetingCtx;
      const [prepared] = prepareTasksForRevision([task]);
      const res = await authFetch('/tareas/commit-staging', {
        method: 'POST',
        body: JSON.stringify({
          id_proyecto: ctx?.id_proyecto || prepared.id_proyecto,
          resumen: ctx?.resumen ?? '', texto: ctx?.texto ?? '',
          session_key: sessionId ? `${sessionId}-${task.stagingId}` : undefined,
          tareas: [prepared],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { meetingId?: number };
      if (data.meetingId && !pendingMeetingId) setPendingMeetingId(data.meetingId);
      await refreshRevision();
      removeTask(task.stagingId);
      setApproved((n) => n + 1);
      addToast('✅ Tarea guardada en Revisión', 'success');
    } catch (e) {
      addToast(`Error al guardar tarea: ${e instanceof Error ? e.message : 'Error'}`, 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const approveAll = async () => {
    if (approvingAll) return;
    const pending = [...stagedTasks];
    if (pending.length === 0) return;
    setApprovingAll(true);
    const ctx = meetingCtx;
    try {
      const prepared = prepareTasksForRevision(pending);
      const res = await authFetch('/tareas/commit-staging', {
        method: 'POST',
        body: JSON.stringify({
          id_proyecto: ctx?.id_proyecto || DEFAULT_PROJECT_ID,
          resumen: ctx?.resumen ?? '', texto: ctx?.texto ?? '',
          session_key: sessionId ?? undefined,
          tareas: prepared,  // cada tarea trae su propio id_proyecto ya saneado
        }),
      });
      if (!res.ok) {
        if (res.status === 409) { addToast('Esta sesión ya fue enviada a Revisión', 'warning'); return; }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json() as { tareas_creadas?: number };
      const count = data.tareas_creadas ?? 0;
      clearAll();
      await Promise.all([refreshRevision(), refreshNotif()]);
      setApproved((n) => n + count);
      addToast(`✅ ${count} tarea${count !== 1 ? 's' : ''} enviadas a la Matriz de Revisión`, 'success');
      setTimeout(() => router.push('/revision'), 1200);
    } catch (e) {
      addToast(`Error al aprobar: ${e instanceof Error ? e.message : 'Error'}`, 'error');
    } finally {
      setApprovingAll(false);
    }
  };

  const discardOne = (stagingId: string) => { removeTask(stagingId); addToast('Tarea descartada', 'info'); };

  const resetFlow = () => {
    clearAll();
    setStep('input');
    setTexto('');
    setMode(null);
    setApproved(0);
    setProgressPhase(0);
    setProgressLabel('');
  };

  return {
    users, stagedTasks, hasPending,
    step, texto, setTexto, mode, setMode,
    cargando, progressPhase, progressLabel,
    approvingId, approvingAll, approved,
    procesarMinuta, procesarTextoDirecto,
    approveOne, approveAll, discardOne, resetFlow,
    updateStagedTask, clearAll, addToast,
  };
}
