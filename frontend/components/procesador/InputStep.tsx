"use client";

import { useState, useRef, useCallback, useEffect, DragEvent } from 'react';
import { useToast }          from '@/components/Toast';
import { uploadFileForText } from '@/lib/api';
import type { ProcessorMode } from '@/hooks/useProcesador';

interface InputStepProps {
  texto:         string;
  setTexto:      (t: string) => void;
  mode:          ProcessorMode;
  setMode:       (m: ProcessorMode) => void;
  cargando:      boolean;
  progressPhase: number;
  progressLabel: string;
  onProcesar:    () => void;
}

export function InputStep({
  texto, setTexto, mode, setMode, cargando, progressPhase, progressLabel, onProcesar,
}: InputStepProps) {
  const { addToast }   = useToast();
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const [dragging,     setDragging]     = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  // ── Auto-expand textarea ─────────────────────────────────────────────────────
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 480)}px`;
  }, []);

  useEffect(() => { adjustHeight(); }, [texto, adjustHeight]);

  // ── File handling ────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext ?? '')) {
      addToast('Solo se permiten archivos PDF o DOCX', 'warning');
      return;
    }
    setUploading(true);
    setUploadedFile(null);
    try {
      const textoExtraido = await uploadFileForText(file);
      setTexto(textoExtraido);
      setUploadedFile(file.name);
      setMode('archivo');
      addToast(`Texto extraído de "${file.name}" (${textoExtraido.length.toLocaleString()} caracteres)`, 'success');
    } catch (e) {
      addToast(`Error al leer el archivo: ${e instanceof Error ? e.message : 'Error desconocido'}`, 'error');
    } finally {
      setUploading(false);
    }
  }, [addToast, setTexto, setMode]);

  const onDrop      = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);
  const onDragOver  = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(true);  }, []);
  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(false); }, []);

  const hasText       = texto.trim().length > 0;
  const isArchivoMode = mode === 'archivo';
  const isTextoMode   = mode === 'texto';

  return (
    <>
      <div className="glass rounded-[20px] p-5 sm:p-6 space-y-5">

        {/* ── Callout contextual ── */}
        {isArchivoMode && (
          <div className="flex gap-3 p-4 rounded-[14px] bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40">
            <span className="text-xl shrink-0">🤖</span>
            <div>
              <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Modo Archivo — Procesamiento con IA</p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-0.5">
                La IA analiza el documento, identifica tareas, responsables, proyectos y fechas, y te presenta un borrador para revisar antes de guardar.
              </p>
            </div>
          </div>
        )}
        {isTextoMode && (
          <div className="flex gap-3 p-4 rounded-[14px] bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
            <span className="text-xl shrink-0">⚡</span>
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Modo Texto Directo — Sin IA</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-300 mt-0.5">
                Cada línea se convierte directamente en una tarea. Sin IA, carga instantánea. Podrás asignar responsable, fecha y prioridad en el siguiente paso.
              </p>
            </div>
          </div>
        )}
        {!mode && (
          <div className="flex gap-3 p-4 rounded-[14px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-xl shrink-0">💡</span>
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Dos formas de procesar</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <strong>Archivo PDF/DOCX</strong> → la IA extrae tareas del documento automáticamente.<br />
                <strong>Texto directo</strong> → pega una tarea por línea y se carga sin IA, al instante.
              </p>
            </div>
          </div>
        )}

        {/* ── Zona Drag & Drop ── */}
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Subir archivo <span className="normal-case font-normal text-slate-400">(PDF o DOCX) — activa modo IA</span>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            aria-label="Seleccionar archivo PDF o DOCX"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => !uploading && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            aria-label="Zona para arrastrar o seleccionar archivos PDF o DOCX"
            className={`relative flex flex-col items-center justify-center gap-2 h-24 rounded-[14px] border-2 border-dashed transition-all cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-alzak-blue/50 ${
              dragging
                ? 'border-alzak-blue bg-alzak-blue/5 dark:border-alzak-gold dark:bg-alzak-gold/5 scale-[1.01]'
                : uploadedFile
                  ? 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-900/20'
                  : 'border-slate-300 dark:border-slate-600 hover:border-alzak-blue/50 dark:hover:border-alzak-gold/50 bg-white/30 dark:bg-slate-800/30'
            }`}
          >
            {uploading ? (
              <>
                <div className="w-6 h-6 border-2 border-alzak-blue/30 border-t-alzak-blue rounded-full animate-spin" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Extrayendo texto...</p>
              </>
            ) : uploadedFile ? (
              <>
                <span className="text-xl">📄</span>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate max-w-xs px-4">{uploadedFile}</p>
                <p className="text-[10px] text-slate-400">Haz clic para cambiar el archivo</p>
              </>
            ) : (
              <>
                <span className="text-2xl opacity-40">{dragging ? '📂' : '📎'}</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {dragging ? 'Suelta aquí' : 'Arrastra un PDF o DOCX · o haz clic para seleccionar'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* ── Separador ── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">o escribe / pega directamente</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* ── Textarea auto-expandible ── */}
        <div>
          <label htmlFor="proc-texto" className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
            Texto de la minuta
            {uploadedFile && <span className="ml-2 normal-case font-normal text-emerald-500">— extraído de {uploadedFile}</span>}
          </label>
          <textarea
            ref={textareaRef}
            id="proc-texto"
            className="w-full min-h-[8rem] p-4 rounded-[14px] bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue dark:focus:ring-alzak-gold resize-none overflow-hidden transition-all text-sm"
            placeholder={isArchivoMode
              ? 'Texto extraído del archivo (puedes editar antes de procesar)…'
              : 'Una tarea por línea:\nInforme financiero Q1 para Bayer\nRevisión contrato Pfizer\nPresupuesto evento mayo…'}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              if (!uploadedFile && e.target.value.trim()) setMode('texto');
              if (!e.target.value.trim() && !uploadedFile) setMode(null);
              adjustHeight();
            }}
          />
          <p className="text-[10px] text-slate-400 mt-1 text-right">{texto.length.toLocaleString()} caracteres</p>
        </div>

        {/* ── Barra de progreso — visible en ambos modos mientras carga ── */}
        {cargando && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">{progressLabel}</span>
              <span className="text-xs font-bold text-alzak-blue dark:text-alzak-gold">{progressPhase}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-alzak-blue dark:bg-alzak-gold rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPhase}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Botón de acción ── */}
        <button
          onClick={onProcesar}
          disabled={cargando || !hasText}
          className={`w-full py-3.5 rounded-[14px] font-bold text-sm shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-alzak-blue/50 ${
            cargando || !hasText
              ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
              : isArchivoMode
                ? 'bg-alzak-blue dark:bg-alzak-gold text-white dark:text-alzak-dark hover:opacity-90'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
          }`}
        >
          {cargando ? (
            <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> {isArchivoMode ? 'Procesando con IA...' : 'Estructurando tareas...'}</>
          ) : isArchivoMode
            ? '🤖 Procesar con IA'
            : isTextoMode
              ? '⚡ Cargar tareas directamente'
              : '✨ Procesar'}
        </button>
      </div>

      {/* ── Caja de ayuda contextual ── */}
      <div className="glass rounded-[20px] p-5">
        {isTextoMode ? (
          <>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Formato para texto directo</p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex gap-2.5"><span>📝</span>Una tarea por línea — cada línea se convierte en una tarjeta.</li>
              <li className="flex gap-2.5"><span>✅</span>Ideal cuando ya tienes las tareas claras y definidas.</li>
              <li className="flex gap-2.5"><span>⚡</span>Sin IA — carga instantánea, sin costo de procesamiento.</li>
              <li className="flex gap-2.5"><span>🔧</span>Asigna responsable, fecha y prioridad en el siguiente paso.</li>
            </ul>
          </>
        ) : (
          <>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Tips para mejores resultados con IA</p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex gap-2.5"><span>📌</span>Menciona el número de proyecto (ej: &ldquo;proyecto 5024&rdquo;).</li>
              <li className="flex gap-2.5"><span>👤</span>Usa nombres completos del equipo para asignar tareas correctamente.</li>
              <li className="flex gap-2.5"><span>📅</span>Menciona fechas claras (&ldquo;próximo lunes&rdquo;, &ldquo;15 de mayo&rdquo;).</li>
              <li className="flex gap-2.5"><span>⚡</span>Indica prioridades: &ldquo;urgente&rdquo; → Alta, &ldquo;cuando pueda&rdquo; → Baja.</li>
            </ul>
          </>
        )}
      </div>
    </>
  );
}
