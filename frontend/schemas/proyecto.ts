import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────────────────────
export const ProjectStatusEnum = z.enum(['activo', 'inactivo', 'completado']);
export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;

// ── Schema de formulario ───────────────────────────────────────────────────
export const ProjectFormSchema = z.object({
  id_proyecto: z.string().min(1, 'El código es requerido'),
  nombre:      z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres'),
  financiador: z.string().max(200, 'Máximo 200 caracteres').optional().default(''),
  status:      ProjectStatusEnum,
});

export type ProjectFormData = z.infer<typeof ProjectFormSchema>;

// ── Valor vacío del formulario ─────────────────────────────────────────────
export const EMPTY_FORM: ProjectFormData = {
  id_proyecto: '',
  nombre:      '',
  financiador: '',
  status:      'activo',
};

// ── Presentación — única fuente de verdad ─────────────────────────────────
export const STATUS_LABEL: Record<ProjectStatus, string> = {
  activo:     'Activo',
  inactivo:   'Inactivo',
  completado: 'Completado',
};

export const STATUS_COLOR: Record<ProjectStatus, string> = {
  activo:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  inactivo:   'bg-slate-100   text-slate-500   dark:bg-slate-700/60   dark:text-slate-400',
  completado: 'bg-blue-100    text-blue-700    dark:bg-blue-900/30    dark:text-blue-400',
};
