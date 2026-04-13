"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProjectStore } from '@/context/ProjectStoreContext';
import { useToast } from '@/components/Toast';
import type { MockProject } from '@/lib/mockData';
import { useRouter } from 'next/navigation';

const ROLE_RANK: Record<string, number> = { superadmin: 3, admin: 2, user: 1 };

type ProjectStatus = MockProject['status'];

const STATUS_LABEL: Record<ProjectStatus, string> = {
  activo:     'Activo',
  inactivo:   'Inactivo',
  completado: 'Completado',
};
const STATUS_COLOR: Record<ProjectStatus, string> = {
  activo:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  inactivo:   'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400',
  completado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

interface FormState {
  id_proyecto:  string;
  nombre:       string;
  financiador:  string;
  status:       ProjectStatus;
}

const EMPTY_FORM: FormState = { id_proyecto: '', nombre: '', financiador: '', status: 'activo' };

export default function ProyectosPage() {
  const { user }                          = useAuth();
  const { projects, createProject, updateProject } = useProjectStore();
  const { addToast }                      = useToast();
  const router                            = useRouter();

  const isAdmin = ROLE_RANK[user?.role ?? 'user'] >= 2;

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [form,         setForm]         = useState<FormState>(EMPTY_FORM);
  const [errors,       setErrors]       = useState<Record<string, string>>({});

  // Redirect non-admin (after hooks)
  if (!isAdmin) {
    router.replace('/dashboard');
    return null;
  }

  const filtered = projects.filter((p) => {
    const matchSearch = !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || p.id_proyecto.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(p: MockProject) {
    setForm({
      id_proyecto: p.id_proyecto,
      nombre:      p.nombre,
      financiador: p.financiador ?? '',
      status:      p.status,
    });
    setEditingId(p.id_proyecto);
    setErrors({});
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.id_proyecto.trim()) e.id_proyecto = 'El código es requerido';
    if (!form.nombre.trim())      e.nombre      = 'El nombre es requerido';
    if (!editingId && projects.some((p) => p.id_proyecto === form.id_proyecto.trim())) {
      e.id_proyecto = 'Ya existe un proyecto con ese código';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data: MockProject = {
      id_proyecto: form.id_proyecto.trim(),
      nombre:      form.nombre.trim(),
      financiador: form.financiador.trim() || null,
      status:      form.status,
    };

    if (editingId) {
      updateProject(editingId, { nombre: data.nombre, financiador: data.financiador, status: data.status });
      addToast(`Proyecto "${data.nombre}" actualizado`, 'success');
    } else {
      createProject(data);
      addToast(`Proyecto "${data.nombre}" creado`, 'success');
    }

    setModalOpen(false);
  }

  const counts = {
    total:     projects.length,
    activo:    projects.filter((p) => p.status === 'activo').length,
    completado: projects.filter((p) => p.status === 'completado').length,
    inactivo:  projects.filter((p) => p.status === 'inactivo').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Proyectos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gestión de proyectos de investigación clínica
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-alzak-blue text-white text-sm font-bold hover:bg-alzak-blue/90 transition-colors shadow-md shrink-0"
        >
          <span className="text-base leading-none">+</span>
          <span>Nuevo proyecto</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { label: 'Total',      value: counts.total,      color: 'text-slate-700 dark:text-slate-200' },
          { label: 'Activos',    value: counts.activo,     color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Completados',value: counts.completado, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Inactivos',  value: counts.inactivo,   color: 'text-slate-400' },
        ] as const).map((s) => (
          <div key={s.label} className="glass rounded-[16px] border border-slate-200/60 dark:border-slate-700/60 p-4" style={{ background: 'var(--sidebar-bg)' }}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
        />
        <div className="flex gap-2">
          {(['all', 'activo', 'completado', 'inactivo'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? 'bg-alzak-blue text-white dark:bg-alzak-gold dark:text-alzak-dark'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              {s === 'all' ? 'Todos' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Project list */}
      {filtered.length === 0 ? (
        <div className="glass rounded-[20px] border border-slate-200/60 dark:border-slate-700/60 py-12 text-center" style={{ background: 'var(--sidebar-bg)' }}>
          <p className="text-sm text-slate-400">Sin proyectos que coincidan</p>
        </div>
      ) : (
        <>
          {/* MOBILE — Cards */}
          <div className="sm:hidden space-y-2">
            {filtered.map((p) => (
              <div
                key={p.id_proyecto}
                className="glass rounded-[16px] border border-slate-200/60 dark:border-slate-700/60 p-4"
                style={{ background: 'var(--sidebar-bg)' }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-[11px] font-bold text-alzak-blue dark:text-alzak-gold bg-alzak-blue/10 dark:bg-alzak-gold/10 px-2 py-0.5 rounded-lg shrink-0">
                    {p.id_proyecto}
                  </span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${STATUS_COLOR[p.status]}`}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white leading-snug mb-1">{p.nombre}</p>
                {p.financiador && (
                  <p className="text-xs text-slate-400 mb-3">{p.financiador}</p>
                )}
                <button
                  onClick={() => openEdit(p)}
                  className="text-xs text-alzak-blue dark:text-alzak-gold font-semibold hover:underline"
                >
                  Editar →
                </button>
              </div>
            ))}
          </div>

          {/* DESKTOP — Table */}
          <div className="hidden sm:block glass rounded-[20px] border border-slate-200/60 dark:border-slate-700/60 overflow-hidden" style={{ background: 'var(--sidebar-bg)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Código</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nombre</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Financiador</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr
                      key={p.id_proyecto}
                      className={`border-b border-slate-100/60 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        i === filtered.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-alzak-blue dark:text-alzak-gold bg-alzak-blue/[0.08] dark:bg-alzak-gold/[0.08] px-2 py-0.5 rounded-lg">
                          {p.id_proyecto}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-white">{p.nombre}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-500 dark:text-slate-400">{p.financiador ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${STATUS_COLOR[p.status]}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-xs text-alzak-blue dark:text-alzak-gold hover:underline font-semibold"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal crear/editar */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div
            className="glass w-full max-w-md rounded-[24px] shadow-2xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden"
            style={{ background: 'var(--sidebar-bg)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/60">
              <h2 className="font-bold text-sm text-slate-800 dark:text-white">
                {editingId ? 'Editar proyecto' : 'Nuevo proyecto'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 text-lg"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {/* Código */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.id_proyecto}
                  onChange={(e) => setForm((f) => ({ ...f, id_proyecto: e.target.value }))}
                  disabled={!!editingId}
                  placeholder="Ej. BAY-001"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {errors.id_proyecto && <p className="text-[10px] text-red-500 mt-1">{errors.id_proyecto}</p>}
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Nombre descriptivo del proyecto"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
                />
                {errors.nombre && <p className="text-[10px] text-red-500 mt-1">{errors.nombre}</p>}
              </div>

              {/* Financiador */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Financiador</label>
                <input
                  type="text"
                  value={form.financiador}
                  onChange={(e) => setForm((f) => ({ ...f, financiador: e.target.value }))}
                  placeholder="Ej. Bayer, Pfizer, Minciencias..."
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-alzak-blue/40"
                />
              </div>

              {/* Estado */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Estado</label>
                <div className="flex gap-2">
                  {(['activo', 'inactivo', 'completado'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, status: s }))}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
                        form.status === s
                          ? `${STATUS_COLOR[s]} border-transparent ring-2`
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-sm font-bold bg-alzak-blue text-white hover:bg-alzak-blue/90 transition-colors shadow-md"
                >
                  {editingId ? 'Guardar cambios' : 'Crear proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
