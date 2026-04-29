/**
 * src/controllers/logsController.js
 * Endpoints de auditoría — solo superadmin.
 */
const pool = require('../config/db');

/** GET /api/logs — lista paginada con filtros */
async function getLogs(req, res) {
  const { accion, modulo, correo, q, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [];
  const params     = [];

  if (accion  && accion  !== 'Todas') { conditions.push('accion = ?');          params.push(accion); }
  if (modulo  && modulo  !== 'Todos') { conditions.push('modulo = ?');          params.push(modulo); }
  if (correo)                         { conditions.push('usuario_correo = ?'); params.push(correo); }
  if (q) {
    conditions.push('(usuario_nombre LIKE ? OR usuario_correo LIKE ? OR detalle LIKE ? OR modulo LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM activity_logs ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT * FROM activity_logs ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({ logs: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('getLogs error:', err.message);
    res.status(500).json({ error: 'Error al obtener logs' });
  }
}

/** GET /api/logs/stats — conteos por acción y módulo */
async function getStats(req, res) {
  try {
    const [byAccion] = await pool.query(
      'SELECT accion, COUNT(*) AS total FROM activity_logs GROUP BY accion'
    );
    const [byModulo] = await pool.query(
      'SELECT modulo, COUNT(*) AS total FROM activity_logs GROUP BY modulo ORDER BY total DESC LIMIT 8'
    );
    const [recent24h] = await pool.query(
      "SELECT COUNT(*) AS total FROM activity_logs WHERE created_at >= NOW() - INTERVAL 24 HOUR"
    );
    res.json({ byAccion, byModulo, recent24h: recent24h[0].total });
  } catch (err) {
    console.error('getStats error:', err.message);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
}

module.exports = { getLogs, getStats };
