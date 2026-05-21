/**
 * src/controllers/notificationController.js
 *
 * Notificaciones internas con RBAC:
 *   - user              → solo filas con destinatario_correo = su email
 *   - admin/superadmin  → filas globales (destinatario_correo IS NULL) + sus privadas
 *
 * Estado de lectura per-usuario para notificaciones globales:
 *   - Notificaciones privadas  (destinatario_correo = email) → campo `leido` en la fila
 *   - Notificaciones globales  (destinatario_correo IS NULL) → tabla `notification_reads`
 *     Así Admin A marcar como leída no afecta el badge de Admin B.
 */
const pool = require('../config/db');

// ── Helper: ¿la notificación fue leída por este usuario? ──────────────────────
// Para globales usa notification_reads; para privadas usa el campo leido de la fila.
// La query principal ya resuelve esto via LEFT JOIN — esta función queda como doc.

// ── GET /api/notifications ────────────────────────────────────────────────────
async function getNotifications(req, res) {
  const { email, role } = req.user;
  try {
    let rows;

    if (role === 'user') {
      [rows] = await pool.query(
        `SELECT id, tipo, titulo, mensaje, leido, id_meeting, id_tarea,
                destinatario_correo, created_at
         FROM db_notifications
         WHERE destinatario_correo = ?
         ORDER BY created_at DESC LIMIT 50`,
        [email],
      );
    } else {
      // Para globales: leido = 1 si existe una fila en notification_reads para este usuario
      // Para privadas: leido sigue siendo el campo de la fila
      [rows] = await pool.query(
        `SELECT
           n.id, n.tipo, n.titulo, n.mensaje,
           CASE
             WHEN n.destinatario_correo IS NULL
               THEN IF(nr.user_email IS NOT NULL, 1, 0)
             ELSE n.leido
           END AS leido,
           n.id_meeting, n.id_tarea, n.destinatario_correo, n.created_at
         FROM db_notifications n
         LEFT JOIN notification_reads nr
           ON nr.id_notification = n.id AND nr.user_email = ?
         WHERE n.destinatario_correo IS NULL OR n.destinatario_correo = ?
         ORDER BY n.created_at DESC LIMIT 100`,
        [email, email],
      );
    }

    const unread = rows.filter((n) => n.leido === 0).length;
    console.log(`🔔 GET /notifications → total=${rows.length} unread=${unread} (${role}: ${email})`);
    res.json({ total: rows.length, unread, notifications: rows });
  } catch (err) {
    console.error('❌ GET /api/notifications:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ── PATCH /api/notifications/:id/leer ────────────────────────────────────────
async function marcarLeida(req, res) {
  const { id }          = req.params;
  const { email, role } = req.user;
  try {
    if (role === 'user') {
      await pool.query(
        `UPDATE db_notifications SET leido = 1 WHERE id = ? AND destinatario_correo = ?`,
        [id, email],
      );
    } else {
      // Verificar si es global o privada
      const [[notif]] = await pool.query(
        `SELECT destinatario_correo FROM db_notifications WHERE id = ?`, [id],
      );
      if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' });

      if (notif.destinatario_correo === null) {
        // Global → registro per-usuario en junction table
        await pool.query(
          `INSERT IGNORE INTO notification_reads (id_notification, user_email) VALUES (?, ?)`,
          [id, email],
        );
      } else {
        // Privada → campo leido en la fila
        await pool.query(
          `UPDATE db_notifications SET leido = 1 WHERE id = ?`, [id],
        );
      }
    }
    console.log(`✅ PATCH /notifications/${id}/leer (${role}: ${email})`);
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('❌ PATCH /notifications/:id/leer:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ── PATCH /api/notifications/leer-todo ───────────────────────────────────────
async function marcarTodasLeidas(req, res) {
  const { email, role } = req.user;
  try {
    let updated = 0;

    if (role === 'user') {
      const [result] = await pool.query(
        `UPDATE db_notifications SET leido = 1 WHERE destinatario_correo = ? AND leido = 0`,
        [email],
      );
      updated = result.affectedRows;
    } else {
      // Globales → insertar en notification_reads todas las aún no leídas por este usuario
      const [r1] = await pool.query(
        `INSERT IGNORE INTO notification_reads (id_notification, user_email)
         SELECT n.id, ?
         FROM db_notifications n
         WHERE n.destinatario_correo IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM notification_reads nr
             WHERE nr.id_notification = n.id AND nr.user_email = ?
           )`,
        [email, email],
      );
      // Privadas → campo leido
      const [r2] = await pool.query(
        `UPDATE db_notifications SET leido = 1
         WHERE destinatario_correo = ? AND leido = 0`,
        [email],
      );
      updated = r1.affectedRows + r2.affectedRows;
    }

    console.log(`✅ PATCH /notifications/leer-todo → ${updated} marcadas (${role}: ${email})`);
    res.json({ status: 'ok', updated });
  } catch (err) {
    console.error('❌ PATCH /notifications/leer-todo:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ── GET /api/notifications/notas-sin-leer ────────────────────────────────────
async function getNotasUnread(req, res) {
  const { email, role } = req.user;
  try {
    let rows;

    if (role === 'user') {
      [rows] = await pool.query(
        `SELECT id_tarea, COUNT(*) AS cnt
         FROM db_notifications
         WHERE tipo = 'nota' AND leido = 0 AND destinatario_correo = ?
         GROUP BY id_tarea`,
        [email],
      );
    } else {
      // Globales no leídas = no existe fila en notification_reads para este usuario
      // Privadas no leídas = leido = 0 AND destinatario_correo = email
      [rows] = await pool.query(
        `SELECT n.id_tarea, COUNT(*) AS cnt
         FROM db_notifications n
         LEFT JOIN notification_reads nr
           ON nr.id_notification = n.id AND nr.user_email = ?
         WHERE n.tipo = 'nota'
           AND (
             (n.destinatario_correo IS NULL AND nr.user_email IS NULL)
             OR (n.destinatario_correo = ? AND n.leido = 0)
           )
         GROUP BY n.id_tarea`,
        [email, email],
      );
    }

    const result = {};
    for (const r of rows) if (r.id_tarea) result[r.id_tarea] = Number(r.cnt);
    res.json({ unread: result });
  } catch (err) {
    console.error('❌ GET /api/notifications/notas-sin-leer:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ── PATCH /api/notifications/leer-tarea/:taskId ──────────────────────────────
async function marcarLeidasPorTarea(req, res) {
  const { taskId }      = req.params;
  const { email, role } = req.user;
  try {
    if (role === 'user') {
      await pool.query(
        `UPDATE db_notifications SET leido = 1
         WHERE tipo = 'nota' AND id_tarea = ? AND destinatario_correo = ? AND leido = 0`,
        [taskId, email],
      );
    } else {
      // Globales → registrar lectura per-usuario
      await pool.query(
        `INSERT IGNORE INTO notification_reads (id_notification, user_email)
         SELECT n.id, ?
         FROM db_notifications n
         WHERE n.tipo = 'nota' AND n.id_tarea = ? AND n.destinatario_correo IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM notification_reads nr
             WHERE nr.id_notification = n.id AND nr.user_email = ?
           )`,
        [email, taskId, email],
      );
      // Privadas → campo leido
      await pool.query(
        `UPDATE db_notifications SET leido = 1
         WHERE tipo = 'nota' AND id_tarea = ? AND destinatario_correo = ? AND leido = 0`,
        [taskId, email],
      );
    }
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('❌ PATCH /api/notifications/leer-tarea:', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getNotifications,
  marcarLeida,
  marcarTodasLeidas,
  getNotasUnread,
  marcarLeidasPorTarea,
};
