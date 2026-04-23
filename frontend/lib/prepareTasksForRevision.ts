/**
 * prepareTasksForRevision
 *
 * Sanitiza y valida el array de tareas del parser antes de enviarlo al endpoint
 * /tareas/commit-staging. Garantiza que:
 *  - id_proyecto nunca sea vacío (usa DEFAULT_PROJECT_ID como fallback)
 *  - fecha_entrega siempre sea ISO YYYY-MM-DD válido
 *  - prioridad esté dentro del enum permitido
 *  - tarea_descripcion no esté vacía
 */

export const DEFAULT_PROJECT_ID = '1111';

const VALID_PRIORIDADES = ['Alta', 'Media', 'Baja'] as const;
type Prioridad = (typeof VALID_PRIORIDADES)[number];

export interface RawTask {
  id_proyecto?:        string | null;
  tarea_descripcion:   string;
  responsable_nombre?: string | null;
  responsable_correo?: string | null;
  prioridad?:          string | null;
  fecha_entrega?:      string | null;
}

export interface PreparedTask {
  id_proyecto:        string;
  tarea_descripcion:  string;
  responsable_nombre: string;
  responsable_correo: string;
  prioridad:          Prioridad;
  fecha_entrega:      string; // YYYY-MM-DD
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fallbackDate(offsetDays = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function sanitizeDate(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') return fallbackDate();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return fallbackDate();
  return d.toISOString().slice(0, 10);
}

function sanitizePrioridad(p?: string | null): Prioridad {
  return (VALID_PRIORIDADES as readonly string[]).includes(p ?? '') ? (p as Prioridad) : 'Media';
}

// ── Función principal ─────────────────────────────────────────────────────────

export function prepareTasksForRevision(tasks: RawTask[]): PreparedTask[] {
  if (!Array.isArray(tasks)) {
    throw new TypeError('prepareTasksForRevision: el argumento debe ser un array');
  }
  if (tasks.length === 0) {
    throw new Error('prepareTasksForRevision: el array de tareas está vacío');
  }

  return tasks.map((t, i) => {
    const desc = t.tarea_descripcion?.trim();
    if (!desc) {
      throw new Error(`Tarea en posición ${i + 1} no tiene descripción`);
    }

    return {
      id_proyecto:        t.id_proyecto?.trim() || DEFAULT_PROJECT_ID,
      tarea_descripcion:  desc,
      responsable_nombre: t.responsable_nombre?.trim() ?? '',
      responsable_correo: t.responsable_correo?.trim() ?? '',
      prioridad:          sanitizePrioridad(t.prioridad),
      fecha_entrega:      sanitizeDate(t.fecha_entrega),
    };
  });
}
