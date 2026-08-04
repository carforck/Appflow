/**
 * src/controllers/taskController.js
 * Socket.io: emite task_updated / task_created a alzak_global para sincronizar
 * el tablero Kanban en tiempo real. También emite notification_alert a los
 * destinatarios específicos después de insertar en db_notifications.
 */
const pool                  = require('../config/db');
const { queueApprovedTask, sendConsolidatedEmails, sendTaskUpdateEmail } = require('../services/emailService');
const { emitNotifAlert, emitTaskUpdated, emitTaskCreated } = require('../config/socket');
const { logActivity }       = require('../utils/logActivity');

// ── Semana ISO (YYYY-WNN) para etiquetar tareas al entrar al board ────────────
function getISOWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // lun=1 … dom=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // jueves más cercano
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// ── Caché de idempotencia (en memoria, TTL 15 s) ──────────────────────────────
const idempotencyCache = new Map();
const IDEMPOTENCY_TTL  = 30_000;

// ── Debounce para envío consolidado de emails ─────────────────────────────────
// Espera 10 s tras la última aprobación antes de enviar — consolida lotes
let emailDebounceTimer = null;
function scheduleEmailSend() {
  if (emailDebounceTimer) clearTimeout(emailDebounceTimer);
  emailDebounceTimer = setTimeout(() => {
    emailDebounceTimer = null;
    sendConsolidatedEmails()
      .then((r) => { if (r.sent > 0) console.log(`📧 Correos enviados: ${r.sent} destinatario(s)`); })
      .catch((e) => console.error('❌ sendConsolidatedEmails:', e.message));
  }, 10_000);
}

function idempotencyCheck(key) {
  const now = Date.now();
  for (const [k, ts] of idempotencyCache) {
    if (now - ts > IDEMPOTENCY_TTL) idempotencyCache.delete(k);
  }
  if (idempotencyCache.has(key)) return true;
  idempotencyCache.set(key, now);
  return false;
}

async function getTareas(req, res) {
  try {
    const { prioridad, proyecto } = req.query;
    const { email, role }         = req.user;

    const page   = Math.max(1, parseInt(req.query.page  ?? '1',  10));
    const limit  = Math.min(500, Math.max(1, parseInt(req.query.limit ?? '500', 10)));
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        t.id,
        t.id_proyecto,
        COALESCE(p.nombre_proyecto, t.id_proyecto) AS nombre_proyecto,
        t.tarea_descripcion,
        t.responsable_nombre,
        t.responsable_correo,
        t.prioridad,
        t.estado_tarea AS status,
        t.fecha_inicio,
        t.fecha_entrega,
        t.fecha_finalizacion,
        t.semana_carga,
        m.resumen_ejecutivo AS resumen_meeting
      FROM tasks t
      LEFT JOIN meetings  m ON t.id_meeting  = m.id
      LEFT JOIN projects  p ON t.id_proyecto = p.id_proyecto
      WHERE (t.estado_tarea IS NULL OR t.estado_tarea != 'Pendiente Revisión')
    `;
    const params = [];

    if (role === 'user') { query += ' AND t.responsable_correo = ?'; params.push(email); }
    if (prioridad)       { query += ' AND t.prioridad = ?';          params.push(prioridad); }
    if (proyecto)        { query += ' AND t.id_proyecto = ?';        params.push(proyecto); }

    // Tareas activas primero (no Completada), luego por fecha ASC — garantiza que
    // las nuevas tareas activas siempre aparezcan dentro del límite
    query += ` ORDER BY
      CASE WHEN t.estado_tarea = 'Completada' THEN 1 ELSE 0 END ASC,
      t.fecha_entrega ASC,
      t.id DESC
      LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);
    console.log(`📋 GET /tareas → ${rows.length} tareas (page ${page}, ${role}: ${email})`);
    res.json({ status: 'success', total: rows.length, page, limit, hasMore: rows.length === limit, tareas: rows });
  } catch (err) {
    console.error('❌ GET /tareas:', err.message);
    res.status(500).json({ error: 'Error al obtener tareas', detalle: err.message });
  }
}

/**
 * Normaliza los responsables de un body a un array de { correo, nombre }.
 * Soporta el formato nuevo `responsables: [{correo,nombre}]` y el legacy
 * `responsable_correo` / `responsable_nombre` (un solo responsable).
 * Devuelve [] si no hay ninguno (tarea sin asignar).
 */
function normalizeResponsables(body) {
  if (Array.isArray(body.responsables) && body.responsables.length) {
    const vistos = new Set();
    const out = [];
    for (const r of body.responsables) {
      const correo = (r?.correo || r?.responsable_correo || '').trim();
      if (!correo || vistos.has(correo)) continue;   // ignora vacíos y duplicados
      vistos.add(correo);
      out.push({ correo, nombre: (r?.nombre || r?.responsable_nombre || correo) });
    }
    return out;
  }
  if (body.responsable_correo) {
    return [{ correo: body.responsable_correo, nombre: body.responsable_nombre || body.responsable_correo }];
  }
  return [];
}

/**
 * Crea las notificaciones (in-app + auditoría) y encola el correo de asignación
 * para UNA tarea ya insertada. Reutilizado por crearTarea y aprobarRevision.
 * @param {number} taskId
 * @param {{ tarea_descripcion: string, proyNombre: string, prioridad: string, fecha_entrega: any }} info
 * @param {{ correo: string, nombre: string } | null} responsable
 * @param {object} reqUser  req.user
 */
async function notifyAsignacion(taskId, info, responsable, reqUser) {
  try {
    if (responsable?.correo) {
      await pool.query(
        `INSERT INTO db_notifications (tipo, titulo, mensaje, id_tarea, destinatario_correo)
         VALUES ('asignacion', 'Nueva tarea asignada', ?, ?, ?)`,
        [`Se te ha asignado una nueva tarea en el Proyecto "${info.proyNombre}"`, taskId, responsable.correo]
      );
      emitNotifAlert(responsable.correo, {
        tipo:    'asignacion',
        id_tarea: taskId,
        titulo:  'Nueva tarea asignada',
        preview: `${(info.tarea_descripcion || '').slice(0, 100)} — Proyecto: ${info.proyNombre}`,
        autor:   reqUser.nombre ?? reqUser.email,
      });
    }
    await pool.query(
      `INSERT INTO db_notifications (tipo, titulo, mensaje, id_tarea, destinatario_correo)
       VALUES ('auditoria', 'Tarea creada', ?, ?, NULL)`,
      [`${responsable?.nombre || 'Sin asignar'} tiene una nueva tarea en "${info.proyNombre}"`, taskId]
    );
    emitNotifAlert(null, { tipo: 'auditoria', id_tarea: taskId });
  } catch (notifErr) {
    console.warn(`⚠️ Notificación no creada para tarea #${taskId}:`, notifErr.message);
  }

  if (responsable?.correo) {
    queueApprovedTask({
      destinatario_correo: responsable.correo,
      destinatario_nombre: responsable.nombre || responsable.correo,
      id_tarea:          taskId,
      tarea_descripcion: info.tarea_descripcion,
      proyecto_nombre:   info.proyNombre,
      prioridad:         info.prioridad,
      fecha_entrega:     info.fecha_entrega,
    })
      .then(() => scheduleEmailSend())
      .catch((e) => console.error(`⚠️ queueApprovedTask #${taskId}:`, e.message));
  }
}

async function crearTarea(req, res) {
  try {
    const { id_proyecto, tarea_descripcion, prioridad, fecha_entrega, fecha_inicio } = req.body;

    if (!id_proyecto || !tarea_descripcion || !prioridad || !fecha_entrega) {
      return res.status(400).json({ error: 'Faltan campos requeridos: id_proyecto, tarea_descripcion, prioridad, fecha_entrega' });
    }

    const [[proyRow]] = await pool.query('SELECT nombre_proyecto FROM projects WHERE id_proyecto = ?', [id_proyecto]);
    const proyNombre  = proyRow?.nombre_proyecto ?? id_proyecto;

    // fecha_inicio: usa la enviada o la fecha actual si no viene
    const fechaInicioFinal = fecha_inicio || new Date().toISOString().slice(0, 10);

    // Admins/superadmins crean tareas directamente en 'Pendiente' (visible en el board).
    // Solo el procesador de minutas crea en 'Pendiente Revisión'.
    const esAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const estadoInicial = esAdmin ? 'Pendiente' : 'Pendiente Revisión';
    const semana        = esAdmin ? getISOWeek() : null;

    const desc = tarea_descripcion.trim();
    // Una tarea INDEPENDIENTE por cada responsable. Si no hay ninguno → 1 tarea sin asignar.
    const responsables = normalizeResponsables(req.body);
    const targets = responsables.length ? responsables : [null];
    const info = { tarea_descripcion: desc, proyNombre, prioridad, fecha_entrega };

    const ids = [];
    for (const resp of targets) {
      const [result] = await pool.query(
        `INSERT INTO tasks (id_proyecto, tarea_descripcion, responsable_nombre, responsable_correo,
          prioridad, fecha_inicio, fecha_entrega, estado_tarea, semana_carga)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id_proyecto, desc, resp?.nombre || null, resp?.correo || null, prioridad, fechaInicioFinal, fecha_entrega, estadoInicial, semana]
      );
      const taskId = result.insertId;
      ids.push(taskId);
      await notifyAsignacion(taskId, info, resp, req.user);
    }

    emitTaskCreated();

    console.log(`✅ POST /tareas/crear → ${ids.length} tarea(s) [${ids.join(', ')}] proyecto=${id_proyecto}`);
    logActivity({
      correo: req.user.email, nombre: req.user.nombre, role: req.user.role,
      accion: 'Create', modulo: 'Tareas',
      detalle: `Tarea creada en "${proyNombre}" para ${targets.length} responsable(s): ${desc.substring(0, 80)}`,
      ip: req.headers['x-forwarded-for']?.split(',')[0] ?? req.ip,
      entityId: ids[0], entityType: 'tasks',
    });
    res.status(201).json({ status: 'success', ids, count: ids.length, id: ids[0] });
  } catch (err) {
    console.error('❌ POST /tareas/crear:', err.message);
    res.status(500).json({ error: 'Error al crear tarea', detalle: err.message });
  }
}

async function getTareasRevision(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT t.id, t.id_proyecto, t.id_meeting,
        COALESCE(p.nombre_proyecto, t.id_proyecto) AS nombre_proyecto,
        p.empresa, p.financiador, t.tarea_descripcion,
        t.responsable_nombre, t.responsable_correo, t.prioridad,
        t.fecha_inicio, t.fecha_entrega, m.resumen_ejecutivo AS resumen_meeting
      FROM tasks t
      LEFT JOIN meetings  m ON t.id_meeting  = m.id
      LEFT JOIN projects  p ON t.id_proyecto = p.id_proyecto
      WHERE t.estado_tarea = 'Pendiente Revisión'
      ORDER BY t.id DESC
    `);
    console.log(`📋 GET /tareas/revision → ${rows.length} tareas`);
    res.json({ status: 'success', total: rows.length, tareas: rows });
  } catch (err) {
    console.error('❌ GET /tareas/revision:', err.message);
    res.status(500).json({ error: 'Error al obtener tareas en revisión', detalle: err.message });
  }
}

async function actualizarRevision(req, res) {
  try {
    const { id } = req.params;
    const { id_proyecto, tarea_descripcion, responsable_nombre, responsable_correo, prioridad, fecha_inicio, fecha_entrega } = req.body;

    await pool.query(
      `UPDATE tasks SET
         id_proyecto        = COALESCE(?, id_proyecto),
         tarea_descripcion  = COALESCE(?, tarea_descripcion),
         responsable_nombre = COALESCE(?, responsable_nombre),
         responsable_correo = COALESCE(?, responsable_correo),
         prioridad          = COALESCE(?, prioridad),
         fecha_inicio       = COALESCE(?, fecha_inicio),
         fecha_entrega      = COALESCE(?, fecha_entrega)
       WHERE id = ? AND estado_tarea = 'Pendiente Revisión'`,
      [id_proyecto ?? null, tarea_descripcion ?? null, responsable_nombre ?? null,
       responsable_correo ?? null, prioridad ?? null, fecha_inicio ?? null, fecha_entrega ?? null, id]
    );
    res.json({ status: 'updated' });
  } catch (err) {
    console.error('❌ PATCH /tareas/:id/revision:', err.message);
    res.status(500).json({ error: 'Error al actualizar tarea', detalle: err.message });
  }
}

async function aprobarRevision(req, res) {
  try {
    const { id } = req.params;

    const [[task]] = await pool.query(`
      SELECT t.id, t.id_proyecto, t.tarea_descripcion,
             t.responsable_nombre, t.responsable_correo,
             t.prioridad, t.fecha_inicio, t.fecha_entrega,
             COALESCE(p.nombre_proyecto, t.id_proyecto) AS nombre_proyecto
      FROM tasks t
      LEFT JOIN projects p ON t.id_proyecto = p.id_proyecto
      WHERE t.id = ? AND t.estado_tarea = 'Pendiente Revisión'
    `, [id]);

    if (!task) return res.status(404).json({ error: 'Tarea no encontrada o ya procesada' });

    // Responsables a los que se reparte: los del body (reparto explícito) o
    // el que ya tenía la tarea. Cada uno recibe una tarea INDEPENDIENTE.
    const responsablesBody = normalizeResponsables(req.body);
    const responsables = responsablesBody.length
      ? responsablesBody
      : (task.responsable_correo
          ? [{ correo: task.responsable_correo, nombre: task.responsable_nombre }]
          : [null]);

    const semana = getISOWeek();
    const info   = {
      tarea_descripcion: task.tarea_descripcion,
      proyNombre:        task.nombre_proyecto,
      prioridad:         task.prioridad,
      fecha_entrega:     task.fecha_entrega,
    };
    const fechaInicio = task.fecha_inicio ?? new Date().toISOString().slice(0, 10);

    // 1) La fila original se aprueba y queda para el primer responsable.
    const primero = responsables[0];
    await pool.query(
      `UPDATE tasks SET estado_tarea = 'Pendiente', semana_carga = ?,
         responsable_nombre = ?, responsable_correo = ?
       WHERE id = ? AND estado_tarea = 'Pendiente Revisión'`,
      [semana, primero?.nombre || null, primero?.correo || null, id]
    );
    const ids = [task.id];
    await notifyAsignacion(task.id, info, primero, req.user);

    // 2) Responsables adicionales → tareas clonadas independientes en 'Pendiente'.
    for (let i = 1; i < responsables.length; i++) {
      const resp = responsables[i];
      const [r] = await pool.query(
        `INSERT INTO tasks (id_proyecto, tarea_descripcion, responsable_nombre, responsable_correo,
          prioridad, fecha_inicio, fecha_entrega, estado_tarea, semana_carga)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?)`,
        [task.id_proyecto, task.tarea_descripcion, resp?.nombre || null, resp?.correo || null,
         task.prioridad, fechaInicio, task.fecha_entrega, semana]
      );
      ids.push(r.insertId);
      await notifyAsignacion(r.insertId, info, resp, req.user);
    }

    // Tablero: las tareas aparecen como nuevas (pasaron de Revisión a Pendiente)
    emitTaskCreated();

    console.log(`✅ Tarea #${id} aprobada → ${ids.length} tarea(s) [${ids.join(', ')}]`);
    res.json({ status: 'approved', ids, count: ids.length });
  } catch (err) {
    console.error('❌ PATCH /tareas/:id/aprobar:', err.message);
    res.status(500).json({ error: 'Error al aprobar tarea', detalle: err.message });
  }
}

async function rechazarRevision(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT estado_tarea FROM tasks WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
    await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    console.log(`🗑️ Tarea #${id} eliminada (estado previo: ${rows[0].estado_tarea})`);
    emitTaskCreated();
    res.json({ status: 'deleted' });
  } catch (err) {
    console.error('❌ DELETE /tareas/:id:', err.message);
    res.status(500).json({ error: 'Error al eliminar tarea', detalle: err.message });
  }
}

async function crearTareaRevision(req, res) {
  const {
    id_proyecto,
    tarea_descripcion,
    prioridad    = 'Media',
    fecha_inicio,
    fecha_entrega,
  } = req.body;

  if (!tarea_descripcion?.trim()) {
    return res.status(400).json({ error: 'La descripción de la tarea es requerida' });
  }

  const VALID_PRIO = ['Alta', 'Media', 'Baja'];
  const prioFinal  = VALID_PRIO.includes(prioridad) ? prioridad : 'Media';
  const fechaFinal = fecha_entrega || new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const inicioFinal = fecha_inicio || new Date().toISOString().slice(0, 10);
  const desc        = tarea_descripcion.trim();

  // Una fila de revisión INDEPENDIENTE por responsable. Sin asignar → 1 fila.
  const responsables = normalizeResponsables(req.body);
  const targets = responsables.length ? responsables : [null];

  try {
    const ids = [];
    for (const resp of targets) {
      const [result] = await pool.query(
        `INSERT INTO tasks
           (id_proyecto, tarea_descripcion, responsable_nombre, responsable_correo,
            prioridad, estado_tarea, fecha_inicio, fecha_entrega)
         VALUES (?, ?, ?, ?, ?, 'Pendiente Revisión', ?, ?)`,
        [id_proyecto || '1111', desc, resp?.nombre || null, resp?.correo || null, prioFinal, inicioFinal, fechaFinal]
      );
      ids.push(result.insertId);
    }
    emitTaskCreated();
    console.log(`📝 Tarea manual en revisión: ${ids.length} fila(s) [${ids.join(', ')}] por ${req.user.email}`);
    res.status(201).json({ status: 'created', ids, count: ids.length, id: ids[0] });
  } catch (err) {
    console.error('❌ POST /tareas/revision:', err.message);
    res.status(500).json({ error: 'Error al crear tarea', detalle: err.message });
  }
}

const DEFAULT_PROJECT_ID = '1111';

async function commitStaging(req, res) {
  const { id_proyecto, resumen, texto, tareas = [], session_key } = req.body;
  const batchProject = (typeof id_proyecto === 'string' && id_proyecto.trim()) ? id_proyecto.trim() : DEFAULT_PROJECT_ID;

  if (!Array.isArray(tareas) || tareas.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos una tarea en el array tareas[]' });
  }

  // Capa 1: caché en memoria (30 s) — bloquea retransmisiones rápidas en el mismo proceso
  if (session_key && idempotencyCheck(session_key)) {
    console.warn(`⚠️ commit-staging duplicado (caché) — session_key=${session_key}`);
    return res.status(409).json({ error: 'Solicitud duplicada. Las tareas ya fueron registradas.' });
  }

  try {
    const [[proyRow]] = await pool.query('SELECT nombre_proyecto FROM projects WHERE id_proyecto = ?', [batchProject]);
    const proyNombre  = proyRow?.nombre_proyecto ?? batchProject;

    // Capa 2: verificación en BD — protege ante reinicios del proceso o multi-instancia
    if (session_key) {
      const [[existing]] = await pool.query(
        'SELECT id FROM meetings WHERE session_key = ?', [session_key]
      );
      if (existing) {
        console.warn(`⚠️ commit-staging duplicado (DB) — session_key=${session_key} meetingId=${existing.id}`);
        return res.status(409).json({ error: 'Solicitud duplicada. Las tareas ya fueron registradas.', meetingId: existing.id });
      }
    }

    const [resMeeting] = await pool.query(
      'INSERT INTO meetings (session_key, id_proyecto, resumen_ejecutivo, texto_original) VALUES (?, ?, ?, ?)',
      [session_key || null, batchProject, resumen || `Sesión procesador — ${new Date().toLocaleDateString('es-ES')}`, texto || '']
    );
    const meetingId = resMeeting.insertId;

    const VALID_PRIORIDADES = ['Alta', 'Media', 'Baja'];
    const taskIds = [];

    for (const t of tareas) {
      const taskProject = (typeof t.id_proyecto === 'string' && t.id_proyecto.trim()) ? t.id_proyecto.trim() : batchProject;
      const fechaRaw    = t.fecha_entrega;
      const fechaDate   = fechaRaw ? new Date(fechaRaw) : null;
      const fecha       = (fechaDate && !isNaN(fechaDate.getTime()))
        ? fechaDate.toISOString().slice(0, 10)
        : (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();

      const fechaInicioRevision = new Date().toISOString().slice(0, 10);

      const [res2] = await pool.query(
        `INSERT INTO tasks (id_meeting, id_proyecto, tarea_descripcion, responsable_nombre,
          responsable_correo, prioridad, fecha_inicio, fecha_entrega, estado_tarea)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente Revisión')`,
        [meetingId, taskProject, (t.tarea_descripcion ?? '').trim() || '(sin descripción)',
         t.responsable_nombre || null, t.responsable_correo || null,
         VALID_PRIORIDADES.includes(t.prioridad) ? t.prioridad : 'Media',
         fechaInicioRevision, fecha]
      );
      taskIds.push(res2.insertId);
    }

    emitTaskCreated(); // Alerta al board de revisión en tiempo real
    emitNotifAlert(null, { tipo: 'ingesta' });

    console.log(`✅ commit-staging → meetingId=${meetingId} tareas=${taskIds.length}`);
    res.status(201).json({ status: 'committed', meetingId, proyecto: id_proyecto, tareas_creadas: taskIds.length, tarea_ids: taskIds });
  } catch (err) {
    console.error('❌ POST /tareas/commit-staging:', err.message);
    res.status(500).json({ error: 'Error al confirmar staging', detalle: err.message });
  }
}

async function updateTask(req, res) {
  try {
    const { id } = req.params;
    const {
      prioridad, responsable_nombre, responsable_correo, fecha_inicio, fecha_entrega,
      id_proyecto, tarea_descripcion, estado_tarea,
    } = req.body;

    // Leer estado previo para calcular diff y obtener correo del responsable
    const [[prev]] = await pool.query(
      'SELECT tarea_descripcion, prioridad, responsable_nombre, responsable_correo, fecha_inicio, fecha_entrega, id_proyecto, estado_tarea FROM tasks WHERE id = ?',
      [id]
    );
    if (!prev) return res.status(404).json({ error: 'Tarea no encontrada' });

    let fechaFinSQL = '';
    if (estado_tarea === 'Completada')  fechaFinSQL = ', fecha_finalizacion = NOW()';
    else if (estado_tarea != null)      fechaFinSQL = ', fecha_finalizacion = NULL';

    const [result] = await pool.query(
      `UPDATE tasks SET
         prioridad          = COALESCE(?, prioridad),
         responsable_nombre = COALESCE(?, responsable_nombre),
         responsable_correo = COALESCE(?, responsable_correo),
         fecha_inicio       = COALESCE(?, fecha_inicio),
         fecha_entrega      = COALESCE(?, fecha_entrega),
         id_proyecto        = COALESCE(?, id_proyecto),
         tarea_descripcion  = COALESCE(?, tarea_descripcion),
         estado_tarea       = COALESCE(?, estado_tarea)
         ${fechaFinSQL}
       WHERE id = ? AND estado_tarea != 'Pendiente Revisión'`,
      [
        prioridad ?? null, responsable_nombre ?? null, responsable_correo ?? null,
        fecha_inicio ?? null, fecha_entrega ?? null,
        id_proyecto ?? null, tarea_descripcion ?? null, estado_tarea ?? null,
        id,
      ]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Tarea no encontrada o en revisión' });

    emitTaskUpdated({
      id: Number(id),
      ...(prioridad          ? { prioridad }           : {}),
      ...(fecha_entrega      ? { fecha_entrega }       : {}),
      ...(responsable_nombre ? { responsable_nombre }  : {}),
      ...(responsable_correo ? { responsable_correo }  : {}),
      ...(id_proyecto        ? { id_proyecto }         : {}),
      ...(tarea_descripcion  ? { tarea_descripcion }   : {}),
      ...(estado_tarea       ? { status: estado_tarea }: {}),
    });

    // Notificar al nuevo responsable si cambió
    if (responsable_correo && responsable_correo !== prev.responsable_correo) {
      const [[projRow]] = await pool.query(
        `SELECT COALESCE(p.nombre_proyecto, t.id_proyecto) AS nombre_proyecto
         FROM tasks t LEFT JOIN projects p ON t.id_proyecto = p.id_proyecto
         WHERE t.id = ?`, [id]
      );
      const proyNombre = projRow?.nombre_proyecto ?? '';
      pool.query(
        `INSERT INTO db_notifications (tipo, titulo, mensaje, id_tarea, destinatario_correo)
         VALUES ('asignacion', 'Tarea asignada', ?, ?, ?)`,
        [`Se te ha asignado la tarea en el Proyecto "${proyNombre}"`, Number(id), responsable_correo]
      ).then(() => emitNotifAlert(responsable_correo, {
        tipo:    'asignacion',
        id_tarea: Number(id),
        titulo:  'Tarea asignada',
        preview: (tarea_descripcion ?? prev.tarea_descripcion ?? '').slice(0, 100),
        autor:   req.user.nombre ?? req.user.email,
      })).catch((e) => console.warn(`⚠️ Notif reasignación #${id}:`, e.message));
    }

    // Calcular diff y notificar al responsable
    const DIFF_FIELDS = ['tarea_descripcion', 'prioridad', 'responsable_nombre', 'fecha_inicio', 'fecha_entrega', 'id_proyecto'];
    const incoming    = { tarea_descripcion, prioridad, responsable_nombre, fecha_inicio, fecha_entrega, id_proyecto };
    const changes     = {};
    for (const field of DIFF_FIELDS) {
      const nuevo = incoming[field];
      if (nuevo != null && String(nuevo) !== String(prev[field] ?? '')) {
        changes[field] = { antes: prev[field], despues: nuevo };
      }
    }
    const destCorreo = responsable_correo ?? prev.responsable_correo;
    if (Object.keys(changes).length > 0 && destCorreo) {
      const adminNombre = req.user?.nombre ?? req.user?.email;
      const LABELS = {
        tarea_descripcion: 'Descripción',
        prioridad:         'Prioridad',
        responsable_nombre:'Responsable',
        fecha_inicio:      'Fecha inicio',
        fecha_entrega:     'Fecha entrega',
        id_proyecto:       'Proyecto',
      };
      const changeList = Object.keys(changes).map((f) => LABELS[f] || f).join(', ');
      const msgNotif   = `${adminNombre} actualizó: ${changeList}`;

      // Email al responsable (ya existía)
      sendTaskUpdateEmail({
        correo:      destCorreo,
        nombre:      responsable_nombre ?? prev.responsable_nombre,
        taskId:      id,
        changes,
        adminNombre,
      }).catch((e) => console.error('❌ Email edición tarea:', e.message));

      // Notificación in-app + socket al responsable
      pool.query(
        `INSERT INTO db_notifications (tipo, titulo, mensaje, id_tarea, destinatario_correo)
         VALUES ('actualizacion', 'Tarea actualizada', ?, ?, ?)`,
        [msgNotif, Number(id), destCorreo]
      ).then(() => emitNotifAlert(destCorreo, {
        tipo:    'actualizacion',
        id_tarea: Number(id),
        titulo:  'Tarea actualizada',
        preview: msgNotif,
        autor:   adminNombre,
      })).catch((e) => console.warn(`⚠️ Notif actualización #${id}:`, e.message));
    }

    console.log(`✅ PATCH /tareas/${id} → campos actualizados`);
    res.json({ status: 'updated', id: Number(id) });
  } catch (err) {
    console.error('❌ PATCH /tareas/:id:', err.message);
    res.status(500).json({ error: 'Error al actualizar tarea', detalle: err.message });
  }
}

async function updateTaskStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const VALID = ['Pendiente', 'En Proceso', 'Completada'];
    if (!VALID.includes(status)) {
      return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${VALID.join(', ')}` });
    }

    const fechaSQL = status === 'Completada'
      ? ', fecha_finalizacion = NOW()'
      : ', fecha_finalizacion = NULL';

    const [result] = await pool.query(
      `UPDATE tasks SET estado_tarea = ? ${fechaSQL} WHERE id = ? AND estado_tarea != 'Pendiente Revisión'`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada o en estado Pendiente Revisión' });
    }

    // Leer fecha_finalizacion + datos para notificación
    let fecha_finalizacion = null;
    if (status === 'Completada') {
      const [[row]] = await pool.query(
        `SELECT t.fecha_finalizacion, t.tarea_descripcion, t.responsable_nombre,
                COALESCE(p.nombre_proyecto, t.id_proyecto) AS nombre_proyecto
         FROM tasks t
         LEFT JOIN projects p ON t.id_proyecto = p.id_proyecto
         WHERE t.id = ?`, [id]
      );
      fecha_finalizacion = row?.fecha_finalizacion ?? null;
      if (row) {
        pool.query(
          `INSERT INTO db_notifications (tipo, titulo, mensaje, id_tarea, destinatario_correo)
           VALUES ('completada', 'Tarea completada', ?, ?, NULL)`,
          [`${row.responsable_nombre || req.user.nombre || 'Usuario'} completó una tarea en "${row.nombre_proyecto}"`, Number(id)]
        ).then(() => emitNotifAlert(null, {
          tipo:        'completada',
          id_tarea:    Number(id),
          titulo:      'Tarea completada',
          preview:     row.tarea_descripcion?.slice(0, 100),
          autor:       req.user.nombre ?? req.user.email,
          autor_correo: req.user.email,
        })).catch((e) => console.warn(`⚠️ Notif completada #${id}:`, e.message));
      }
    }

    // Mover la tarjeta en el tablero de todos los clientes conectados
    emitTaskUpdated({ id: Number(id), status, fecha_finalizacion });

    console.log(`✅ PATCH /tareas/${id}/status → ${status}`);
    logActivity({
      correo: req.user.email, nombre: req.user.nombre, role: req.user.role,
      accion: 'Update', modulo: 'Tareas',
      detalle: `Tarea #${id} → estado cambiado a "${status}"`,
      ip: req.headers['x-forwarded-for']?.split(',')[0] ?? req.ip,
      entityId: Number(id), entityType: 'tasks',
    });
    res.json({ status: 'updated', id: Number(id), estado_tarea: status, fecha_finalizacion });
  } catch (err) {
    console.error('❌ PATCH /tareas/:id/status:', err.message);
    res.status(500).json({ error: 'Error al actualizar estado', detalle: err.message });
  }
}

module.exports = {
  getTareas, crearTarea, commitStaging,
  getTareasRevision, crearTareaRevision, actualizarRevision, aprobarRevision, rechazarRevision,
  updateTask, updateTaskStatus,
};
