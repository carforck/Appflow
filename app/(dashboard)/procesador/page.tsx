"use client";

import { useState } from 'react';
import { useStaging, StagingTask } from '@/context/StagingContext';
import { useTaskStore } from '@/context/TaskStoreContext';
import { useNotifications } from '@/context/NotificationContext';
import { useToast } from '@/components/Toast';
import { useProjectStore } from '@/context/ProjectStoreContext';
import { MOCK_USERS } from '@/lib/mockData';
import type { TareaPrioridad, TareaStatus, MockProject } from '@/lib/mockData';

// ── Helpers ────────────────────────────────────────────────────────────────────

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function mockAIExtract(
  texto: string,
  responsableNombre: string,
  responsableCorreo: string,
  projects: MockProject[],
): Omit<StagingTask, 'stagingId'>[] {
  const lower = texto.toLowerCase();

  // Detectar proyecto por ID o nombre
  const proj =
    projects.find((p) => lower.includes(p.id_proyecto.toLowerCase())) ??
    projects.find((p) => p.nombre && lower.includes(p.nombre.split('—')[0].trim().toLowerCase())) ??
    projects.find((p) => p.status === 'activo') ??
    projects[0];

  const isUrgent = /urgente|inmediato|hoy|asap|crítico/i.test(texto);
  const defaultPrio: TareaPrioridad = isUrgent ? 'Alta' : 'Media';

  const base = {
    id_proyecto:        proj.id_proyecto,
    nombre_proyecto:    proj.nombre,
    responsable_nombre: responsableNombre || 'Por asignar',
    responsable_correo: responsableCorreo || '',
    status_inicial:     'Pendiente' as TareaStatus,
  };

  const tasks: Omit<StagingTask, 'stagingId'>[] = [];

  if (/informe|reporte|resumen|entregable/i.test(texto)) {
    tasks.push({
      ...base,
      tarea_descripcion: 'Preparar informe de avance del estudio clínico',
      prioridad:    defaultPrio,
      fecha_entrega: addDays(7),
      ai_nota: 'Detectado: solicitud de informe / reporte en el texto',
    });
  }
  if (/paciente|visita|seguimiento|monitoreo|consulta/i.test(texto)) {
    tasks.push({
      ...base,
      tarea_descripcion: 'Realizar seguimiento y visita de pacientes del estudio',
      prioridad:    isUrgent ? 'Alta' : 'Media',
      fecha_entrega: addDays(5),
      ai_nota: 'Detectado: actividades de seguimiento/visita a pacientes',
    });
  }
  if (/consentimiento|firma|documento|formato|crf/i.test(texto)) {
    tasks.push({
      ...base,
      tarea_descripcion: 'Gestionar y verificar formularios de consentimiento informado',
      prioridad:    'Alta',
      fecha_entrega: addDays(3),
      ai_nota: 'Detectado: gestión de documentos / consentimientos',
    });
  }
  if (/base de datos|datos|registros|sistema|ctms/i.test(texto)) {
    tasks.push({
      ...base,
      tarea_descripcion: 'Actualizar y validar registros en la base de datos del estudio',
      prioridad:    'Media',
      fecha_entrega: addDays(10),
      ai_nota: 'Detectado: actualización de base de datos / registros',
    });
  }
  if (/reunión|meeting|coordinación|comité|junta/i.test(texto)) {
    tasks.push({
      ...base,
      tarea_descripcion: 'Preparar agenda y documentación para la próxima reunión de coordinación',
      prioridad:    'Baja',
      fecha_entrega: addDays(14),
      ai_nota: 'Detectado: preparación de reunión / comité',
    });
  }
  if (/farmacia|medicamento|muestra|dosis|dispensación/i.test(texto)) {
    tasks.push({
      ...base,
      tarea_descripcion: 'Coordinar entrega y control de medicamentos del estudio',
      prioridad:    'Alta',
      fecha_entrega: addDays(4),
      ai_nota: 'Detectado: gestión de farmacia / medicamentos',
    });
  }
  if (/protocolo|enmienda|aprobación|ética|irb/i.test(texto)) {
    tasks.push({
      ...base,
      tarea_descripcion: 'Revisar y gestionar actualización del protocolo con comité de ética',
      prioridad:    'Alta',
      fecha_entrega: addDays(10),
      ai_nota: 'Detectado: proceso regulatorio / protocolo / ética',
    });
  }

  // Asegurar mínimo 2 tareas
  if (tasks.length === 0) {
    tasks.push({
      ...base,
      tarea_descripcion: 'Revisar y validar documentación del protocolo de investigación',
      prioridad:    defaultPrio,
      fecha_entrega: addDays(7),
      ai_nota: 'Tarea genérica generada — ajusta según el contexto',
    });
    tasks.push({
      ...base,
      tarea_descripcion: 'Coordinar actividades y cronograma del equipo de investigación',
      prioridad:    'Baja',
      fecha_entrega: addDays(14),
      ai_nota: 'Tarea genérica generada — ajusta según el contexto',
    });
  } else if (tasks.length === 1) {
    tasks.push({
      ...base,
      tarea_descripcion: 'Revisar documentación y cumplimiento del protocolo clínico',
      prioridad:    'Baja',
      fecha_entrega: addDays(10),
      ai_nota: 'Tarea complementaria generada por IA',
    });
  }

  return tasks.slice(0, 5);
}

// ── Constantes UI ──────────────────────────────────────────────────────────────

const PRIORIDADES: TareaPrioridad[] = ['Alta', 'Media', 'Baja'];
const PRIO_COLOR: Record<TareaPrioridad, string> = {
  Alta:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 ring-red-400',
  Media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-amber-400',
  Baja:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 ring-green-400',
};
const STATUSES: TareaStatus[] = ['Pendiente', 'En Proceso', 'Completada'];

// ── Componente inline: editor de una tarea staged ─────────────────────────────
function StagedTaskCard({
  task,
  onUpdate,
  onApprove,
  onDiscard,
  approving,
}: {
  task: StagingTask;
  onUpdate: (updates: Partial<Omit<StagingTask, 'stagingId'>>) => void;
  onApprove: () => void;
  onDiscard: () => void;
  approving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDrop, setShowUserDrop] = useState(false);

  const filteredUsers = MOCK_USERS.filter(
    (u) =>
      u.activo &&
      (u.nombre_completo.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.correo.toLowerCase().includes(userSearch.toLowerCase())),
  ).slice(0, 5);

  return (
    <div className="glass rounded-[18px] border border-slate-200/60 dark:border-slate-700/60 overflow-hidden" style={{ background: 'var(--sidebar-bg)' }}>
      {/* ── Cabecera de la tarjeta ── */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Icono IA */}
        <div className="w-8 h-8 shrink-0 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-sm mt-0.5">
          🤖
        </div>

        <div className="flex-1 min-w-0">
          {/* Descripción editable */}
          <textarea
            value={task.tarea_descripcion}
            onChange={(e) => onUpdate({ tarea_descripcion: e.target.value })}
            rows={2}
            className="w-full text-sm font-medium text-slate-800 dark:text-white bg-transparent border-0 outline-none resize-none focus:ring-1 focus:ring-alzak-blue/30 rounded-lg px-1 -mx-1 py-0.5"
          />
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-[10px] text-alzak-blue dark:text-alzak-gold bg-alzak-blue/10 dark:bg-alzak-gold/10 px-2 py-0.5 rounded-md">
              {task.id_proyecto}
            </span>
            {task.ai_nota && (
              <span className="text-[10px] text-slate-400 truncate max-w-[200px]" title={task.ai_nota}>
                💡 {task.ai_nota}
              </span>
            )}
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Editar detalles"
          >
            ✏️
          </button>
          <button
            onClick={onDiscard}
            className="text-[10px] text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Descartar"
          >
            ✕
          </button>
          <button
            onClick={onApprove}
            disabled={approving}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-alzak-blue text-white hover:bg-alzak-blue/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {approving ? '...' : 'Aprobar'}
          </button>
        </div>
      </div>

      {/* ── Panel expandible: edición completa ── */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700/40 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-800/30">

          {/* Responsable */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Responsable
            </label>
            {task.responsable_nombre && task.responsable_nombre !== 'Por asignar' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-alzak-blue/30 bg-alzak-blue/5 dark:bg-alzak-blue/10">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 flex-1 truncate">{task.responsable_nombre}</span>
                <button
                  type="button"
                  onClick={() => { onUpdate({ responsable_nombre: 'Por asignar', responsable_correo: '' }); setUserSearch(''); }}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >×</button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setShowUserDrop(true); }}
                  onFocus={() => setShowUserDrop(true)}
                  placeholder="Buscar usuario..."
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
                />
                {showUserDrop && userSearch.length > 0 && filteredUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.correo}
                        type="button"
                        onMouseDown={() => {
                          onUpdate({ responsable_nombre: u.nombre_completo, responsable_correo: u.correo });
                          setUserSearch('');
                          setShowUserDrop(false);
                        }}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                      >
                        <span className="text-xs font-medium text-slate-700 dark:text-white">{u.nombre_completo}</span>
                        <span className="text-[10px] text-slate-400 ml-auto">{u.correo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fecha de entrega */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Fecha entrega
            </label>
            <input
              type="date"
              value={task.fecha_entrega}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => onUpdate({ fecha_entrega: e.target.value })}
              className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
            />
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Prioridad
            </label>
            <div className="flex gap-1.5">
              {PRIORIDADES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onUpdate({ prioridad: p })}
                  className={`flex-1 py-1 rounded-xl text-[10px] font-bold transition-all border ${
                    task.prioridad === p
                      ? `${PRIO_COLOR[p]} ring-1 border-transparent`
                      : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Estado inicial */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Estado inicial
            </label>
            <div className="flex gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onUpdate({ status_inicial: s })}
                  className={`flex-1 py-1 rounded-xl text-[10px] font-semibold transition-all border ${
                    task.status_inicial === s
                      ? 'bg-alzak-blue text-white border-transparent'
                      : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {s === 'Pendiente' ? '⚪' : s === 'En Proceso' ? '🔵' : '🟢'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function ProcesadorPage() {
  const { projects }       = useProjectStore();
  const { stagedTasks, addStagedTasks, updateStagedTask, removeTask, clearAll, hasPending } = useStaging();
  const { createTask }     = useTaskStore();
  const { addNotification } = useNotifications();
  const { addToast }       = useToast();

  const [step,        setStep]        = useState<'input' | 'validacion'>('input');
  const [texto,       setTexto]       = useState('');
  const [responsable, setResponsable] = useState('');
  const [cargando,    setCargando]    = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approved,    setApproved]    = useState(0);

  const selectedUser = MOCK_USERS.find((u) => u.nombre_completo === responsable);

  // ── Procesar (mock AI) ─────────────────────────────────────────────────────
  const procesarMinuta = async () => {
    if (!texto.trim()) { addToast('Pega algún texto de minuta primero', 'warning'); return; }
    setCargando(true);
    // Simular delay IA
    await new Promise((r) => setTimeout(r, 1400));
    const tasks = mockAIExtract(
      texto,
      selectedUser?.nombre_completo ?? '',
      selectedUser?.correo ?? '',
      projects,
    );
    clearAll();
    addStagedTasks(tasks);
    setApproved(0);
    setStep('validacion');
    setCargando(false);
  };

  // ── Aprobar una tarea ──────────────────────────────────────────────────────
  const approveOne = (task: StagingTask) => {
    setApprovingId(task.stagingId);
    setTimeout(() => {
      createTask({
        id_proyecto:        task.id_proyecto,
        nombre_proyecto:    task.nombre_proyecto,
        tarea_descripcion:  task.tarea_descripcion,
        responsable_nombre: task.responsable_nombre,
        responsable_correo: task.responsable_correo,
        prioridad:          task.prioridad,
        fecha_inicio:       new Date().toISOString().split('T')[0],
        fecha_entrega:      task.fecha_entrega,
      });

      if (task.responsable_nombre && task.responsable_nombre !== 'Por asignar') {
        addNotification({
          tipo:    'asignacion',
          titulo:  'Nueva tarea asignada',
          mensaje: `Se asignó "${task.tarea_descripcion.slice(0, 55)}..." a ${task.responsable_nombre}`,
        });
        addToast(`✅ Tarea aprobada y asignada a ${task.responsable_nombre}`, 'success');
      } else {
        addToast('✅ Tarea aprobada y añadida al tablero', 'success');
      }

      removeTask(task.stagingId);
      setApproved((n) => n + 1);
      setApprovingId(null);
    }, 350);
  };

  // ── Aprobar todas ──────────────────────────────────────────────────────────
  const approveAll = () => {
    const pending = [...stagedTasks];
    pending.forEach((t) => approveOne(t));
    addToast(`✅ ${pending.length} tareas aprobadas y enviadas al tablero`, 'success');
  };

  // ── Descartar una ─────────────────────────────────────────────────────────
  const discardOne = (stagingId: string) => {
    removeTask(stagingId);
    addToast('Tarea descartada', 'info');
  };

  // ── Reiniciar ──────────────────────────────────────────────────────────────
  const resetFlow = () => {
    clearAll();
    setStep('input');
    setTexto('');
    setResponsable('');
    setApproved(0);
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-alzak-blue dark:text-white">Procesador de Minutas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {step === 'input'
              ? 'Pega el texto de la reunión y deja que la IA organice el trabajo.'
              : `${stagedTasks.length} tarea${stagedTasks.length !== 1 ? 's' : ''} pendiente${stagedTasks.length !== 1 ? 's' : ''} de validación · ${approved} aprobada${approved !== 1 ? 's' : ''}`}
          </p>
        </div>
        {step === 'validacion' && (
          <button
            onClick={resetFlow}
            className="shrink-0 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 transition-colors"
          >
            ← Nueva minuta
          </button>
        )}
      </div>

      {/* ── Stepper ── */}
      <div className="flex items-center gap-2 text-xs">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold transition-colors ${
          step === 'input'
            ? 'bg-alzak-blue text-white'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
        }`}>
          <span>1</span><span className="hidden sm:inline">Ingresar minuta</span>
        </div>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold transition-colors ${
          step === 'validacion'
            ? 'bg-alzak-blue text-white'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
        }`}>
          <span>2</span><span className="hidden sm:inline">Validar tareas IA</span>
          {hasPending && step === 'validacion' && (
            <span className="w-4 h-4 bg-white/30 rounded-full text-[9px] font-bold flex items-center justify-center">
              {stagedTasks.length}
            </span>
          )}
        </div>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold transition-colors ${
          approved > 0 && !hasPending
            ? 'bg-emerald-500 text-white'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
        }`}>
          <span>{approved > 0 && !hasPending ? '✓' : '3'}</span>
          <span className="hidden sm:inline">{approved > 0 && !hasPending ? `${approved} al Kanban` : 'Al tablero'}</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          STEP 1 — Input
      ══════════════════════════════════════════════════════════════════ */}
      {step === 'input' && (
        <>
          <div className="glass rounded-[20px] p-5 sm:p-6 space-y-4">

            {/* Selector responsable */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                Responsable principal <span className="normal-case font-normal text-slate-400">(opcional — ayuda a la IA)</span>
              </label>
              <select
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="w-full px-4 py-2.5 rounded-[14px] bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-alzak-blue dark:focus:ring-alzak-gold transition-all text-sm appearance-none"
              >
                <option value="">— Sin pre-selección —</option>
                {MOCK_USERS.filter((u) => u.activo).map((u) => (
                  <option key={u.correo} value={u.nombre_completo}>
                    {u.nombre_completo}
                  </option>
                ))}
              </select>
            </div>

            {/* Área de texto */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                Texto de la minuta
              </label>
              <textarea
                className="w-full h-48 sm:h-56 p-4 rounded-[14px] bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue dark:focus:ring-alzak-gold resize-none transition-all text-sm"
                placeholder="Ej: Hoy nos reunimos por el proyecto 5024 con Bayer. Lina se encarga del informe para el próximo lunes, prioridad alta. También hay que revisar los consentimientos..."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-1 text-right">{texto.length} caracteres</p>
            </div>

            <button
              onClick={procesarMinuta}
              disabled={cargando}
              className={`w-full py-3.5 rounded-[14px] font-bold text-sm shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                cargando
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark hover:opacity-90'
              }`}
            >
              {cargando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Procesando con IA...
                </>
              ) : (
                '✨ Procesar con IA'
              )}
            </button>
          </div>

          {/* Tips */}
          <div className="glass rounded-[20px] p-5">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              Tips para mejores resultados
            </p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex gap-2.5"><span>📌</span>Menciona el número de proyecto (ej: &ldquo;proyecto 5024&rdquo;).</li>
              <li className="flex gap-2.5"><span>👤</span>Usa nombres completos del equipo para asignar tareas correctamente.</li>
              <li className="flex gap-2.5"><span>📅</span>Menciona fechas claras (&ldquo;próximo lunes&rdquo;, &ldquo;15 de mayo&rdquo;).</li>
              <li className="flex gap-2.5"><span>⚡</span>Indica prioridades: &ldquo;urgente&rdquo; → Alta, &ldquo;cuando pueda&rdquo; → Baja.</li>
              <li className="flex gap-2.5"><span>🔍</span>Palabras clave: informe, visita, consentimiento, base de datos, farmacia, protocolo.</li>
            </ul>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 2 — Vista de Validación
      ══════════════════════════════════════════════════════════════════ */}
      {step === 'validacion' && (
        <>
          {/* Banner de contexto */}
          <div className="glass rounded-[16px] border border-violet-200/60 dark:border-violet-700/40 p-4 flex items-start gap-3" style={{ background: 'var(--sidebar-bg)' }}>
            <span className="text-2xl shrink-0">🤖</span>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                La IA extrajo {stagedTasks.length + approved} tarea{stagedTasks.length + approved !== 1 ? 's' : ''} de la minuta
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Revisa cada tarea antes de aprobarla. Puedes editar descripción, responsable, prioridad y fecha.
                Las tareas aprobadas llegan directamente al Kanban y se notifica al responsable.
              </p>
            </div>
          </div>

          {/* Barra de acciones globales */}
          {stagedTasks.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {stagedTasks.length} tarea{stagedTasks.length !== 1 ? 's' : ''} pendiente{stagedTasks.length !== 1 ? 's' : ''} de revisión
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { clearAll(); addToast('Todas las tareas descartadas', 'info'); }}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-semibold text-red-500 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Descartar todo
                </button>
                <button
                  onClick={approveAll}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-md"
                >
                  <span>✅</span>
                  <span>Aprobar todo ({stagedTasks.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Lista de tarjetas staged */}
          {stagedTasks.length > 0 ? (
            <div className="space-y-3">
              {stagedTasks.map((task) => (
                <StagedTaskCard
                  key={task.stagingId}
                  task={task}
                  onUpdate={(updates) => updateStagedTask(task.stagingId, updates)}
                  onApprove={() => approveOne(task)}
                  onDiscard={() => discardOne(task.stagingId)}
                  approving={approvingId === task.stagingId}
                />
              ))}
            </div>
          ) : (
            /* Estado vacío — todo aprobado o descartado */
            <div className="glass rounded-[20px] p-10 text-center space-y-3" style={{ background: 'var(--sidebar-bg)' }}>
              {approved > 0 ? (
                <>
                  <p className="text-4xl">🎉</p>
                  <p className="text-base font-bold text-slate-800 dark:text-white">
                    ¡{approved} tarea{approved !== 1 ? 's' : ''} enviada{approved !== 1 ? 's' : ''} al tablero!
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Los investigadores ya fueron notificados. Ve al Kanban para hacer seguimiento.
                  </p>
                  <button
                    onClick={resetFlow}
                    className="mt-2 px-5 py-2.5 rounded-[12px] bg-alzak-blue text-white text-sm font-bold hover:bg-alzak-blue/90 transition-colors shadow-md"
                  >
                    Procesar otra minuta
                  </button>
                </>
              ) : (
                <>
                  <p className="text-4xl">🗑️</p>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Todas las tareas fueron descartadas
                  </p>
                  <button
                    onClick={resetFlow}
                    className="mt-2 px-5 py-2.5 rounded-[12px] bg-alzak-blue text-white text-sm font-bold hover:bg-alzak-blue/90 transition-colors shadow-md"
                  >
                    Procesar otra minuta
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
