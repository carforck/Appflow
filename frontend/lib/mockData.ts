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
  fecha_entrega: string;
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
  nombre: string;
  financiador: string | null;
  status: 'activo' | 'inactivo' | 'completado';
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

// ── Proyectos (lookup rápido para componentes) ─────────────────────────────────
export const MOCK_PROJECTS: Record<string, string> = {
  'BAY-001': 'Estudio Bayer — Fase II',
  'SAN-002': 'Trial Sanofi — Oncología',
  'PFZ-003': 'Pfizer Cardio — Seguimiento',
  'MSD-004': 'MSD Vacunas — Análisis',
  '1111':    'Sin Proyecto / No Identificado',
};

// ── Proyectos completos (37 proyectos) ─────────────────────────────────────────
export const MOCK_PROJECTS_FULL: MockProject[] = [
  { id_proyecto: 'BAY-001',  nombre: 'Estudio Bayer — Fase II',              financiador: 'Bayer',       status: 'activo'     },
  { id_proyecto: 'SAN-002',  nombre: 'Trial Sanofi — Oncología',             financiador: 'Sanofi',      status: 'activo'     },
  { id_proyecto: 'PFZ-003',  nombre: 'Pfizer Cardio — Seguimiento',          financiador: 'Pfizer',      status: 'activo'     },
  { id_proyecto: 'MSD-004',  nombre: 'MSD Vacunas — Análisis',               financiador: 'MSD',         status: 'activo'     },
  { id_proyecto: '25923',    nombre: 'Estudio Clínico Bayer 25923',          financiador: 'Bayer',       status: 'activo'     },
  { id_proyecto: '2424',     nombre: 'Estudio Sanofi 2424',                  financiador: 'Sanofi',      status: 'activo'     },
  { id_proyecto: 'EXTERNO-1',nombre: 'Proyecto Externo 1',                   financiador: 'Externo',     status: 'activo'     },
  { id_proyecto: '5024',     nombre: 'Estudio Bayer 5024',                   financiador: 'Bayer',       status: 'activo'     },
  { id_proyecto: '6124',     nombre: 'Estudio Pfizer 6124',                  financiador: 'Pfizer',      status: 'activo'     },
  { id_proyecto: 'EXTERNO-2',nombre: 'Proyecto Externo 2',                   financiador: 'Externo',     status: 'activo'     },
  { id_proyecto: '6524',     nombre: 'Estudio MSD 6524',                     financiador: 'MSD',         status: 'activo'     },
  { id_proyecto: '0124',     nombre: 'Proyecto Minciencias Ene-2024',        financiador: 'Minciencias', status: 'completado' },
  { id_proyecto: '0424',     nombre: 'Estudio Pfizer 0424',                  financiador: 'Pfizer',      status: 'activo'     },
  { id_proyecto: '2924',     nombre: 'Estudio Sanofi 2924',                  financiador: 'Sanofi',      status: 'activo'     },
  { id_proyecto: '3524',     nombre: 'Estudio Bayer 3524',                   financiador: 'Bayer',       status: 'activo'     },
  { id_proyecto: '0325',     nombre: 'Proyecto Minciencias Mar-2025',        financiador: 'Minciencias', status: 'activo'     },
  { id_proyecto: '1121',     nombre: 'Estudio Bayer 1121',                   financiador: 'Bayer',       status: 'completado' },
  { id_proyecto: '1022',     nombre: 'Estudio Sanofi 1022',                  financiador: 'Sanofi',      status: 'completado' },
  { id_proyecto: '1522',     nombre: 'Estudio Pfizer 1522',                  financiador: 'Pfizer',      status: 'activo'     },
  { id_proyecto: '1022-1',   nombre: 'Estudio Bayer 1022-1 (Extensión)',     financiador: 'Bayer',       status: 'activo'     },
  { id_proyecto: '1922',     nombre: 'Estudio MSD 1922',                     financiador: 'MSD',         status: 'activo'     },
  { id_proyecto: '2822',     nombre: 'Estudio Pfizer 2822',                  financiador: 'Pfizer',      status: 'completado' },
  { id_proyecto: '0925',     nombre: 'Proyecto Minciencias Sep-2025',        financiador: 'Minciencias', status: 'activo'     },
  { id_proyecto: '1111',     nombre: 'Sin Proyecto / No Identificado',       financiador: null,          status: 'activo'     },
  { id_proyecto: '1125',     nombre: 'Estudio Bayer 1125',                   financiador: 'Bayer',       status: 'activo'     },
  { id_proyecto: '0425',     nombre: 'Estudio Pfizer 0425',                  financiador: 'Pfizer',      status: 'activo'     },
  { id_proyecto: '1525',     nombre: 'Estudio Sanofi 1525',                  financiador: 'Sanofi',      status: 'activo'     },
  { id_proyecto: '2625',     nombre: 'Estudio MSD 2625',                     financiador: 'MSD',         status: 'activo'     },
  { id_proyecto: '6024',     nombre: 'Estudio Pfizer 6024',                  financiador: 'Pfizer',      status: 'activo'     },
  { id_proyecto: '0525',     nombre: 'Proyecto Minciencias May-2025',        financiador: 'Minciencias', status: 'activo'     },
  { id_proyecto: '1625',     nombre: 'Estudio Sanofi 1625',                  financiador: 'Sanofi',      status: 'activo'     },
  { id_proyecto: '2125',     nombre: 'Estudio Bayer 2125',                   financiador: 'Bayer',       status: 'activo'     },
  { id_proyecto: '2225',     nombre: 'Estudio MSD 2225',                     financiador: 'MSD',         status: 'activo'     },
  { id_proyecto: '1025',     nombre: 'Proyecto Minciencias Oct-2025',        financiador: 'Minciencias', status: 'activo'     },
  { id_proyecto: '2025',     nombre: 'Estudio Pfizer 2025',                  financiador: 'Pfizer',      status: 'activo'     },
  { id_proyecto: '1925',     nombre: 'Estudio Sanofi 1925',                  financiador: 'Sanofi',      status: 'activo'     },
  { id_proyecto: '0725',     nombre: 'Estudio Bayer 0725',                   financiador: 'Bayer',       status: 'activo'     },
  { id_proyecto: '3425',     nombre: 'Estudio MSD 3425',                     financiador: 'MSD',         status: 'activo'     },
  { id_proyecto: '4125',     nombre: 'Estudio Pfizer 4125',                  financiador: 'Pfizer',      status: 'activo'     },
  { id_proyecto: '3825',     nombre: 'Estudio Sanofi 3825',                  financiador: 'Sanofi',      status: 'activo'     },
  { id_proyecto: '0326',     nombre: 'Proyecto Minciencias Mar-2026',        financiador: 'Minciencias', status: 'activo'     },
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

// ── Tareas ─────────────────────────────────────────────────────────────────────
export const MOCK_TAREAS: MockTarea[] = [
  {
    id: 1, id_proyecto: 'BAY-001', nombre_proyecto: 'Estudio Bayer — Fase II',
    tarea_descripcion: 'Entregar informe preliminar de resultados fase 2 al monitor',
    responsable_nombre: 'Lina Salcedo', responsable_correo: 'l.salcedo@alzak.org',
    prioridad: 'Alta', status: 'Pendiente', fecha_entrega: '2026-04-14',
    resumen_meeting: 'Reunión de seguimiento BAY-001 semana 8. Monitor Bayer solicitó informe preliminar con datos de laboratorio actualizados para revisión de protocolo. Prioridad alta según carta de patrocinador.',
  },
  {
    id: 2, id_proyecto: 'BAY-001', nombre_proyecto: 'Estudio Bayer — Fase II',
    tarea_descripcion: 'Revisar consentimientos informados de los 42 participantes',
    responsable_nombre: 'Carlos Pérez', responsable_correo: 'c.perez@alzak.org',
    prioridad: 'Alta', status: 'En Proceso', fecha_entrega: '2026-04-15',
    resumen_meeting: 'Auditoría interna detectó que 8 consentimientos tienen fecha de firma inconsistente. Se requiere revisión completa de los 42 consentimientos antes de la visita del monitor el 17 de abril.',
  },
  {
    id: 3, id_proyecto: 'BAY-001', nombre_proyecto: 'Estudio Bayer — Fase II',
    tarea_descripcion: 'Actualizar base de datos CTMS con visitas de semana 8',
    responsable_nombre: 'Ana Torres', responsable_correo: 'a.torres@alzak.org',
    prioridad: 'Media', status: 'Completada', fecha_entrega: '2026-04-10',
    resumen_meeting: 'Visitas de semana 8 realizadas con éxito. Se deben ingresar los datos de las 12 visitas al CTMS antes del cierre de ciclo el 10 de abril.',
  },
  {
    id: 4, id_proyecto: 'BAY-001', nombre_proyecto: 'Estudio Bayer — Fase II',
    tarea_descripcion: 'Coordinar visita de monitoreo con CRA Bayer para semana 16',
    responsable_nombre: 'Alejandra Puerto', responsable_correo: 'a.puerto@alzak.org',
    prioridad: 'Media', status: 'Pendiente', fecha_entrega: '2026-04-25',
    resumen_meeting: 'El CRA de Bayer confirmó disponibilidad para la semana 16. Se debe coordinar logística: sala, acceso a registros y agenda de participantes.',
  },
  {
    id: 5, id_proyecto: 'SAN-002', nombre_proyecto: 'Trial Sanofi — Oncología',
    tarea_descripcion: 'Enviar reporte de seguridad mensual al comité de ética',
    responsable_nombre: 'Carlos Carranza', responsable_correo: 'c.carranza@alzak.org',
    prioridad: 'Alta', status: 'En Proceso', fecha_entrega: '2026-04-14',
    resumen_meeting: 'Reunión del comité de seguridad SAN-002. Se reportaron 2 eventos adversos grado 2. Comité de ética requiere el documento antes del 14 de abril.',
  },
  {
    id: 6, id_proyecto: 'SAN-002', nombre_proyecto: 'Trial Sanofi — Oncología',
    tarea_descripcion: 'Programar PET-Scan de seguimiento para pacientes grupo A',
    responsable_nombre: 'Lina Salcedo', responsable_correo: 'l.salcedo@alzak.org',
    prioridad: 'Alta', status: 'Pendiente', fecha_entrega: '2026-04-20',
    resumen_meeting: 'El oncólogo tratante solicitó PET-Scan de seguimiento para los 6 pacientes del grupo A que completaron ciclo 3.',
  },
  {
    id: 7, id_proyecto: 'SAN-002', nombre_proyecto: 'Trial Sanofi — Oncología',
    tarea_descripcion: 'Completar training GCP actualizado en plataforma Veeva',
    responsable_nombre: 'Ana Torres', responsable_correo: 'a.torres@alzak.org',
    prioridad: 'Baja', status: 'Completada', fecha_entrega: '2026-04-08',
    resumen_meeting: 'Sanofi actualizó el módulo GCP en Veeva con nuevas guías ICH E6 R3.',
  },
  {
    id: 8, id_proyecto: 'SAN-002', nombre_proyecto: 'Trial Sanofi — Oncología',
    tarea_descripcion: 'Verificar stock de medicación del estudio en farmacia hospitalaria',
    responsable_nombre: 'Carlos Pérez', responsable_correo: 'c.perez@alzak.org',
    prioridad: 'Media', status: 'En Proceso', fecha_entrega: '2026-04-16',
    resumen_meeting: 'Farmacia reportó que el stock de medicación del estudio está al 30% de capacidad.',
  },
  {
    id: 9, id_proyecto: 'PFZ-003', nombre_proyecto: 'Pfizer Cardio — Seguimiento',
    tarea_descripcion: 'Analizar ECGs de la visita de seguimiento semana 24',
    responsable_nombre: 'Alejandra Puerto', responsable_correo: 'a.puerto@alzak.org',
    prioridad: 'Alta', status: 'Pendiente', fecha_entrega: '2026-04-17',
    resumen_meeting: 'Visita semana 24 PFZ-003 completada con 18/20 participantes. 2 ECGs tienen morfología inusual que requiere lectura doble.',
  },
  {
    id: 10, id_proyecto: 'PFZ-003', nombre_proyecto: 'Pfizer Cardio — Seguimiento',
    tarea_descripcion: 'Actualizar eCRF con datos de laboratorio de marzo',
    responsable_nombre: 'Lina Salcedo', responsable_correo: 'l.salcedo@alzak.org',
    prioridad: 'Media', status: 'Completada', fecha_entrega: '2026-04-09',
    resumen_meeting: 'Laboratorio entregó resultados del ciclo de marzo con 3 días de retraso.',
  },
  {
    id: 11, id_proyecto: 'PFZ-003', nombre_proyecto: 'Pfizer Cardio — Seguimiento',
    tarea_descripcion: 'Preparar presentación de resultados intermedios Q1 2026',
    responsable_nombre: 'Carlos Carranza', responsable_correo: 'c.carranza@alzak.org',
    prioridad: 'Media', status: 'En Proceso', fecha_entrega: '2026-04-22',
    resumen_meeting: 'Pfizer solicitó presentación de resultados intermedios Q1 para el steering committee del 25 de abril.',
  },
  {
    id: 12, id_proyecto: 'MSD-004', nombre_proyecto: 'MSD Vacunas — Análisis',
    tarea_descripcion: 'Consolidar base de datos de inmunogenicidad de 180 sujetos',
    responsable_nombre: 'Ana Torres', responsable_correo: 'a.torres@alzak.org',
    prioridad: 'Alta', status: 'En Proceso', fecha_entrega: '2026-04-19',
    resumen_meeting: 'Análisis de inmunogenicidad a día 28 completado para los 180 sujetos.',
  },
  {
    id: 13, id_proyecto: 'MSD-004', nombre_proyecto: 'MSD Vacunas — Análisis',
    tarea_descripcion: 'Revisar y firmar SAP (Statistical Analysis Plan)',
    responsable_nombre: 'Carlos Carranza', responsable_correo: 'c.carranza@alzak.org',
    prioridad: 'Baja', status: 'Pendiente', fecha_entrega: '2026-04-30',
    resumen_meeting: 'MSD envió versión 2.1 del SAP con cambios en los endpoints secundarios.',
  },
  {
    id: 14, id_proyecto: 'MSD-004', nombre_proyecto: 'MSD Vacunas — Análisis',
    tarea_descripcion: 'Archivar documentación de SUSAR #MSD-006',
    responsable_nombre: 'Carlos Pérez', responsable_correo: 'c.perez@alzak.org',
    prioridad: 'Baja', status: 'Completada', fecha_entrega: '2026-04-07',
    resumen_meeting: 'SUSAR #MSD-006 resuelto como no relacionado con el producto en investigación.',
  },
  {
    id: 15, id_proyecto: 'MSD-004', nombre_proyecto: 'MSD Vacunas — Análisis',
    tarea_descripcion: 'Enviar datos de temperatura de neveras al sponsor MSD',
    responsable_nombre: 'Lina Salcedo', responsable_correo: 'l.salcedo@alzak.org',
    prioridad: 'Media', status: 'Completada', fecha_entrega: '2026-04-11',
    resumen_meeting: 'Revisión de cadena de frío mensual. MSD requiere los registros de temperatura.',
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

// ── Usuarios ───────────────────────────────────────────────────────────────────
export const MOCK_USERS: MockUser[] = [
  { correo: 'c.carranza@alzak.org',  nombre_completo: 'Carlos Carranza',       role: 'superadmin', activo: true  },
  { correo: 'a.puerto@alzak.org',    nombre_completo: 'Alejandra Puerto',      role: 'admin',      activo: true  },
  { correo: 'am.lozano@alzak.org',   nombre_completo: 'Ana Milena Lozano',     role: 'user',       activo: true  },
  { correo: 'd.torres@alzak.org',    nombre_completo: 'Daniela Torres',        role: 'user',       activo: true  },
  { correo: 'f.chaparro@alzak.org',  nombre_completo: 'Faiber Chaparro',       role: 'user',       activo: true  },
  { correo: 'f.salcedo@alzak.org',   nombre_completo: 'Fernando Salcedo',      role: 'user',       activo: true  },
  { correo: 'g.bossa@alzak.org',     nombre_completo: 'Gonzalo Bossa',         role: 'user',       activo: true  },
  { correo: 'j.zakzuk@alzak.org',    nombre_completo: 'Josefina Zakzuk',       role: 'user',       activo: true  },
  { correo: 'k.diaz@alzak.org',      nombre_completo: 'Kevin Díaz',            role: 'user',       activo: true  },
  { correo: 'l.salcedo@alzak.org',   nombre_completo: 'Lina Salcedo',          role: 'user',       activo: true  },
  { correo: 'l.moyano@alzak.org',    nombre_completo: 'Lina Moyano',           role: 'user',       activo: true  },
  { correo: 'm.angeles@alzak.org',   nombre_completo: 'María de los Ángeles',  role: 'user',       activo: false },
  { correo: 'nj.alvis@alzak.org',    nombre_completo: 'Nelson José Alvis',     role: 'user',       activo: true  },
  { correo: 'nr.alvis@alzak.org',    nombre_completo: 'Nelson Rafael Alvis',   role: 'user',       activo: true  },
  { correo: 'p.pinzon@alzak.org',    nombre_completo: 'Paula Pinzón',          role: 'user',       activo: true  },
  { correo: 'r.barroso@alzak.org',   nombre_completo: 'Rosmery Barroso',       role: 'user',       activo: false },
];
