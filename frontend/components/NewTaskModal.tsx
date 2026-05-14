"use client";

import { useState, useEffect, useRef } from 'react';
import { useTaskStore } from '@/context/TaskStoreContext';
import { useProjectStore } from '@/context/ProjectStoreContext';
import { useToast } from '@/components/Toast';
import type { TareaPrioridad, MockUser } from '@/lib/mockData';
import { useUsuarios } from '@/hooks/useUsuarios';
import { authFetch } from '@/lib/api';

interface Props {
  onClose: () => void;
}

const PRIORIDADES: TareaPrioridad[] = ['Alta', 'Media', 'Baja'];
const PRIORIDAD_COLOR: Record<TareaPrioridad, string> = {
  Alta:  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-red-400',
  Media: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-amber-400',
  Baja:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-green-400',
};

const today = () => new Date().toISOString().split('T')[0];

export default function NewTaskModal({ onClose }: Props) {
  const { refresh, createTask } = useTaskStore();
  const { projects } = useProjectStore();
  const { addToast } = useToast();

  // Form state
  const [proyectoId,    setProyectoId]    = useState('');
  const [proyectoQuery, setProyectoQuery] = useState('');
  const [proyectoOpen,  setProyectoOpen]  = useState(false);
  const proyectoRef = useRef<HTMLDivElement>(null);
  const [descripcion,  setDescripcion]  = useState('');
  const [prioridad,    setPrioridad]    = useState<TareaPrioridad>('Media');
  const [fechaInicio,  setFechaInicio]  = useState(today());
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [userSearch,   setUserSearch]   = useState('');
  const { users } = useUsuarios();
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [submitting,   setSubmitting]   = useState(false);

  // User search dropdown
  const [showDropdown, setShowDropdown] = useState(false);
  const userInputRef = useRef<HTMLInputElement>(null);

  const filteredProjects = projects
    .filter((p) => p.estado === 'Activo')
    .filter((p) =>
      !proyectoQuery ||
      p.id_proyecto.toLowerCase().includes(proyectoQuery.toLowerCase()) ||
      p.nombre_proyecto.toLowerCase().includes(proyectoQuery.toLowerCase()),
    );

  const filteredUsers = users.filter(
    (u) =>
      u.activo &&
      (u.nombre_completo.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.correo.toLowerCase().includes(userSearch.toLowerCase())),
  ).slice(0, 6);

  // Click-outside proyecto combobox
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (proyectoRef.current && !proyectoRef.current.contains(e.target as Node)) setProyectoOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const selectedProject = projects.find((p) => p.id_proyecto === proyectoId);

  function validate() {
    const e: Record<string, string> = {};
    if (!proyectoId)          e.proyecto    = 'Selecciona un proyecto';
    if (!descripcion.trim())  e.descripcion = 'La descripción es requerida';
    if (!selectedUser)        e.responsable = 'Selecciona un responsable';
    if (!fechaEntrega)        e.fecha       = 'La fecha de entrega es requerida';
    if (fechaEntrega && fechaEntrega < fechaInicio) e.fecha = 'La fecha de entrega debe ser posterior al inicio';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function clearError(field: string) {
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !selectedUser || !selectedProject) return;

    setSubmitting(true);
    try {
      const res = await authFetch('/tareas/crear', {
        method: 'POST',
        body: JSON.stringify({
          id_proyecto:        proyectoId,
          tarea_descripcion:  descripcion.trim(),
          responsable_nombre: selectedUser.nombre_completo,
          responsable_correo: selectedUser.correo,
          prioridad,
          fecha_inicio:       fechaInicio,
          fecha_entrega:      fechaEntrega,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addToast((err as { error?: string }).error ?? 'Error al crear la tarea', 'error');
        return;
      }

      // Optimistic: agrega la tarea al board inmediatamente con ID temporal
      // El socket task_created reemplazará el ID temporal con el real vía refresh()
      createTask({
        id_proyecto:        proyectoId,
        nombre_proyecto:    selectedProject.nombre_proyecto,
        tarea_descripcion:  descripcion.trim(),
        responsable_nombre: selectedUser.nombre_completo,
        responsable_correo: selectedUser.correo,
        prioridad,
        fecha_inicio:       fechaInicio,
        fecha_entrega:      fechaEntrega,
      });
      addToast(`Tarea creada y asignada a ${selectedUser.nombre_completo}`, 'success');
      onClose();
      refresh().catch(() => {});
    } catch {
      addToast('No se pudo conectar con el servidor', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass w-full max-w-lg rounded-[24px] shadow-2xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60 shrink-0">
          <div>
            <h2 className="font-bold text-base text-slate-800 dark:text-white">Nueva Tarea</h2>
            <p className="text-[11px] text-slate-400">Completa todos los campos requeridos</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form id="new-task-form" onSubmit={handleSubmit} className="overflow-y-auto kanban-scroll px-6 py-4 space-y-4 flex-1">

          {/* Proyecto */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Proyecto <span className="text-red-500">*</span>
            </label>
            <div ref={proyectoRef} className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={proyectoQuery}
                  onChange={(e) => { setProyectoQuery(e.target.value); setProyectoId(''); setProyectoOpen(true); clearError('proyecto'); }}
                  onFocus={() => setProyectoOpen(true)}
                  placeholder="Buscar por ID o nombre..."
                  autoComplete="off"
                  className="w-full text-sm px-3 py-2 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setProyectoOpen((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label="Ver proyectos"
                >
                  <svg className={`w-3.5 h-3.5 transition-transform ${proyectoOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {proyectoOpen && filteredProjects.length > 0 && (
                <ul
                  role="listbox"
                  className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-y-auto max-h-44 kanban-scroll"
                >
                  {filteredProjects.map((p) => (
                    <li
                      key={p.id_proyecto}
                      role="option"
                      aria-selected={proyectoId === p.id_proyecto}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setProyectoId(p.id_proyecto);
                        setProyectoQuery(`[${p.id_proyecto}] ${p.nombre_proyecto}`);
                        setProyectoOpen(false);
                        clearError('proyecto');
                      }}
                      className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                        proyectoId === p.id_proyecto
                          ? 'bg-alzak-blue/10 dark:bg-alzak-gold/10 text-alzak-blue dark:text-alzak-gold font-semibold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="font-mono text-[11px] text-alzak-blue dark:text-alzak-gold mr-2">[{p.id_proyecto}]</span>
                      {p.nombre_proyecto}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Cascade */}
            {selectedProject && (
              <div className="flex gap-2 mt-1.5 flex-wrap">
                <span className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Empresa:</span>{' '}{selectedProject.empresa ?? '—'}
                </span>
                <span className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Financiador:</span>{' '}{selectedProject.financiador ?? '—'}
                </span>
              </div>
            )}
            {errors.proyecto && <p className="text-[10px] text-red-500 mt-1">{errors.proyecto}</p>}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => { setDescripcion(e.target.value); clearError('descripcion'); }}
              rows={3}
              placeholder="Describe la tarea con detalle..."
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 resize-none"
            />
            {errors.descripcion && <p className="text-[10px] text-red-500 mt-1">{errors.descripcion}</p>}
          </div>

          {/* Responsable */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Responsable <span className="text-red-500">*</span>
            </label>
            {selectedUser ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-alzak-blue/40 bg-alzak-blue/5 dark:bg-alzak-blue/10">
                <div className="w-7 h-7 rounded-full bg-alzak-blue text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {selectedUser.nombre_completo.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{selectedUser.nombre_completo}</p>
                  <p className="text-[10px] text-slate-400 truncate">{selectedUser.correo}</p>
                </div>
                <button type="button" onClick={() => { setSelectedUser(null); setUserSearch(''); }} className="text-slate-400 hover:text-slate-600 text-sm">×</button>
              </div>
            ) : (
              <>
                <input
                  ref={userInputRef}
                  type="text"
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setShowDropdown(true); clearError('responsable'); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Buscar por nombre o correo..."
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
                />
                {showDropdown && userSearch.length > 0 && filteredUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.correo}
                        type="button"
                        onMouseDown={() => { setSelectedUser(u); setUserSearch(''); setShowDropdown(false); }}
                        className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {u.nombre_completo.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800 dark:text-white truncate">{u.nombre_completo}</p>
                          <p className="text-[10px] text-slate-400 truncate">{u.correo}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {errors.responsable && <p className="text-[10px] text-red-500 mt-1">{errors.responsable}</p>}
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Prioridad</label>
            <div className="flex gap-2">
              {PRIORIDADES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrioridad(p)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
                    prioridad === p
                      ? `${PRIORIDAD_COLOR[p]} ring-2 border-transparent`
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Fecha inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Fecha entrega <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fechaEntrega}
                min={fechaInicio}
                onChange={(e) => { setFechaEntrega(e.target.value); clearError('fecha'); }}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
              />
              {errors.fecha && <p className="text-[10px] text-red-500 mt-1">{errors.fecha}</p>}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-200/60 dark:border-slate-700/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="new-task-form"
            disabled={submitting}
            className="flex-1 py-2 rounded-xl text-sm font-bold bg-alzak-blue text-white hover:bg-alzak-blue/90 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {submitting ? 'Guardando…' : 'Crear tarea'}
          </button>
        </div>
      </div>
    </div>
  );
}
