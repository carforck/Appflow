/**
 * src/controllers/authController.js
 */
const bcrypt                      = require('bcryptjs');
const jwt                         = require('jsonwebtoken');
const pool                        = require('../config/db');
const { logActivity }             = require('../utils/logActivity');
const { sendPasswordResetEmail }  = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'alzak-dev-secret-change-in-prod';

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan credenciales' });
  }

  const ip      = req.headers['x-forwarded-for']?.split(',')[0] ?? req.ip ?? 'unknown';
  const correo  = email.toLowerCase().trim();

  try {
    const [rows] = await pool.query(
      'SELECT email, nombre_complete, role, password, activo FROM users WHERE email = ?',
      [correo]
    );

    // Usuario no existe — log interno (no revelar al cliente)
    if (rows.length === 0) {
      console.warn(`🚫 Login fallido (usuario no existe): ${correo} | IP: ${ip}`);
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const u = rows[0];

    // Cuenta inhabilitada
    if (!u.activo) {
      console.warn(`🚫 Login bloqueado (cuenta inhabilitada): ${correo} | IP: ${ip}`);
      return res.status(403).json({ error: 'Tu cuenta ha sido desactivada. Contacta al administrador.' });
    }

    // Contraseña incorrecta
    const valid = await bcrypt.compare(password, u.password);
    if (!valid) {
      console.warn(`🚫 Login fallido (contraseña incorrecta): ${correo} (${u.role}) | IP: ${ip}`);
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { email: u.email, nombre: u.nombre_complete, role: u.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    console.log(`🔓 Login OK: ${u.email} (${u.role}) | IP: ${ip}`);
    logActivity({
      correo: u.email, nombre: u.nombre_complete, role: u.role,
      accion: 'Login', modulo: 'Auth',
      detalle: `Inicio de sesión exitoso desde IP ${ip}`, ip,
    });
    res.json({
      token,
      user: { email: u.email, nombre: u.nombre_complete, role: u.role },
    });
  } catch (err) {
    console.error(`❌ Error en login (${correo}):`, err.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

// ── Forgot Password — envía OTP ───────────────────────────────────────────────
async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Correo requerido' });
  const correo = email.toLowerCase().trim();

  try {
    const [rows] = await pool.query(
      'SELECT email, nombre_complete FROM users WHERE email = ?', [correo]
    );
    // Responder igual si no existe — no revelar si el correo está registrado
    if (rows.length === 0) {
      return res.json({ ok: true });
    }

    const code      = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    // Invalidar códigos anteriores del mismo correo
    await pool.query('UPDATE password_resets SET used = 1 WHERE email = ?', [correo]);

    await pool.query(
      'INSERT INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)',
      [correo, code, expiresAt]
    );

    await sendPasswordResetEmail({ email: correo, nombre: rows[0].nombre_complete, code });
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ forgotPassword:', err.message);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
}

// ── Verify Reset Code ─────────────────────────────────────────────────────────
async function verifyResetCode(req, res) {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Datos incompletos' });
  const correo = email.toLowerCase().trim();

  try {
    const [rows] = await pool.query(
      `SELECT id FROM password_resets
       WHERE email = ? AND code = ? AND used = 0 AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [correo, code.trim()]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Código inválido o expirado' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ verifyResetCode:', err.message);
    res.status(500).json({ error: 'Error al verificar el código' });
  }
}

// ── Reset Password — actualiza contraseña ────────────────────────────────────
async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ error: 'Datos incompletos' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' });
  const correo = email.toLowerCase().trim();

  try {
    const [rows] = await pool.query(
      `SELECT id FROM password_resets
       WHERE email = ? AND code = ? AND used = 0 AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [correo, code.trim()]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Código inválido o expirado' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password = ? WHERE email = ?', [hash, correo]);
    await pool.query('UPDATE password_resets SET used = 1 WHERE email = ?', [correo]);

    console.log(`🔑 Contraseña restablecida para ${correo}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ resetPassword:', err.message);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
}

module.exports = { login, forgotPassword, verifyResetCode, resetPassword };
