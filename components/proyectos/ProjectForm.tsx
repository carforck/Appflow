"use client";

import { Input }  from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  STATUS_LABEL,
  STATUS_COLOR,
  type ProjectStatus,
  type ProjectFormData,
} from '@/schemas/proyecto';

const STATUSES: ProjectStatus[] = ['activo', 'inactivo', 'completado'];

interface ProjectFormProps {
  form:        ProjectFormData;
  fieldErrors: Record<string, string>;
  isEditing:   boolean;
  onPatch:     (patch: Partial<ProjectFormData>) => void;
  onSubmit:    (e: React.FormEvent) => void;
  onCancel:    () => void;
}

export function ProjectForm({
  form, fieldErrors, isEditing, onPatch, onSubmit, onCancel,
}: ProjectFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="px-6 py-5 space-y-4">
      <Input
        label="Código"
        id="id_proyecto"
        value={form.id_proyecto}
        onChange={(e) => onPatch({ id_proyecto: e.target.value })}
        disabled={isEditing}
        placeholder="Ej. BAY-001"
        error={fieldErrors.id_proyecto}
        required
      />

      <Input
        label="Nombre"
        id="nombre"
        value={form.nombre}
        onChange={(e) => onPatch({ nombre: e.target.value })}
        placeholder="Nombre descriptivo del proyecto"
        error={fieldErrors.nombre}
        required
      />

      <Input
        label="Financiador"
        id="financiador"
        value={form.financiador ?? ''}
        onChange={(e) => onPatch({ financiador: e.target.value })}
        placeholder="Ej. Bayer, Pfizer, Minciencias..."
      />

      {/* Selector de estado */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Estado</p>
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPatch({ status: s })}
              className={[
                'flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2',
                form.status === s
                  ? `${STATUS_COLOR[s]} border-transparent ring-2 ring-offset-1 ring-alzak-blue/20`
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300',
              ].join(' ')}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1 py-2">
          Cancelar
        </Button>
        <Button type="submit" variant="primary" className="flex-1 py-2">
          {isEditing ? 'Guardar cambios' : 'Crear proyecto'}
        </Button>
      </div>
    </form>
  );
}
