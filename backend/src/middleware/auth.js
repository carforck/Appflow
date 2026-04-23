/**
 * src/middleware/auth.js — JWT auth + RBAC
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'alzak-dev-secret-change-in-prod';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const ip     = req.headers['x-forwarded-for']?.split(',')[0] ?? req.ip ?? 'unknown';

  if (!header?.startsWith('Bearer ')) {
    console.warn(`🔒 Auth: token ausente — ${req.method} ${req.path} | IP: ${ip}`);
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch (err) {
    console.warn(`🔒 Auth: token inválido — ${req.method} ${req.path} | IP: ${ip} | ${err.message}`);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      console.warn(
        `⛔ RBAC: acceso denegado — ${req.user?.email ?? 'anon'} (${req.user?.role ?? 'none'}) ` +
        `intentó ${req.method} ${req.path} | requiere: ${roles.join('|')}`
      );
      return res.status(403).json({ error: 'Sin permisos para esta acción' });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };
