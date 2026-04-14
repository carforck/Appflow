"use client";

import { useAuth }         from '@/context/AuthContext';
import { useRouter }       from 'next/navigation';
import { useProyectos }    from '@/hooks/useProyectos';
import { Modal }           from '@/components/ui/Modal';
import { Button }          from '@/components/ui/Button';
import { ProjectStats }    from '@/components/proyectos/ProjectStats';
import { ProjectFilters }  from '@/components/proyectos/ProjectFilters';
import { ProjectCard }     from '@/components/proyectos/ProjectCard';
import { ProjectTable }    from '@/components/proyectos/ProjectTable';
import { ProjectForm }     from '@/components/proyectos/ProjectForm';

const ROLE_RANK: Record<string, number> = { superadmin: 3, admin: 2, user: 1 };

export default function ProyectosPage() {
  const { user }   = useAuth();
  const router     = useRouter();
  const proyectos  = useProyectos();

  if (ROLE_RANK[user?.role ?? 'user'] < 2) {
    router.replace('/dashboard');
    return null;
  }

  const {
    filtered, counts,
    search, setSearch,
    statusFilter, setStatusFilter,
    modalOpen, editingId,
    form, fieldErrors,
    patchForm,
    openCreate, openEdit, closeModal, handleSave,
  } = proyectos;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Proyectos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gestión de proyectos de investigación clínica
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="shrink-0 flex items-center gap-1.5">
          <span className="text-base leading-none">+</span> Nuevo proyecto
        </Button>
      </div>

      <ProjectStats {...counts} />

      <ProjectFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {/* Lista — Card en móvil / Tabla en desktop */}
      {filtered.length === 0 ? (
        <div
          className="glass rounded-[20px] border border-slate-200/60 dark:border-slate-700/60 py-16 text-center"
          style={{ background: 'var(--sidebar-bg)' }}
        >
          <p className="text-sm text-slate-400">Sin proyectos que coincidan</p>
        </div>
      ) : (
        <>
          <div className="sm:hidden space-y-2">
            {filtered.map((p) => (
              <ProjectCard key={p.id_proyecto} project={p} onEdit={openEdit} />
            ))}
          </div>
          <div className="hidden sm:block">
            <ProjectTable projects={filtered} onEdit={openEdit} />
          </div>
        </>
      )}

      {/* Modal crear / editar */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar proyecto' : 'Nuevo proyecto'}
      >
        <ProjectForm
          form={form}
          fieldErrors={fieldErrors}
          isEditing={!!editingId}
          onPatch={patchForm}
          onSubmit={handleSave}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}
