"use client";

import { useState, useEffect } from 'react';
import type { MockUser }    from '@/lib/mockData';
import type { ProjectInfo } from './RevisionRow';
import type { TareaPrioridad } from '@/lib/mockData';

interface FormData {
  id_proyecto:        string;
  tarea_descripcion:  string;
  responsable_nombre: string;
  responsable_correo: string;
  prioridad:          TareaPrioridad;
  fecha_inicio:       string;
  fecha_entrega:      string;
}

interface AddTaskData {
  id_proyecto?:        string;
  tarea_descripcion:   string;
  responsable_nombre?: string;
  responsable_correo?: string;
  prioridad?:          TareaPrioridad;
  fecha_inicio?:       string;
  fecha_entrega?:      string;
}

interface Props {
  users:      MockUser[];
  projects:   ProjectInfo[];
  projectMap: Record<string, ProjectInfo>;
  onAdd:      (data: AddTaskData) => Promise<boolean>;
  onClose:    () => void;
}

const PRIO_PILL: Record<TareaPrioridad, string> = {
  Alta:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Baja:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

const defaultDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
};

export function AddRevisionTaskModal({ users, projects, projectMap, onAdd, onClose }: Props) {
  const [form, setForm] = useState<FormData>({
    id_proyecto: '', tarea_descripcion: '', responsable_nombre: '',
    responsable_correo: '', prioridad: 'Media',
    fecha_inicio: '', fecha_entrega: defaultDate(),
  });
  const [proyNombre,  setProyNombre]  = useState('');
  const [saving,      setSaving]      = useState(false);
  const [errors,      setErrors]      = useState<Partial<Record<keyof FormData, string>>>({});

  // Project search
  const [showProjects,   setShowProjects]   = useState(false);
  const [projectSearch,  setProjectSearch]  = useState('');
  const [editProject,    setEditProject]    = useState(true);

  // Responsable search
  const [showUsers,       setShowUsers]       = useState(false);
  const [userSearch,      setUserSearch]      = useState('');
  const [editResponsable, setEditResponsable] = useState(true);

  const filteredProjects = projects
    .filter((p) => p.estado === 'Activo')
    .filter((p) =>
      !projectSearch ||
      p.id_proyecto.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.nombre_proyecto.toLowerCase().includes(projectSearch.toLowerCase())
    );

  const filteredUsers = users.filter((u) =>
    u.activo && (
      !userSearch ||
      u.nombre_completo.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.correo.toLowerCase().includes(userSearch.toLowerCase())
    )
  ).slice(0, 6);

  const selectProject = (id: string) => {
    const info = projectMap[id];
    setForm((f) => ({ ...f, id_proyecto: id }));
    setProyNombre(info?.nombre_proyecto ?? id);
    setEditProject(false);
    setShowProjects(false);
    setProjectSearch('');
    setErrors((e) => ({ ...e, id_proyecto: undefined }));
  };

  const clearProject = () => {
    setForm((f) => ({ ...f, id_proyecto: '' }));
    setProyNombre('');
    setEditProject(true);
    setProjectSearch('');
  };

  const selectUser = (nombre: string, correo: string) => {
    setForm((f) => ({ ...f, responsable_nombre: nombre, responsable_correo: correo }));
    setEditResponsable(false);
    setShowUsers(false);
    setUserSearch('');
    setErrors((e) => ({ ...e, responsable_correo: undefined }));
  };

  const clearUser = () => {
    setForm((f) => ({ ...f, responsable_nombre: '', responsable_correo: '' }));
    setEditResponsable(true);
    setUserSearch('');
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.tarea_descripcion.trim()) e.tarea_descripcion = 'Requerido';
    if (!form.fecha_entrega)            e.fecha_entrega     = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    const ok = await onAdd({
      id_proyecto:        form.id_proyecto || undefined,
      tarea_descripcion:  form.tarea_descripcion.trim(),
      responsable_nombre: form.responsable_nombre || undefined,
      responsable_correo: form.responsable_correo || undefined,
      prioridad:          form.prioridad,
      fecha_inicio:       form.fecha_inicio  || undefined,
      fecha_entrega:      form.fecha_entrega,
    });
    setSaving(false);
    if (ok) onClose();
  };

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const inputCls = (err?: string) =>
    `w-full text-sm px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
      err
        ? 'border-red-400 focus:ring-red-300'
        : 'border-slate-200 dark:border-slate-700 focus:ring-alzak-blue/30 dark:focus:ring-alzak-gold/30'
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-task-modal-title"
    >
      <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto kanban-scroll">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 id="add-task-modal-title" className="text-base font-bold text-slate-800 dark:text-white">
            ➕ Agregar tarea a revisión
          </h2>
          <button onClick={onClose} aria-label="Cerrar" className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">✕</button>
        </div>

        {/* Proyecto */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Proyecto</label>
          <div className="relative">
            {form.id_proyecto && !editProject ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-alzak-blue/5 dark:bg-alzak-gold/10">
                <span className="text-sm font-mono font-bold text-alzak-blue dark:text-alzak-gold flex-1">{form.id_proyecto}</span>
                <span className="text-xs text-slate-500 truncate flex-1">{proyNombre}</span>
                <button onClick={clearProject} aria-label="Cambiar proyecto" className="text-slate-400 hover:text-red-500 font-bold text-sm">×</button>
              </div>
            ) : (
              <input
                type="text"
                value={projectSearch}
                onChange={(e) => { setProjectSearch(e.target.value); setShowProjects(true); }}
                onFocus={() => setShowProjects(true)}
                onBlur={() => setTimeout(() => setShowProjects(false), 150)}
                placeholder="Buscar por ID o nombre de proyecto..."
                className={inputCls()}
              />
            )}
            {showProjects && filteredProjects.length > 0 && (
              <div className="absolute z-20 left-0 top-full mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl max-h-52 overflow-y-auto kanban-scroll">
                {filteredProjects.map((p) => (
                  <button
                    key={p.id_proyecto}
                    type="button"
                    onMouseDown={() => selectProject(p.id_proyecto)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <p className="text-xs font-mono font-bold text-alzak-blue dark:text-alzak-gold">{p.id_proyecto}</p>
                    <p className="text-[11px] text-slate-500 truncate">{p.nombre_proyecto}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Descripción */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Descripción <span className="text-red-400">*</span>
          </label>
          <textarea
            value={form.tarea_descripcion}
            onChange={(e) => { setForm((f) => ({ ...f, tarea_descripcion: e.target.value })); setErrors((er) => ({ ...er, tarea_descripcion: undefined })); }}
            rows={3}
            placeholder="Describe la tarea..."
            aria-invalid={!!errors.tarea_descripcion}
            aria-describedby={errors.tarea_descripcion ? 'desc-error' : undefined}
            className={inputCls(errors.tarea_descripcion)}
          />
          {errors.tarea_descripcion && <p id="desc-error" role="alert" className="text-xs text-red-500">{errors.tarea_descripcion}</p>}
        </div>

        {/* Responsable */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Responsable</label>
          <div className="relative">
            {form.responsable_correo && !editResponsable ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">{form.responsable_nombre}</span>
                <button onClick={clearUser} aria-label="Cambiar responsable" className="text-slate-400 hover:text-red-500 font-bold text-sm">×</button>
              </div>
            ) : (
              <input
                type="text"
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setShowUsers(true); }}
                onFocus={() => setShowUsers(true)}
                onBlur={() => setTimeout(() => { setShowUsers(false); }, 150)}
                placeholder="Buscar por nombre o correo..."
                className={inputCls()}
              />
            )}
            {showUsers && filteredUsers.length > 0 && (
              <div className="absolute z-20 left-0 top-full mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl max-h-52 overflow-y-auto kanban-scroll">
                {filteredUsers.map((u) => (
                  <button
                    key={u.correo}
                    type="button"
                    onMouseDown={() => selectUser(u.nombre_completo, u.correo)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <p className="text-sm font-medium text-slate-700 dark:text-white truncate">{u.nombre_completo}</p>
                    <p className="text-xs text-slate-400 truncate">{u.correo}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Prioridad */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Prioridad</label>
          <div className="flex gap-2">
            {(['Alta', 'Media', 'Baja'] as TareaPrioridad[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setForm((f) => ({ ...f, prioridad: p }))}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  form.prioridad === p
                    ? `${PRIO_PILL[p]} border-transparent shadow-sm`
                    : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Fecha inicio</label>
            <input
              type="date"
              value={form.fecha_inicio}
              onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
              className={inputCls()}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Fecha fin <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={form.fecha_entrega}
              onChange={(e) => { setForm((f) => ({ ...f, fecha_entrega: e.target.value })); setErrors((er) => ({ ...er, fecha_entrega: undefined })); }}
              aria-invalid={!!errors.fecha_entrega}
              className={inputCls(errors.fecha_entrega)}
            />
            {errors.fecha_entrega && <p role="alert" className="text-xs text-red-500">{errors.fecha_entrega}</p>}
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-alzak-blue text-white hover:bg-alzak-blue/90 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : '➕ Agregar tarea'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
