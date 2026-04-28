// ─────────────────────────────────────────────────────────────────────────────
// Mock Data — Alzak Flow
// ─────────────────────────────────────────────────────────────────────────────

export type TareaStatus    = 'Pendiente' | 'En Proceso' | 'Completada';
export type TareaPrioridad = 'Alta' | 'Media' | 'Baja';
export type UserRole       = 'superadmin' | 'admin' | 'user';

export interface MockTarea {
  id: number;
  id_proyecto: string;
  nombre_proyecto: string;
  tarea_descripcion: string;
  responsable_nombre: string;
  responsable_correo: string;
  prioridad: TareaPrioridad;
  status: TareaStatus;
  fecha_inicio?: string;
  fecha_entrega: string;
  fecha_finalizacion?: string | null;
  resumen_meeting?: string;
}

export interface MockLogEntry {
  id: number;
  usuario: string;
  correo: string;
  accion: 'Create' | 'Update' | 'Delete' | 'Login' | 'Process' | 'Access';
  modulo: string;
  detalle: string;
  timestamp: string;
}

export interface MockUser {
  correo: string;
  nombre_completo: string;
  role: UserRole;
  activo: boolean;
}

export interface MockProject {
  id_proyecto: string;
  nombre_proyecto: string;
  financiador: string | null;
  empresa: string | null;
  estado: 'Activo' | 'Cerrado';
}

export interface MockNotification {
  id: number;
  tipo: 'asignacion' | 'deadline' | 'nota' | 'sistema' | 'completada';
  titulo: string;
  mensaje: string;
  leido: boolean;
  timestamp: string;
  taskId?: number;
}

// ── Proyectos completos ────────────────────────────────────────────────────────
// Eliminado: los proyectos vienen de la API real vía ProjectStoreContext
export const MOCK_PROJECTS_FULL: MockProject[] = [
  { id_proyecto: 'BAY-001',  nombre_proyecto: 'Estudio Bayer — Fase II',              financiador: 'Bayer',       empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: 'SAN-002',  nombre_proyecto: 'Trial Sanofi — Oncología',             financiador: 'Sanofi',      empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: 'PFZ-003',  nombre_proyecto: 'Pfizer Cardio — Seguimiento',          financiador: 'Pfizer',      empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: 'MSD-004',  nombre_proyecto: 'MSD Vacunas — Análisis',               financiador: 'MSD',         empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '25923',    nombre_proyecto: 'Estudio Clínico Bayer 25923',          financiador: 'Bayer',       empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '2424',     nombre_proyecto: 'Estudio Sanofi 2424',                  financiador: 'Sanofi',      empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: 'EXTERNO-1',nombre_proyecto: 'Proyecto Externo 1',                   financiador: 'Externo',     empresa: null,               estado: 'Activo'  },
  { id_proyecto: '5024',     nombre_proyecto: 'Estudio Bayer 5024',                   financiador: 'Bayer',       empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '6124',     nombre_proyecto: 'Estudio Pfizer 6124',                  financiador: 'Pfizer',      empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: 'EXTERNO-2',nombre_proyecto: 'Proyecto Externo 2',                   financiador: 'Externo',     empresa: null,               estado: 'Activo'  },
  { id_proyecto: '6524',     nombre_proyecto: 'Estudio MSD 6524',                     financiador: 'MSD',         empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '0124',     nombre_proyecto: 'Proyecto Minciencias Ene-2024',        financiador: 'Minciencias', empresa: 'ALZAK Foundation', estado: 'Cerrado' },
  { id_proyecto: '0424',     nombre_proyecto: 'Estudio Pfizer 0424',                  financiador: 'Pfizer',      empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '2924',     nombre_proyecto: 'Estudio Sanofi 2924',                  financiador: 'Sanofi',      empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '3524',     nombre_proyecto: 'Estudio Bayer 3524',                   financiador: 'Bayer',       empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '0325',     nombre_proyecto: 'Proyecto Minciencias Mar-2025',        financiador: 'Minciencias', empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '1121',     nombre_proyecto: 'Estudio Bayer 1121',                   financiador: 'Bayer',       empresa: 'ALZAK Foundation', estado: 'Cerrado' },
  { id_proyecto: '1022',     nombre_proyecto: 'Estudio Sanofi 1022',                  financiador: 'Sanofi',      empresa: 'ALZAK Foundation', estado: 'Cerrado' },
  { id_proyecto: '1522',     nombre_proyecto: 'Estudio Pfizer 1522',                  financiador: 'Pfizer',      empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '1022-1',   nombre_proyecto: 'Estudio Bayer 1022-1 (Extensión)',     financiador: 'Bayer',       empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '1922',     nombre_proyecto: 'Estudio MSD 1922',                     financiador: 'MSD',         empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '2822',     nombre_proyecto: 'Estudio Pfizer 2822',                  financiador: 'Pfizer',      empresa: 'ALZAK Foundation', estado: 'Cerrado' },
  { id_proyecto: '0925',     nombre_proyecto: 'Proyecto Minciencias Sep-2025',        financiador: 'Minciencias', empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '1111',     nombre_proyecto: 'Sin Proyecto / No Identificado',       financiador: null,          empresa: null,               estado: 'Activo'  },
  { id_proyecto: '1125',     nombre_proyecto: 'Estudio Bayer 1125',                   financiador: 'Bayer',       empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '0425',     nombre_proyecto: 'Estudio Pfizer 0425',                  financiador: 'Pfizer',      empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '1525',     nombre_proyecto: 'Estudio Sanofi 1525',                  financiador: 'Sanofi',      empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '2625',     nombre_proyecto: 'Estudio MSD 2625',                     financiador: 'MSD',         empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '6024',     nombre_proyecto: 'Estudio Pfizer 6024',                  financiador: 'Pfizer',      empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '0525',     nombre_proyecto: 'Proyecto Minciencias May-2025',        financiador: 'Minciencias', empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '1625',     nombre_proyecto: 'Estudio Sanofi 1625',                  financiador: 'Sanofi',      empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '2125',     nombre_proyecto: 'Estudio Bayer 2125',                   financiador: 'Bayer',       empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '2225',     nombre_proyecto: 'Estudio MSD 2225',                     financiador: 'MSD',         empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '1025',     nombre_proyecto: 'Proyecto Minciencias Oct-2025',        financiador: 'Minciencias', empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '2025',     nombre_proyecto: 'Estudio Pfizer 2025',                  financiador: 'Pfizer',      empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '1925',     nombre_proyecto: 'Estudio Sanofi 1925',                  financiador: 'Sanofi',      empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '0725',     nombre_proyecto: 'Estudio Bayer 0725',                   financiador: 'Bayer',       empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '3425',     nombre_proyecto: 'Estudio MSD 3425',                     financiador: 'MSD',         empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '4125',     nombre_proyecto: 'Estudio Pfizer 4125',                  financiador: 'Pfizer',      empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '3825',     nombre_proyecto: 'Estudio Sanofi 3825',                  financiador: 'Sanofi',      empresa: 'ALZAK Foundation', estado: 'Activo'  },
  { id_proyecto: '0326',     nombre_proyecto: 'Proyecto Minciencias Mar-2026',        financiador: 'Minciencias', empresa: 'ALZAK Foundation', estado: 'Activo'  },
];

// ── Notificaciones mock ────────────────────────────────────────────────────────
export const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: 1, tipo: 'deadline', leido: false,
    titulo: '⚠️ Deadline urgente',
    mensaje: 'La tarea "Entregar informe preliminar..." vence mañana.',
    timestamp: '2026-04-13T07:00:00Z', taskId: 1,
  },
  {
    id: 2, tipo: 'deadline', leido: false,
    titulo: '⚠️ Deadline hoy',
    mensaje: '"Enviar reporte de seguridad mensual" vence hoy.',
    timestamp: '2026-04-13T07:05:00Z', taskId: 5,
  },
  {
    id: 3, tipo: 'asignacion', leido: false,
    titulo: '📋 Nueva tarea asignada',
    mensaje: 'Se te asignó: "Revisar consentimientos informados" en BAY-001.',
    timestamp: '2026-04-13T09:15:00Z', taskId: 2,
  },
  {
    id: 4, tipo: 'nota', leido: false,
    titulo: '💬 Nueva nota',
    mensaje: 'Alejandra Puerto comentó en la tarea #9 (PFZ-003).',
    timestamp: '2026-04-13T10:30:00Z', taskId: 9,
  },
  {
    id: 5, tipo: 'completada', leido: true,
    titulo: '✅ Tarea completada',
    mensaje: 'Ana Torres marcó como completada: "Actualizar base de datos CTMS".',
    timestamp: '2026-04-13T11:15:00Z', taskId: 3,
  },
  {
    id: 6, tipo: 'sistema', leido: true,
    titulo: '🤖 IA procesó minuta',
    mensaje: 'Minuta de SAN-002 procesada. 2 nuevas tareas creadas.',
    timestamp: '2026-04-13T10:20:00Z',
  },
  {
    id: 7, tipo: 'asignacion', leido: true,
    titulo: '📋 Tarea reasignada',
    mensaje: 'La tarea #8 fue reasignada a Carlos Pérez.',
    timestamp: '2026-04-12T16:00:00Z', taskId: 8,
  },
];


// ── Activity Log ───────────────────────────────────────────────────────────────
export const MOCK_LOGS: MockLogEntry[] = [
  { id: 1,  usuario: 'Carlos Carranza',  correo: 'c.carranza@alzak.org', accion: 'Login',   modulo: 'Auth',          detalle: 'Inicio de sesión exitoso desde 192.168.1.10',           timestamp: '2026-04-13T08:30:00Z' },
  { id: 2,  usuario: 'Alejandra Puerto', correo: 'a.puerto@alzak.org',   accion: 'Login',   modulo: 'Auth',          detalle: 'Inicio de sesión exitoso desde 192.168.1.15',           timestamp: '2026-04-13T08:45:12Z' },
  { id: 3,  usuario: 'Alejandra Puerto', correo: 'a.puerto@alzak.org',   accion: 'Process', modulo: 'Procesador IA', detalle: 'Minuta procesada · BAY-001 · 3 tareas creadas',          timestamp: '2026-04-13T09:15:22Z' },
  { id: 4,  usuario: 'Alejandra Puerto', correo: 'a.puerto@alzak.org',   accion: 'Create',  modulo: 'Tareas',        detalle: 'Nueva tarea: "Entregar informe preliminar"',             timestamp: '2026-04-13T09:15:23Z' },
  { id: 5,  usuario: 'Lina Salcedo',     correo: 'l.salcedo@alzak.org',  accion: 'Login',   modulo: 'Auth',          detalle: 'Inicio de sesión exitoso desde 192.168.1.22',           timestamp: '2026-04-13T09:30:05Z' },
  { id: 6,  usuario: 'Lina Salcedo',     correo: 'l.salcedo@alzak.org',  accion: 'Access',  modulo: 'Tareas',        detalle: 'Accedió a su lista de tareas (6 tareas activas)',        timestamp: '2026-04-13T09:30:18Z' },
  { id: 7,  usuario: 'Carlos Carranza',  correo: 'c.carranza@alzak.org', accion: 'Update',  modulo: 'Tareas',        detalle: 'Tarea #5 → estado cambiado a "En Proceso"',              timestamp: '2026-04-13T10:05:44Z' },
  { id: 8,  usuario: 'Carlos Carranza',  correo: 'c.carranza@alzak.org', accion: 'Process', modulo: 'Procesador IA', detalle: 'Minuta procesada · SAN-002 · 2 tareas creadas',          timestamp: '2026-04-13T10:20:00Z' },
  { id: 9,  usuario: 'Ana Torres',       correo: 'a.torres@alzak.org',   accion: 'Login',   modulo: 'Auth',          detalle: 'Inicio de sesión exitoso desde 192.168.1.30',           timestamp: '2026-04-13T11:00:33Z' },
  { id: 10, usuario: 'Ana Torres',       correo: 'a.torres@alzak.org',   accion: 'Update',  modulo: 'Tareas',        detalle: 'Tarea #3 → estado cambiado a "Completada"',              timestamp: '2026-04-13T11:15:20Z' },
  { id: 11, usuario: 'Carlos Pérez',     correo: 'c.perez@alzak.org',    accion: 'Login',   modulo: 'Auth',          detalle: 'Inicio de sesión exitoso desde 192.168.1.45',           timestamp: '2026-04-13T11:30:00Z' },
  { id: 12, usuario: 'Alejandra Puerto', correo: 'a.puerto@alzak.org',   accion: 'Process', modulo: 'Procesador IA', detalle: 'Minuta procesada · PFZ-003 · 4 tareas creadas',          timestamp: '2026-04-13T12:05:17Z' },
  { id: 13, usuario: 'Carlos Carranza',  correo: 'c.carranza@alzak.org', accion: 'Delete',  modulo: 'Tareas',        detalle: 'Tarea #16 eliminada (duplicado detectado)',              timestamp: '2026-04-13T13:15:44Z' },
  { id: 14, usuario: 'Lina Salcedo',     correo: 'l.salcedo@alzak.org',  accion: 'Update',  modulo: 'Tareas',        detalle: 'Tarea #6 → prioridad cambiada a "Alta"',                 timestamp: '2026-04-13T14:00:08Z' },
  { id: 15, usuario: 'Ana Torres',       correo: 'a.torres@alzak.org',   accion: 'Update',  modulo: 'Tareas',        detalle: 'Tarea #7 → estado cambiado a "Completada"',              timestamp: '2026-04-13T14:30:00Z' },
  { id: 16, usuario: 'Carlos Carranza',  correo: 'c.carranza@alzak.org', accion: 'Process', modulo: 'Procesador IA', detalle: 'Minuta procesada · MSD-004 · 3 tareas creadas',          timestamp: '2026-04-13T15:10:55Z' },
  { id: 17, usuario: 'Carlos Pérez',     correo: 'c.perez@alzak.org',    accion: 'Update',  modulo: 'Tareas',        detalle: 'Tarea #2 → estado cambiado a "En Proceso"',              timestamp: '2026-04-13T15:45:22Z' },
  { id: 18, usuario: 'Alejandra Puerto', correo: 'a.puerto@alzak.org',   accion: 'Create',  modulo: 'Tareas',        detalle: 'Nueva tarea: "Coordinar visita de monitoreo con CRA"',  timestamp: '2026-04-13T16:00:00Z' },
  { id: 19, usuario: 'Lina Salcedo',     correo: 'l.salcedo@alzak.org',  accion: 'Access',  modulo: 'Dashboard',     detalle: 'Accedió al dashboard (sesión activa 45 min)',            timestamp: '2026-04-13T16:30:00Z' },
  { id: 20, usuario: 'Carlos Carranza',  correo: 'c.carranza@alzak.org', accion: 'Access',  modulo: 'Admin / Logs',  detalle: 'Revisó el log de actividad del sistema',                timestamp: '2026-04-13T17:00:00Z' },
];

