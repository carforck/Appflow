/**
 * src/controllers/authController.js
 */
const bcrypt              = require('bcryptjs');
const jwt                 = require('jsonwebtoken');
const pool                = require('../config/db');
const { logActivity }     = require('../utils/logActivity');

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
      'SELECT email, nombre_complete, role, password FROM users WHERE email = ?',
      [correo]
    );

    // Usuario no existe — log interno (no revelar al cliente)
    if (rows.length === 0) {
      console.warn(`🚫 Login fallido (usuario no existe): ${correo} | IP: ${ip}`);
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const u = rows[0];

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

module.exports = { login };
