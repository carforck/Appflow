"use client";

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';
import { useUserStore } from '@/context/UserStoreContext';
import { useTaskStore, TaskWithMeta } from '@/context/TaskStoreContext';
import type { TareaPrioridad } from '@/lib/mockData';

interface Props {
  task:    TaskWithMeta;
  onClose: () => void;
}

const PRIORIDADES: TareaPrioridad[] = ['Alta', 'Media', 'Baja'];

export function EditTaskModal({ task, onClose }: Props) {
  const { refresh } = useTaskStore();
  const userStore   = useUserStore();
  const users       = userStore?.users ?? [];

  const [desc,         setDesc]         = useState(task.tarea_descripcion);
  const [prioridad,    setPrioridad]    = useState<TareaPrioridad>(task.prioridad);
  const [respNombre,   setRespNombre]   = useState(task.responsable_nombre);
  const [respCorreo,   setRespCorreo]   = useState(task.responsable_correo);
  const [fechaEntrega, setFechaEntrega] = useState(task.fecha_entrega ?? '');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  // Cierra con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleResponsableChange = (correo: string) => {
    const u = users.find((u) => u.correo === correo);
    setRespCorreo(correo);
    setRespNombre(u?.nombre_completo ?? correo);
  };

  const handleSave = async () => {
    if (!desc.trim()) { setError('La descripción no puede estar vacía.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await authFetch(`/tareas/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tarea_descripcion:  desc.trim(),
          prioridad,
          responsable_nombre: respNombre,
          responsable_correo: respCorreo,
          fecha_entrega:      fechaEntrega || undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refresh();
      onClose();
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[20px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-alzak-blue dark:text-white">Modificar tarea</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">#{task.id} · el responsable recibirá un email con los cambios</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-alzak-blue/50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto kanban-scroll">
          {/* Descripción */}
          <div>
            <label htmlFor="edit-desc" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Descripción
            </label>
            <textarea
              id="edit-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              aria-invalid={!!error}
              aria-describedby={error ? 'edit-error' : undefined}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 dark:focus:ring-alzak-gold/40 transition-all"
            />
          </div>

          {/* Prioridad */}
          <div>
            <label htmlFor="edit-prio" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Prioridad
            </label>
            <select
              id="edit-prio"
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as TareaPrioridad)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 dark:focus:ring-alzak-gold/40 appearance-none"
            >
              {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Responsable */}
          <div>
            <label htmlFor="edit-resp" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Responsable
            </label>
            <select
              id="edit-resp"
              value={respCorreo}
              onChange={(e) => handleResponsableChange(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 dark:focus:ring-alzak-gold/40 appearance-none"
            >
              {users.map((u) => (
                <option key={u.correo} value={u.correo}>{u.nombre_completo}</option>
              ))}
              {/* Si el responsable actual no está en la lista de users, mostrarlo igual */}
              {!users.find((u) => u.correo === respCorreo) && (
                <option value={respCorreo}>{respNombre}</option>
              )}
            </select>
          </div>

          {/* Fecha entrega */}
          <div>
            <label htmlFor="edit-fecha" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Fecha de entrega
            </label>
            <input
              id="edit-fecha"
              type="date"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 dark:focus:ring-alzak-gold/40"
            />
          </div>

          {error && (
            <p id="edit-error" role="alert" className="text-xs text-red-500 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-bold rounded-xl bg-alzak-blue text-white hover:bg-alzak-blue/90 disabled:opacity-60 transition-colors focus-visible:ring-2 focus-visible:ring-alzak-blue/50"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
