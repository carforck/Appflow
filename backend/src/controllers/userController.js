/**
 * src/controllers/userController.js
 * RBAC:
 *   superadmin / admin → lista completa; pueden eliminar usuarios
 *   superadmin         → también puede cambiar roles
 * Socket.io:
 *   - Eliminar usuario → emite `user_force_logout` al room privado del usuario
 *   - Cambiar rol      → emite `user_role_changed` al room privado del usuario
 */
const pool      = require('../config/db');
const { getIo } = require('../config/socket');

async function getUsers(req, res) {
  try {
    const { role, email } = req.user;

    let rows;
    if (role === 'superadmin' || role === 'admin') {
      [rows] = await pool.query(
        'SELECT email, nombre_complete AS nombre_completo, role FROM users ORDER BY nombre_complete ASC'
      );
    } else {
      [rows] = await pool.query(
        'SELECT email, nombre_complete AS nombre_completo, role FROM users WHERE email = ?',
        [email]
      );
    }

    const users = rows.map((u) => ({ ...u, activo: true }));
    console.log(`👥 GET /users → ${users.length} usuarios (${role}: ${email})`);
    res.json({ status: 'success', total: users.length, users });
  } catch (err) {
    console.error('❌ GET /users:', err.message);
    res.status(500).json({ error: 'Error al obtener usuarios', detalle: err.message });
  }
}

async function deleteUser(req, res) {
  const { correo }                                  = req.params;
  const { email: requesterEmail, role: requesterRole } = req.user;
  const targetEmail                                 = decodeURIComponent(correo);

  if (targetEmail === requesterEmail) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  }

  try {
    const [[target]] = await pool.query('SELECT email, role FROM users WHERE email = ?', [targetEmail]);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (target.role === 'superadmin' && requesterRole !== 'superadmin') {
      return res.status(403).json({ error: 'Solo un superadmin puede eliminar otro superadmin' });
    }

    await pool.query('DELETE FROM users WHERE email = ?', [targetEmail]);

    // Forzar logout del usuario eliminado en tiempo real
    getIo()?.to(`user_${targetEmail}`).emit('user_force_logout');

    console.log(`🗑️  Usuario eliminado: ${targetEmail} por ${requesterEmail}`);
    res.json({ status: 'deleted', correo: targetEmail });
  } catch (err) {
    console.error('❌ DELETE /users/:correo:', err.message);
    res.status(500).json({ error: 'Error al eliminar usuario', detalle: err.message });
  }
}

async function updateUserRole(req, res) {
  const { correo }                                  = req.params;
  const { role: requesterRole, email: requesterEmail } = req.user;
  const { role: newRole }                           = req.body;
  const targetEmail                                 = decodeURIComponent(correo);

  if (requesterRole !== 'superadmin') {
    return res.status(403).json({ error: 'Solo superadmin puede cambiar roles' });
  }

  const VALID_ROLES = ['superadmin', 'admin', 'user'];
  if (!VALID_ROLES.includes(newRole)) {
    return res.status(400).json({ error: `Rol inválido. Valores permitidos: ${VALID_ROLES.join(', ')}` });
  }

  if (targetEmail === requesterEmail) {
    return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
  }

  try {
    const [[target]] = await pool.query('SELECT email, role FROM users WHERE email = ?', [targetEmail]);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (target.role === newRole) {
      return res.json({ status: 'unchanged', role: newRole });
    }

    await pool.query('UPDATE users SET role = ? WHERE email = ?', [newRole, targetEmail]);

    // Notificar al usuario en tiempo real — su sesión se actualizará o cerrará
    getIo()?.to(`user_${targetEmail}`).emit('user_role_changed', { email: targetEmail, role: newRole });

    console.log(`🔑 Rol de ${targetEmail} cambiado a ${newRole} por ${requesterEmail}`);
    res.json({ status: 'updated', email: targetEmail, role: newRole });
  } catch (err) {
    console.error('❌ PATCH /users/:correo/rol:', err.message);
    res.status(500).json({ error: 'Error al actualizar rol', detalle: err.message });
  }
}

module.exports = { getUsers, deleteUser, updateUserRole };
