"use client";

import { useState, useEffect, useRef } from 'react';
import { useRevision }       from '@/hooks/useRevision';
import { useUsuarios }       from '@/hooks/useUsuarios';
import { useProjectStore }   from '@/context/ProjectStoreContext';
import { useAuth }           from '@/context/AuthContext';
import { useRouter }         from 'next/navigation';
import { useToast }          from '@/components/Toast';
import RevisionRow           from '@/components/revision/RevisionRow';
import { ApproveAllModal }   from '@/components/revision/ApproveAllModal';
import { AddRevisionTaskModal } from '@/components/revision/AddRevisionTaskModal';
import type { ProjectInfo }  from '@/components/revision/RevisionRow';

const TH = 'px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap';

export default function RevisionPage() {
  const { user }     = useAuth();
  const router       = useRouter();
  const { users }    = useUsuarios();
  const { projects } = useProjectStore();
  const { addToast } = useToast();
  const {
    tasks, count, approvingId, rejectingId,
    approve, reject, update, approveAll, rejectAll, addManualTask, refresh,
  } = useRevision();

  const [invalidIds,       setInvalidIds]       = useState<Set<number>>(new Set());
  const [scrollToId,       setScrollToId]       = useState<number | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveAllLoading, setApproveAllLoading] = useState(false);
  const [rejectAllStep,    setRejectAllStep]    = useState<'idle' | 'confirm' | 'loading'>('idle');
  const [showAddModal,     setShowAddModal]     = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Scroll automático a la primera fila con error tras render
  useEffect(() => {
    if (scrollToId === null || !tableRef.current) return;
    const row = tableRef.current.querySelector(`[data-row-id="${scrollToId}"]`);
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setScrollToId(null);
  }, [scrollToId]);

  useEffect(() => {
    if (user && user.role === 'user') router.replace('/tareas');
  }, [user, router]);

  if (!user || user.role === 'user') return null;

  // Mapa id_proyecto → info (cascada instantánea, sin llamada al servidor)
  const projectMap: Record<string, ProjectInfo> = {};
  for (const p of projects) {
    projectMap[p.id_proyecto] = {
      id_proyecto:     p.id_proyecto,
      nombre_proyecto: p.nombre_proyecto,
      estado:          p.estado,
      empresa:         (p as { empresa?: string }).empresa,
      financiador:     (p as { financiador?: string }).financiador,
    };
  }

  // Validación infalible: si hay UNA sola fila incompleta, no abre el modal
  const handleApproveAll = () => {
    const invalid = tasks.filter((t) => !t.id_proyecto || !t.responsable_correo);
    if (invalid.length > 0) {
      setInvalidIds(new Set(invalid.map((t) => t.id)));
      setScrollToId(invalid[0].id);
      addToast(
        `No se pudo procesar: ${invalid.length} fila${invalid.length > 1 ? 's' : ''} incompleta${invalid.length > 1 ? 's' : ''}`,
        'error',
      );
      return;
    }
    setInvalidIds(new Set());
    setShowApproveModal(true);
  };

  const handleConfirmApproveAll = async () => {
    setApproveAllLoading(true);
    await approveAll();
    setApproveAllLoading(false);
    setShowApproveModal(false);
  };

  const handleRejectAll = async () => {
    setRejectAllStep('loading');
    await rejectAll();
    setRejectAllStep('idle');
  };

  // Actualizar: limpia estados de error + re-fetch real desde servidor
  const handleRefresh = async () => {
    setInvalidIds(new Set());
    await refresh();
  };

  // Wrapper de onUpdate: limpia la fila del set de errores en cuanto el usuario
  // toca un campo obligatorio, sin esperar a que haga clic en "Aprobar Todo" de nuevo
  const makeUpdateHandler = (taskId: number, taskData: typeof tasks[0]) =>
    async (changes: Parameters<typeof update>[1]) => {
      if (
        invalidIds.has(taskId) &&
        (changes.id_proyecto || changes.responsable_correo)
      ) {
        const fixedProject    = changes.id_proyecto    ? true : !!taskData.id_proyecto;
        const fixedResponsable = changes.responsable_correo ? true : !!taskData.responsable_correo;
        if (fixedProject && fixedResponsable) {
          setInvalidIds((s) => { const n = new Set(s); n.delete(taskId); return n; });
        }
      }
      return update(taskId, changes);
    };

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-alzak-blue dark:text-white flex items-center gap-2">
            Matriz de Revisión
            {count > 0 && (
              <span className="min-w-[26px] h-6 px-1.5 rounded-full bg-violet-500 text-white text-xs font-bold inline-flex items-center justify-center">
                {count}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {count === 0
              ? 'Sin tareas pendientes.'
              : `${count} tarea${count !== 1 ? 's' : ''} pendientes — completa Proyecto y Responsable antes de aprobar.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRefresh}
            aria-label="Recargar y limpiar errores"
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
          >
            ↻ Actualizar
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-alzak-blue dark:text-alzak-gold border border-alzak-blue/30 dark:border-alzak-gold/30 hover:bg-alzak-blue/5 dark:hover:bg-alzak-gold/10 transition-colors"
          >
            ➕ Agregar tarea
          </button>
          {count > 0 && rejectAllStep === 'idle' && (
            <button
              onClick={() => setRejectAllStep('confirm')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              🗑 Eliminar todo ({count})
            </button>
          )}
          {rejectAllStep === 'confirm' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-400 bg-red-50 dark:bg-red-900/20">
              <span className="text-xs text-red-600 dark:text-red-300 font-semibold">¿Eliminar {count} tareas?</span>
              <button
                onClick={handleRejectAll}
                className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-lg transition-colors"
              >Sí</button>
              <button
                onClick={() => setRejectAllStep('idle')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-1"
              >No</button>
            </div>
          )}
          {rejectAllStep === 'loading' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20">
              <span className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-red-500">Eliminando...</span>
            </div>
          )}
          {count > 0 && (
            <button
              onClick={handleApproveAll}
              className="px-4 py-1.5 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
            >
              ✅ Aprobar todo ({count})
            </button>
          )}
        </div>
      </div>

      {/* ── Banner de error global ── */}
      {invalidIds.size > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-[14px] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          <span className="text-base shrink-0">⛔</span>
          <span className="flex-1">
            <strong>{invalidIds.size} fila{invalidIds.size > 1 ? 's' : ''}</strong> con{' '}
            <strong>Proyecto</strong> o <strong>Responsable</strong> sin asignar.
            Completa los campos resaltados en rojo y vuelve a intentarlo.
          </span>
          <button
            onClick={() => setInvalidIds(new Set())}
            aria-label="Cerrar aviso"
            className="shrink-0 text-red-400 hover:text-red-600 font-bold"
          >×</button>
        </div>
      )}

      {/* ── Aviso mobile ── */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-xs text-amber-700 dark:text-amber-300">
        <span>📐</span>
        <span>La Matriz de Revisión está optimizada para pantallas grandes. Gira el dispositivo o usa un ordenador para mejor experiencia.</span>
      </div>

      {/* ── Tabla Matriz ── */}
      {count > 0 ? (
        <div
          ref={tableRef}
          className="glass rounded-[20px] overflow-hidden"
          style={{ background: 'var(--sidebar-bg)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ tableLayout: 'auto' }}>
              <colgroup>
                <col style={{ width: 100 }} />  {/* ID Proyecto */}
                <col style={{ width: 120 }} />  {/* Nombre */}
                <col style={{ width: 90  }} />  {/* Empresa */}
                <col style={{ width: 90  }} />  {/* Financiador */}
                <col />                          {/* Tarea — toma el espacio restante */}
                <col style={{ width: 130 }} />  {/* Responsable */}
                <col style={{ width: 80  }} />  {/* Prioridad */}
                <col style={{ width: 110 }} />  {/* Fecha Inicio */}
                <col style={{ width: 110 }} />  {/* Fecha Fin */}
                <col style={{ width: 130 }} />  {/* Acciones */}
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/40">
                  <th className={TH}>ID Proyecto</th>
                  <th className={TH}>Nombre</th>
                  <th className={TH}>Empresa</th>
                  <th className={TH}>Financiador</th>
                  <th className={TH}>Tarea</th>
                  <th className={TH}>Responsable</th>
                  <th className={TH}>Prioridad</th>
                  <th className={TH}>Fecha Inicio</th>
                  <th className={TH}>Fecha Fin</th>
                  <th className={`${TH} text-right`}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <RevisionRow
                    key={task.id}
                    task={task}
                    users={users}
                    projects={projects as unknown as ProjectInfo[]}
                    projectMap={projectMap}
                    approving={approvingId === task.id}
                    rejecting={rejectingId === task.id}
                    isInvalid={invalidIds.has(task.id)}
                    onApprove={() => {
                      setInvalidIds((s) => { const n = new Set(s); n.delete(task.id); return n; });
                      approve(task);
                    }}
                    onReject={() => reject(task)}
                    onUpdate={makeUpdateHandler(task.id, task)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          className="glass rounded-[20px] p-12 text-center space-y-3"
          style={{ background: 'var(--sidebar-bg)' }}
        >
          <p className="text-4xl" aria-hidden>✅</p>
          <p className="text-base font-bold text-slate-800 dark:text-white">Todo al día</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Las minutas de Drive aparecerán aquí automáticamente.
          </p>
        </div>
      )}

      {/* ── Modal: Confirmación Aprobar Todo ── */}
      {showApproveModal && (
        <ApproveAllModal
          tasks={tasks}
          loading={approveAllLoading}
          onConfirm={handleConfirmApproveAll}
          onCancel={() => setShowApproveModal(false)}
        />
      )}

      {/* ── Modal: Agregar tarea manual ── */}
      {showAddModal && (
        <AddRevisionTaskModal
          users={users}
          projects={projects as unknown as ProjectInfo[]}
          projectMap={projectMap}
          onAdd={addManualTask}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
