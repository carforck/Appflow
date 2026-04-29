/**
 * utils/logActivity.js
 * Registra una acción de auditoría en activity_logs y la emite por Socket.io.
 */
const pool    = require('../config/db');
const { getIo } = require('../config/socket');

/**
 * @param {object} opts
 * @param {string} opts.correo
 * @param {string} opts.nombre
 * @param {string} opts.role
 * @param {string} opts.accion   — Login | Logout | Create | Update | Delete | Process | Access
 * @param {string} opts.modulo   — Auth | Tareas | Proyectos | Procesador | Usuarios | Dashboard | Admin
 * @param {string} [opts.detalle]
 * @param {string} [opts.ip]
 * @param {number} [opts.entityId]
 * @param {string} [opts.entityType]
 */
async function logActivity({ correo, nombre, role, accion, modulo, detalle = '', ip = null, entityId = null, entityType = null }) {
  try {
    const [result] = await pool.query(
      `INSERT INTO activity_logs
         (usuario_correo, usuario_nombre, usuario_role, accion, modulo, detalle, ip_address, entity_id, entity_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [correo, nombre, role, accion, modulo, detalle, ip, entityId, entityType]
    );

    // Emitir en tiempo real solo a superadmins (room 'superadmins')
    const io = getIo();
    if (io) {
      const entry = {
        id:             result.insertId,
        usuario_correo: correo,
        usuario_nombre: nombre,
        usuario_role:   role,
        accion,
        modulo,
        detalle,
        ip_address:     ip,
        entity_id:      entityId,
        entity_type:    entityType,
        created_at:     new Date().toISOString(),
      };
      io.to('superadmins').emit('new_activity_log', entry);
    }
  } catch (err) {
    // No bloquear el flujo principal si el log falla
    console.warn('⚠️  logActivity error:', err.message);
  }
}

module.exports = { logActivity };
