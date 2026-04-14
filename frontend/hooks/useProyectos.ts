"use client";

import { useState } from 'react';
import { useProjectStore } from '@/context/ProjectStoreContext';
import { useToast } from '@/components/Toast';
import {
  ProjectFormSchema,
  EMPTY_FORM,
  type ProjectFormData,
  type ProjectStatus,
} from '@/schemas/proyecto';
import type { MockProject } from '@/lib/mockData';

export function useProyectos() {
  const { projects, createProject, updateProject } = useProjectStore();
  const { addToast } = useToast();

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [form,         setForm]         = useState<ProjectFormData>(EMPTY_FORM);
  const [fieldErrors,  setFieldErrors]  = useState<Record<string, string>>({});

  // ── Datos derivados ──────────────────────────────────────────────────────
  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !search
      || p.nombre.toLowerCase().includes(q)
      || p.id_proyecto.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total:      projects.length,
    activo:     projects.filter((p) => p.status === 'activo').length,
    completado: projects.filter((p) => p.status === 'completado').length,
    inactivo:   projects.filter((p) => p.status === 'inactivo').length,
  };

  // ── Acciones del modal ───────────────────────────────────────────────────
  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFieldErrors({});
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
    setFieldErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function patchForm(patch: Partial<ProjectFormData>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  // ── Guardar con validación Zod ───────────────────────────────────────────
  function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const result = ProjectFormSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const err of result.error.errors) {
        const key = String(err.path[0]);
        if (!errs[key]) errs[key] = err.message;
      }
      setFieldErrors(errs);
      return;
    }

    const data = result.data;

    if (!editingId && projects.some((p) => p.id_proyecto === data.id_proyecto.trim())) {
      setFieldErrors({ id_proyecto: 'Ya existe un proyecto con ese código' });
      return;
    }

    if (editingId) {
      updateProject(editingId, {
        nombre:      data.nombre.trim(),
        financiador: data.financiador?.trim() || null,
        status:      data.status,
      });
      addToast(`Proyecto "${data.nombre}" actualizado`, 'success');
    } else {
      createProject({
        id_proyecto: data.id_proyecto.trim(),
        nombre:      data.nombre.trim(),
        financiador: data.financiador?.trim() || null,
        status:      data.status,
      });
      addToast(`Proyecto "${data.nombre}" creado`, 'success');
    }

    setModalOpen(false);
  }

  return {
    // datos
    filtered,
    counts,
    // filtros
    search,       setSearch,
    statusFilter, setStatusFilter,
    // modal / form
    modalOpen,
    editingId,
    form,
    fieldErrors,
    patchForm,
    // acciones
    openCreate,
    openEdit,
    closeModal,
    handleSave,
  };
}
