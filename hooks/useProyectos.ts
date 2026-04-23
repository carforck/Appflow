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
  const { projects, loading, error, createProject, updateProject, deleteProject } = useProjectStore();
  const { addToast } = useToast();

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [form,         setForm]         = useState<ProjectFormData>(EMPTY_FORM);
  const [fieldErrors,  setFieldErrors]  = useState<Record<string, string>>({});
  const [isSaving,     setIsSaving]     = useState(false);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

  // ── Datos derivados ──────────────────────────────────────────────────────
  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !search
      || p.nombre_proyecto.toLowerCase().includes(q)
      || p.id_proyecto.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || p.estado === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total:   projects.length,
    activo:  projects.filter((p) => p.estado === 'Activo').length,
    cerrado: projects.filter((p) => p.estado === 'Cerrado').length,
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
      id_proyecto:     p.id_proyecto,
      nombre_proyecto: p.nombre_proyecto,
      financiador:     p.financiador ?? '',
      empresa:         p.empresa ?? '',
      estado:          p.estado,
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

  // ── Guardar con validación Zod + llamada a API ───────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const result = ProjectFormSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const err of result.error.issues) {
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

    setIsSaving(true);
    try {
      if (editingId) {
        await updateProject(editingId, {
          nombre_proyecto: data.nombre_proyecto.trim(),
          financiador:     data.financiador?.trim() || null,
          empresa:         data.empresa?.trim() || null,
          estado:          data.estado,
        });
        addToast(`Proyecto "${data.nombre_proyecto}" actualizado`, 'success');
      } else {
        await createProject({
          id_proyecto:     data.id_proyecto.trim(),
          nombre_proyecto: data.nombre_proyecto.trim(),
          financiador:     data.financiador?.trim() || null,
          empresa:         data.empresa?.trim() || null,
          estado:          data.estado,
        });
        addToast(`Proyecto "${data.nombre_proyecto}" creado`, 'success');
      }
      setModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      setFieldErrors({ id_proyecto: msg });
      addToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteProject(id);
      addToast('Proyecto eliminado correctamente', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Error al eliminar', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return {
    // datos
    filtered,
    counts,
    loading,
    error,
    // filtros
    search,       setSearch,
    statusFilter, setStatusFilter,
    // modal / form
    modalOpen,
    editingId,
    form,
    fieldErrors,
    isSaving,
    patchForm,
    // acciones
    openCreate,
    openEdit,
    closeModal,
    handleSave,
    handleDelete,
    deletingId,
  };
}
