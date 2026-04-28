/**
 * src/controllers/taskController.js
 * Socket.io: emite task_updated / task_created a alzak_global para sincronizar
 * el tablero Kanban en tiempo real. También emite notification_alert a los
 * destinatarios específicos después de insertar en db_notifications.
 */
const pool                  = require('../config/db');
const { queueApprovedTask } = require('../services/emailService');
const { emitNotifAlert, emitTaskUpdated, emitTaskCreated } = require('../config/socket');

// ── Caché de idempotencia (en memoria, TTL 15 s) ──────────────────────────────
const idempotencyCache = new Map();
const IDEMPOTENCY_TTL  = 30_000;

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
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '100', 10)));
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

    query += ' ORDER BY t.fecha_entrega ASC, t.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);
    console.log(`📋 GET /tareas → ${rows.length} tareas (page ${page}, ${role}: ${email})`);
    res.json({ status: 'success', total: rows.length, page, limit, hasMore: rows.length === limit, tareas: rows });
  } catch (err) {
    console.error('❌ GET /tareas:', err.message);
    res.status(500).json({ error: 'Error al obtener tareas', detalle: err.message });
  }
}

async function crearTarea(req, res) {
  try {
    const { id_proyecto, tarea_descripcion, responsable_nombre, responsable_correo, prioridad, fecha_entrega } = req.body;

    if (!id_proyecto || !tarea_descripcion || !prioridad || !fecha_entrega) {
      return res.status(400).json({ error: 'Faltan campos requeridos: id_proyecto, tarea_descripcion, prioridad, fecha_entrega' });
    }

    const [[proyRow]] = await pool.query('SELECT nombre_proyecto FROM projects WHERE id_proyecto = ?', [id_proyecto]);
    const proyNombre  = proyRow?.nombre_proyecto ?? id_proyecto;

    const [result] = await pool.query(
      `INSERT INTO tasks (id_proyecto, tarea_descripcion, responsable_nombre, responsable_correo,
        prioridad, fecha_entrega, estado_tarea)
       VALUES (?, ?, ?, ?, ?, ?, 'Pendiente Revisión')`,
      [id_proyecto, tarea_descripcion.trim(), responsable_nombre || null, responsable_correo || null, prioridad, fecha_entrega]
    );
    const taskId = result.insertId;

    // Notificaciones + alertas en tiempo real
    try {
      if (responsable_correo) {
        await pool.query(
          `INSERT INTO db_notifications (tipo, titulo, mensaje, id_tarea, destinatario_correo)
           VALUES ('asignacion', 'Nueva tarea asignada', ?, ?, ?)`,
          [`Se te ha asignado una nueva tarea en el Proyecto "${proyNombre}"`, taskId, responsable_correo]
        );
        emitNotifAlert(responsable_correo, { tipo: 'asignacion', id_tarea: taskId });
      }
      await pool.query(
        `INSERT INTO db_notifications (tipo, titulo, mensaje, id_tarea, destinatario_correo)
         VALUES ('auditoria', 'Tarea creada', ?, ?, NULL)`,
        [`${responsable_nombre || 'Sin asignar'} tiene una nueva tarea en "${proyNombre}"`, taskId]
      );
      emitNotifAlert(null, { tipo: 'auditoria', id_tarea: taskId });
    } catch (notifErr) {
      console.warn(`⚠️ Notificación no creada para tarea #${taskId}:`, notifErr.message);
    }

    // La tarea nace en Revisión — el board la verá cuando se apruebe (task_created)
    emitTaskCreated();

    console.log(`✅ POST /tareas/crear → id=${taskId} proyecto=${id_proyecto}`);
    res.status(201).json({ status: 'success', id: taskId });
  } catch (err) {
    console.error('❌ POST /tareas/crear:', err.message);
    res.status(500).json({ error: 'Error al crear tarea', detalle: err.message });
  }
}

async function getTareasRevision(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT t.id, t.id_proyecto,
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
             t.prioridad, t.fecha_entrega,
             COALESCE(p.nombre_proyecto, t.id_proyecto) AS nombre_proyecto
      FROM tasks t
      LEFT JOIN projects p ON t.id_proyecto = p.id_proyecto
      WHERE t.id = ? AND t.estado_tarea = 'Pendiente Revisión'
    `, [id]);

    if (!task) return res.status(404).json({ error: 'Tarea no encontrada o ya procesada' });

    await pool.query(
      `UPDATE tasks SET estado_tarea = 'Pendiente' WHERE id = ? AND estado_tarea = 'Pendiente Revisión'`,
      [id]
    );
    console.log(`✅ Tarea #${id} aprobada → Pendiente`);

    // Notificaciones + alertas socket
    const notifPromises = [];
    if (task.responsable_correo) {
      notifPromises.push(pool.query(
        `INSERT INTO db_notifications (tipo, titulo, mensaje, id_tarea, destinatario_correo)
         VALUES ('asignacion', 'Nueva tarea asignada', ?, ?, ?)`,
        [`Se te ha asignado una nueva tarea en el Proyecto "${task.nombre_proyecto}"`, task.id, task.responsable_correo]
      ).then(() => emitNotifAlert(task.responsable_correo, { tipo: 'asignacion', id_tarea: task.id })));
    }
    notifPromises.push(pool.query(
      `INSERT INTO db_notifications (tipo, titulo, mensaje, id_tarea, destinatario_correo)
       VALUES ('auditoria', 'Tarea aprobada', ?, ?, NULL)`,
      [`${task.responsable_nombre || 'Sin asignar'} tiene una nueva tarea en "${task.nombre_proyecto}"`, task.id]
    ).then(() => emitNotifAlert(null, { tipo: 'auditoria', id_tarea: task.id })));

    Promise.all(notifPromises).catch((e) => console.warn(`⚠️ Notif aprobar #${id}:`, e.message));

    // Tablero: la tarea aparece como nueva (pasó de Revisión a Pendiente)
    emitTaskCreated();

    if (task.responsable_correo) {
      queueApprovedTask({
        destinatario_correo: task.responsable_correo,
        destinatario_nombre: task.responsable_nombre,
        id_tarea:          task.id,
        tarea_descripcion: task.tarea_descripcion,
        proyecto_nombre:   task.nombre_proyecto,
        prioridad:         task.prioridad,
        fecha_entrega:     task.fecha_entrega,
      }).catch((e) => console.error(`⚠️ queueApprovedTask #${id}:`, e.message));
    }

    res.json({ status: 'approved' });
  } catch (err) {
    console.error('❌ PATCH /tareas/:id/aprobar:', err.message);
    res.status(500).json({ error: 'Error al aprobar tarea', detalle: err.message });
  }
}

async function rechazarRevision(req, res) {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM tasks WHERE id = ? AND estado_tarea = 'Pendiente Revisión'`, [id]);
    console.log(`🗑️ Tarea #${id} rechazada y eliminada`);
    emitTaskCreated(); // Fuerza refresh de la lista de revisión en todos los clientes
    res.json({ status: 'deleted' });
  } catch (err) {
    console.error('❌ DELETE /tareas/:id:', err.message);
    res.status(500).json({ error: 'Error al rechazar tarea', detalle: err.message });
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

      const [res2] = await pool.query(
        `INSERT INTO tasks (id_meeting, id_proyecto, tarea_descripcion, responsable_nombre,
          responsable_correo, prioridad, fecha_entrega, estado_tarea)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente Revisión')`,
        [meetingId, taskProject, (t.tarea_descripcion ?? '').trim() || '(sin descripción)',
         t.responsable_nombre || null, t.responsable_correo || null,
         VALID_PRIORIDADES.includes(t.prioridad) ? t.prioridad : 'Media', fecha]
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
    const { prioridad, responsable_nombre, responsable_correo, fecha_inicio, fecha_entrega } = req.body;

    const [result] = await pool.query(
      `UPDATE tasks SET
         prioridad          = COALESCE(?, prioridad),
         responsable_nombre = COALESCE(?, responsable_nombre),
         responsable_correo = COALESCE(?, responsable_correo),
         fecha_inicio       = COALESCE(?, fecha_inicio),
         fecha_entrega      = COALESCE(?, fecha_entrega)
       WHERE id = ? AND estado_tarea != 'Pendiente Revisión'`,
      [prioridad ?? null, responsable_nombre ?? null, responsable_correo ?? null,
       fecha_inicio ?? null, fecha_entrega ?? null, id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Tarea no encontrada o en revisión' });

    // Sincronizar tablero en tiempo real (campos que el board muestra)
    emitTaskUpdated({
      id:                 Number(id),
      ...(prioridad       ? { prioridad }       : {}),
      ...(fecha_entrega   ? { fecha_entrega }   : {}),
      ...(responsable_nombre ? { responsable_nombre } : {}),
      ...(responsable_correo ? { responsable_correo } : {}),
    });

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

    // Leer fecha_finalizacion para incluirla en el evento socket
    let fecha_finalizacion = null;
    if (status === 'Completada') {
      const [[row]] = await pool.query('SELECT fecha_finalizacion FROM tasks WHERE id = ?', [id]);
      fecha_finalizacion = row?.fecha_finalizacion ?? null;
    }

    // Mover la tarjeta en el tablero de todos los clientes conectados
    emitTaskUpdated({ id: Number(id), status, fecha_finalizacion });

    console.log(`✅ PATCH /tareas/${id}/status → ${status}`);
    res.json({ status: 'updated', id: Number(id), estado_tarea: status, fecha_finalizacion });
  } catch (err) {
    console.error('❌ PATCH /tareas/:id/status:', err.message);
    res.status(500).json({ error: 'Error al actualizar estado', detalle: err.message });
  }
}

module.exports = {
  getTareas, crearTarea, commitStaging,
  getTareasRevision, actualizarRevision, aprobarRevision, rechazarRevision,
  updateTask, updateTaskStatus,
};
