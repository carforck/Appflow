/**
 * src/controllers/userController.js
 * RBAC:
 *   superadmin / admin → lista completa; pueden crear, editar, eliminar usuarios
 *   superadmin         → también puede cambiar roles
 * Socket.io:
 *   - Eliminar usuario → emite `user_force_logout` al room privado del usuario
 *   - Cambiar rol      → emite `user_role_changed` al room privado del usuario
 */
const bcrypt    = require('bcryptjs');
const pool      = require('../config/db');
const { getIo } = require('../config/socket');
const { sendCredentialsEmail } = require('../services/emailService');

const DEFAULT_PASSWORD = 'Alzak2026*';

async function getUsers(req, res) {
  try {
    const { role, email } = req.user;

    let rows;
    if (role === 'superadmin' || role === 'admin') {
      [rows] = await pool.query(
        'SELECT email, nombre_complete AS nombre_completo, role, activo, must_change_password FROM users ORDER BY nombre_complete ASC'
      );
    } else {
      [rows] = await pool.query(
        'SELECT email, nombre_complete AS nombre_completo, role, activo, must_change_password FROM users WHERE email = ?',
        [email]
      );
    }

    const users = rows.map((u) => ({ ...u, activo: Boolean(u.activo), must_change_password: Boolean(u.must_change_password) }));
    console.log(`👥 GET /users → ${users.length} usuarios (${role}: ${email})`);
    res.json({ status: 'success', total: users.length, users });
  } catch (err) {
    console.error('❌ GET /users:', err.message);
    res.status(500).json({ error: 'Error al obtener usuarios', detalle: err.message });
  }
}

async function createUser(req, res) {
  const { nombre_completo, correo, role, activo } = req.body;
  const { role: requesterRole } = req.user;

  if (!nombre_completo?.trim() || !correo?.trim()) {
    return res.status(400).json({ error: 'Nombre y correo son obligatorios' });
  }

  const VALID_ROLES = ['superadmin', 'admin', 'user'];
  const targetRole  = VALID_ROLES.includes(role) ? role : 'user';

  // Solo superadmin puede crear superadmin
  if (targetRole === 'superadmin' && requesterRole !== 'superadmin') {
    return res.status(403).json({ error: 'Solo un superadmin puede crear otro superadmin' });
  }

  const email = correo.toLowerCase().trim();

  try {
    const [[existing]] = await pool.query('SELECT email FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'El correo ya está registrado' });

    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    await pool.query(
      'INSERT INTO users (nombre_complete, email, password, role, activo, must_change_password) VALUES (?, ?, ?, ?, ?, 1)',
      [nombre_completo.trim(), email, hash, targetRole, activo !== false ? 1 : 0]
    );

    console.log(`✅ Usuario creado: ${email} (${targetRole}) por ${req.user.email}`);
    res.status(201).json({ status: 'created', email, nombre_completo: nombre_completo.trim(), role: targetRole, activo: activo !== false });
  } catch (err) {
    console.error('❌ POST /users:', err.message);
    res.status(500).json({ error: 'Error al crear usuario', detalle: err.message });
  }
}

async function updateUser(req, res) {
  const { correo } = req.params;
  const { nombre_completo, role, activo } = req.body;
  const { role: requesterRole, email: requesterEmail } = req.user;
  const targetEmail = decodeURIComponent(correo);

  try {
    const [[target]] = await pool.query('SELECT email, role FROM users WHERE email = ?', [targetEmail]);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Un admin no puede modificar (renombrar/desactivar) a un superadmin
    if (target.role === 'superadmin' && requesterRole !== 'superadmin') {
      return res.status(403).json({ error: 'Solo un superadmin puede modificar a otro superadmin' });
    }
    // Nadie puede desactivar su propia cuenta desde aquí
    if (targetEmail === requesterEmail && activo === false) {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
    }

    // Solo superadmin puede cambiar rol a/de superadmin
    if (role && role !== target.role) {
      if ((role === 'superadmin' || target.role === 'superadmin') && requesterRole !== 'superadmin') {
        return res.status(403).json({ error: 'Solo un superadmin puede modificar el rol de superadmin' });
      }
    }

    const fields = [];
    const vals   = [];

    if (nombre_completo?.trim()) { fields.push('nombre_complete = ?'); vals.push(nombre_completo.trim()); }
    if (role && ['superadmin','admin','user'].includes(role)) { fields.push('role = ?'); vals.push(role); }
    if (activo !== undefined) { fields.push('activo = ?'); vals.push(activo ? 1 : 0); }

    if (fields.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

    vals.push(targetEmail);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE email = ?`, vals);

    // Notificar cambio de rol en tiempo real
    if (role && role !== target.role) {
      getIo()?.to(`user_${targetEmail}`).emit('user_role_changed', { email: targetEmail, role });
    }
    // Si se desactiva, forzar logout
    if (activo === false) {
      getIo()?.to(`user_${targetEmail}`).emit('user_force_logout');
    }

    console.log(`✏️  Usuario ${targetEmail} actualizado por ${requesterEmail}`);
    res.json({ status: 'updated', email: targetEmail });
  } catch (err) {
    console.error('❌ PATCH /users/:correo:', err.message);
    res.status(500).json({ error: 'Error al actualizar usuario', detalle: err.message });
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

    if (target.role === newRole) return res.json({ status: 'unchanged', role: newRole });

    await pool.query('UPDATE users SET role = ? WHERE email = ?', [newRole, targetEmail]);
    getIo()?.to(`user_${targetEmail}`).emit('user_role_changed', { email: targetEmail, role: newRole });

    console.log(`🔑 Rol de ${targetEmail} cambiado a ${newRole} por ${requesterEmail}`);
    res.json({ status: 'updated', email: targetEmail, role: newRole });
  } catch (err) {
    console.error('❌ PATCH /users/:correo/rol:', err.message);
    res.status(500).json({ error: 'Error al actualizar rol', detalle: err.message });
  }
}

async function toggleActivo(req, res) {
  const { correo }                                     = req.params;
  const { email: requesterEmail, role: requesterRole } = req.user;
  const targetEmail                                    = decodeURIComponent(correo);

  if (targetEmail === requesterEmail) {
    return res.status(400).json({ error: 'No puedes inhabilitar tu propia cuenta' });
  }

  try {
    const [[target]] = await pool.query(
      'SELECT email, role, activo FROM users WHERE email = ?', [targetEmail]
    );
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (target.role === 'superadmin' && requesterRole !== 'superadmin') {
      return res.status(403).json({ error: 'Solo un superadmin puede inhabilitar otro superadmin' });
    }

    const nuevoActivo = target.activo ? 0 : 1;
    await pool.query('UPDATE users SET activo = ? WHERE email = ?', [nuevoActivo, targetEmail]);

    if (nuevoActivo === 0) getIo()?.to(`user_${targetEmail}`).emit('user_force_logout');

    console.log(`🔒 Usuario ${targetEmail} ${nuevoActivo ? 'habilitado' : 'inhabilitado'} por ${requesterEmail}`);
    res.json({ status: 'updated', email: targetEmail, activo: Boolean(nuevoActivo) });
  } catch (err) {
    console.error('❌ PATCH /users/:correo/activo:', err.message);
    res.status(500).json({ error: 'Error al actualizar estado', detalle: err.message });
  }
}

async function changePassword(req, res) {
  const { email: requesterEmail } = req.user;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const [[user]] = await pool.query('SELECT password FROM users WHERE email = ?', [requesterEmail]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'La contraseña actual es incorrecta' });

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password = ?, must_change_password = 0 WHERE email = ?', [hash, requesterEmail]);

    console.log(`🔑 Contraseña cambiada para ${requesterEmail}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ PATCH /users/me/password:', err.message);
    res.status(500).json({ error: 'Error al cambiar contraseña', detalle: err.message });
  }
}

/**
 * Un admin/superadmin asigna una nueva contraseña a la cuenta de otro usuario.
 * - Invalida las sesiones activas del usuario (force-logout).
 * - Le envía un correo con la contraseña asignada.
 * - Por defecto exige que la cambie en el próximo ingreso (requireChange).
 */
async function adminResetPassword(req, res) {
  const { correo } = req.params;
  const { newPassword, requireChange = true } = req.body;
  const { role: requesterRole, email: requesterEmail, nombre: requesterNombre } = req.user;
  const targetEmail = decodeURIComponent(correo);

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const [[target]] = await pool.query(
      'SELECT email, nombre_complete, role FROM users WHERE email = ?', [targetEmail]
    );
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Solo un superadmin puede cambiar credenciales de otro superadmin
    if (target.role === 'superadmin' && requesterRole !== 'superadmin') {
      return res.status(403).json({ error: 'Solo un superadmin puede cambiar credenciales de otro superadmin' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password = ?, must_change_password = ? WHERE email = ?',
      [hash, requireChange ? 1 : 0, targetEmail]
    );

    // Invalidar sesiones activas → obliga a re-login con la nueva credencial
    getIo()?.to(`user_${targetEmail}`).emit('user_force_logout');

    // Notificar al usuario por correo (no bloquea la respuesta)
    sendCredentialsEmail({
      correo:        targetEmail,
      nombre:        target.nombre_complete,
      password:      newPassword,
      requireChange: Boolean(requireChange),
      adminNombre:   requesterNombre || requesterEmail,
    }).catch((e) => console.error('⚠️ sendCredentialsEmail:', e.message));

    console.log(`🔑 Credenciales restablecidas para ${targetEmail} por ${requesterEmail} (requireChange=${!!requireChange})`);
    res.json({ ok: true, email: targetEmail });
  } catch (err) {
    console.error('❌ PATCH /users/:correo/password:', err.message);
    res.status(500).json({ error: 'Error al cambiar credenciales', detalle: err.message });
  }
}

async function getMyActivity(req, res) {
  const { email } = req.user;
  try {
    const [rows] = await pool.query(
      `SELECT accion, modulo, detalle, created_at
       FROM activity_logs
       WHERE usuario_correo = ?
       ORDER BY created_at DESC
       LIMIT 15`,
      [email]
    );
    res.json({ ok: true, activity: rows });
  } catch (err) {
    console.error('❌ GET /users/me/activity:', err.message);
    res.status(500).json({ error: 'Error al obtener actividad' });
  }
}

module.exports = { getUsers, createUser, updateUser, deleteUser, updateUserRole, toggleActivo, changePassword, adminResetPassword, getMyActivity };
