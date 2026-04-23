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
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function marcarTodasLeidas(req, res) {
  const { email, role } = req.user;
  try {
    if (role === 'user') {
      await pool.query(
        `UPDATE db_notifications SET leido = 1 WHERE destinatario_correo = ?`,
        [email]
      );
    } else {
      await pool.query(
        `UPDATE db_notifications SET leido = 1 WHERE destinatario_correo IS NULL OR destinatario_correo = ?`,
        [email]
      );
    }
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getNotifications, marcarLeida, marcarTodasLeidas };
