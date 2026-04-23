"use client";

import { useProcesador }  from '@/hooks/useProcesador';
import { InputStep }      from '@/components/procesador/InputStep';
import { ValidationStep } from '@/components/procesador/ValidationStep';

export default function ProcesadorPage() {
  const {
    users, stagedTasks, hasPending,
    step, texto, setTexto, mode, setMode,
    cargando, progressPhase, progressLabel,
    approvingId, approvingAll, approved,
    procesarMinuta, procesarTextoDirecto,
    approveOne, approveAll, discardOne, resetFlow,
    updateStagedTask, clearAll, addToast,
  } = useProcesador();

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-alzak-blue dark:text-white">Procesador de Minutas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {step === 'input'
              ? mode === 'archivo'
                ? 'Archivo cargado — listo para procesar con IA.'
                : mode === 'texto'
                  ? 'Texto detectado — carga directa sin IA.'
                  : 'Sube un archivo o pega texto para comenzar.'
              : `${stagedTasks.length} tarea${stagedTasks.length !== 1 ? 's' : ''} pendiente${stagedTasks.length !== 1 ? 's' : ''} · ${approved} aprobada${approved !== 1 ? 's' : ''}`}
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

      {/* Stepper */}
      <div className="flex items-center gap-2 text-xs">
        {(['input', 'validacion'] as const).map((s, i) => (
          <>
            {i > 0 && <div key={`sep-${i}`} className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />}
            <div
              key={s}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold transition-colors ${
                step === s ? 'bg-alzak-blue text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <span>{i + 1}</span>
              <span className="hidden sm:inline">
                {s === 'input'
                  ? 'Ingresar minuta'
                  : mode === 'archivo'
                    ? 'Validar tareas IA'
                    : 'Validar tareas'}
              </span>
              {s === 'validacion' && hasPending && step === 'validacion' && (
                <span className="w-4 h-4 bg-white/30 rounded-full text-[9px] font-bold flex items-center justify-center">
                  {stagedTasks.length}
                </span>
              )}
            </div>
          </>
        ))}
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold transition-colors ${
            approved > 0 && !hasPending ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}
        >
          <span>{approved > 0 && !hasPending ? '✓' : '3'}</span>
          <span className="hidden sm:inline">
            {approved > 0 && !hasPending ? `${approved} a Revisión` : 'A Revisión'}
          </span>
        </div>
      </div>

      {step === 'input' && (
        <InputStep
          texto={texto} setTexto={setTexto}
          mode={mode} setMode={setMode}
          cargando={cargando}
          progressPhase={progressPhase}
          progressLabel={progressLabel}
          onProcesar={mode === 'archivo' ? procesarMinuta : procesarTextoDirecto}
        />
      )}

      {step === 'validacion' && (
        <ValidationStep
          stagedTasks={stagedTasks} users={users} approved={approved}
          approvingAll={approvingAll} approvingId={approvingId}
          isDirectMode={mode === 'texto'}
          onUpdateTask={updateStagedTask}
          onApproveOne={approveOne}
          onDiscardOne={discardOne}
          onDiscardAll={() => { clearAll(); addToast('Todas las tareas descartadas', 'info'); }}
          onApproveAll={approveAll}
          onReset={resetFlow}
        />
      )}
    </div>
  );
}
