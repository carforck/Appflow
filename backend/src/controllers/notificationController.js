/**
 * src/controllers/notificationController.js
 * Notificaciones internas con RBAC:
 *   - user       → solo sus asignaciones (destinatario_correo = su correo)
 *   - admin/superadmin → audit + ingesta (destinatario_correo IS NULL) + sus propias asignaciones
 */
const pool = require('../config/db');

async function getNotifications(req, res) {
  const { email, role } = req.user;
  try {
    let query, params;

    if (role === 'user') {
      // Investigador: solo sus asignaciones
      query  = `SELECT * FROM db_notifications WHERE destinatario_correo = ? ORDER BY created_at DESC LIMIT 50`;
      params = [email];
    } else {
      // Admin/superadmin: auditoría global + sus propias asignaciones
      query  = `SELECT * FROM db_notifications
                WHERE destinatario_correo IS NULL OR destinatario_correo = ?
                ORDER BY created_at DESC LIMIT 100`;
      params = [email];
    }

    const [rows] = await pool.query(query, params);
    const unread = rows.filter((n) => !n.leido).length;
    console.log(`🔔 GET /notifications → total=${rows.length} unread=${unread} (${role}: ${email})`);
    res.json({ total: rows.length, unread, notifications: rows });
  } catch (err) {
    console.error('❌ GET /api/notifications:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function marcarLeida(req, res) {
  const { id }   = req.params;
  const { email, role } = req.user;
  try {
    // Solo puede marcar sus propias o las globales (admins)
    const condition = role === 'user'
      ? 'WHERE id = ? AND destinatario_correo = ?'
      : 'WHERE id = ?';
    const params = role === 'user' ? [id, email] : [id];
    await pool.query(`UPDATE db_notifications SET leido = 1 ${condition}`, params);
    console.log(`✅ PATCH /notifications/${id}/leer (${role}: ${email})`);
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function marcarTodasLeidas(req, res) {
  const { email, role } = req.user;
  try {
    let result;
    if (role === 'user') {
      [result] = await pool.query(
        `UPDATE db_notifications SET leido = 1 WHERE destinatario_correo = ?`,
        [email]
      );
    } else {
      [result] = await pool.query(
        `UPDATE db_notifications SET leido = 1 WHERE destinatario_correo IS NULL OR destinatario_correo = ?`,
        [email]
      );
    }
    console.log(`✅ PATCH /notifications/leer-todo → ${result.affectedRows} marcadas (${role}: ${email})`);
    res.json({ status: 'ok', updated: result.affectedRows });
  } catch (err) {
    console.error('❌ PATCH /notifications/leer-todo:', err.message);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/notifications/notas-sin-leer
 * Devuelve { [id_tarea]: count } con las notas no leídas por tarea para el usuario actual.
 */
async function getNotasUnread(req, res) {
  const { email, role } = req.user;
  try {
    let query, params;
    if (role === 'user') {
      query  = `SELECT id_tarea, COUNT(*) AS cnt
                FROM db_notifications
                WHERE tipo = 'nota' AND leido = 0 AND destinatario_correo = ?
                GROUP BY id_tarea`;
      params = [email];
    } else {
      query  = `SELECT id_tarea, COUNT(*) AS cnt
                FROM db_notifications
                WHERE tipo = 'nota' AND leido = 0
                  AND (destinatario_correo IS NULL OR destinatario_correo = ?)
                GROUP BY id_tarea`;
      params = [email];
    }
    const [rows] = await pool.query(query, params);
    const result = {};
    for (const r of rows) if (r.id_tarea) result[r.id_tarea] = Number(r.cnt);
    res.json({ unread: result });
  } catch (err) {
    console.error('❌ GET /api/notifications/notas-sin-leer:', err.message);
    res.status(500).json({ error: err.message });
  }
}

/**
 * PATCH /api/notifications/leer-tarea/:taskId
 * Marca como leídas todas las notificaciones tipo 'nota' de una tarea para el usuario actual.
 */
async function marcarLeidasPorTarea(req, res) {
  const { taskId }      = req.params;
  const { email, role } = req.user;
  try {
    let query, params;
    if (role === 'user') {
      query  = `UPDATE db_notifications SET leido = 1
                WHERE tipo = 'nota' AND id_tarea = ? AND destinatario_correo = ? AND leido = 0`;
      params = [taskId, email];
    } else {
      query  = `UPDATE db_notifications SET leido = 1
                WHERE tipo = 'nota' AND id_tarea = ?
                  AND (destinatario_correo IS NULL OR destinatario_correo = ?) AND leido = 0`;
      params = [taskId, email];
    }
    const [result] = await pool.query(query, params);
    res.json({ status: 'ok', updated: result.affectedRows });
  } catch (err) {
    console.error('❌ PATCH /api/notifications/leer-tarea:', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getNotifications, marcarLeida, marcarTodasLeidas, getNotasUnread, marcarLeidasPorTarea };
