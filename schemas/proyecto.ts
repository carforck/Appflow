import { z } from 'zod';

// ── Enums — valores reales de la columna `estado` en DigitalOcean ─────────────
export const ProjectStatusEnum = z.enum(['Activo', 'Cerrado']);
export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;

// ── Schema de formulario ───────────────────────────────────────────────────────
export const ProjectFormSchema = z.object({
  id_proyecto:      z.string().min(1, 'El código es requerido'),
  nombre_proyecto:  z.string().min(1, 'El nombre es requerido').max(500, 'Máximo 500 caracteres'),
  financiador:      z.string().max(100, 'Máximo 100 caracteres').optional().default(''),
  empresa:          z.string().max(100, 'Máximo 100 caracteres').optional().default(''),
  estado:           ProjectStatusEnum,
});

export type ProjectFormData = z.infer<typeof ProjectFormSchema>;

// ── Valor vacío del formulario ─────────────────────────────────────────────────
export const EMPTY_FORM: ProjectFormData = {
  id_proyecto:     '',
  nombre_proyecto: '',
  financiador:     '',
  empresa:         '',
  estado:          'Activo',
};

// ── Presentación — única fuente de verdad ─────────────────────────────────────
export const STATUS_LABEL: Record<ProjectStatus, string> = {
  Activo:  'Activo',
  Cerrado: 'Cerrado',
};

export const STATUS_COLOR: Record<ProjectStatus, string> = {
  Activo:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Cerrado: 'bg-slate-100   text-slate-500   dark:bg-slate-700/60   dark:text-slate-400',
};
