/**
 * index.js — Alzak Flow API
 * Punto de entrada: configura Express, Socket.io JWT y monta las rutas.
 */
require('dotenv').config();
const http    = require('http');
const express = require('express');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const { Server } = require('socket.io');

const { runMigrations }                = require('./src/config/migrate');
const { setIo }                        = require('./src/config/socket');
const authRoutes         = require('./src/routes/authRoutes');
const userRoutes         = require('./src/routes/userRoutes');
const projectRoutes      = require('./src/routes/projectRoutes');
const taskRoutes         = require('./src/routes/taskRoutes');
const meetingRoutes      = require('./src/routes/meetingRoutes');
const uploadRoutes       = require('./src/routes/uploadRoutes');
const minutasRoutes      = require('./src/routes/minutasRoutes');
const emailRoutes        = require('./src/routes/emailRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const statsRoutes        = require('./src/routes/statsRoutes');
const logsRoutes         = require('./src/routes/logsRoutes');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ── Rutas HTTP ───────────────────────────────────────────────────────────────
app.use('/auth',             authRoutes);
app.use('/users',            userRoutes);
app.use('/api/projects',     projectRoutes);
app.use('/tareas',           taskRoutes);
app.use('/procesar-reunion', meetingRoutes);
app.use('/upload',           uploadRoutes);
app.use('/api/minutas',      minutasRoutes);
app.use('/api/emails',       emailRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats',        statsRoutes);
app.use('/api/logs',         logsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── HTTP + Socket.io ─────────────────────────────────────────────────────────
const server = http.createServer(app);

const io = new Server(server, {
  cors:    { origin: true, methods: ['GET', 'POST'] },
  path:    '/socket.io',
});

setIo(io);

// ── Middleware JWT para sockets ───────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

// ── Usuarios activos (email → { nombre, role, connectedAt, count }) ──────────
const activeUsers = new Map();

function broadcastActiveUsers() {
  const list = Array.from(activeUsers.entries()).map(([email, d]) => ({
    email, nombre: d.nombre, role: d.role, connectedAt: d.connectedAt,
  }));
  io.to('superadmins').emit('active_users_update', list);
}

// ── Gestión de rooms y eventos relay ─────────────────────────────────────────
io.on('connection', (socket) => {
  const { email, nombre, role } = socket.user ?? {};
  if (email) {
    socket.join('alzak_global');      // room compartido por todos
    socket.join(`user_${email}`);     // room privado del usuario
    if (role === 'superadmin') socket.join('superadmins');

    // Rastrear usuario activo (múltiples tabs = múltiples sockets)
    const prev = activeUsers.get(email);
    activeUsers.set(email, {
      nombre, role,
      connectedAt: prev?.connectedAt ?? new Date().toISOString(),
      count: (prev?.count ?? 0) + 1,
    });
    broadcastActiveUsers();
  }

  // Rooms de chat de tarea
  socket.on('join_task',  (taskId) => socket.join(`task_${taskId}`));
  socket.on('leave_task', (taskId) => socket.leave(`task_${taskId}`));

  // Relay de typing (socket.to → todos en el room EXCEPTO el emisor)
  socket.on('typing_start', ({ taskId, userName }) => {
    socket.to(`task_${taskId}`).emit('typing_start', { taskId, userName });
  });
  socket.on('typing_stop', ({ taskId }) => {
    socket.to(`task_${taskId}`).emit('typing_stop', { taskId });
  });

  socket.on('disconnect', () => {
    if (email) {
      const entry = activeUsers.get(email);
      if (entry) {
        if (entry.count <= 1) activeUsers.delete(email);
        else activeUsers.set(email, { ...entry, count: entry.count - 1 });
        broadcastActiveUsers();
      }
    }
  });
});

// ── Arranque ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3005;
server.listen(PORT, '0.0.0.0', async () => {
  console.log('\n🚀 ALZAK FLOW OPERATIVO');
  console.log(`🔗 DB → ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log('🔐 Auth JWT activo');
  console.log('🔌 Socket.io activo (JWT rooms: alzak_global · user_{email} · task_{id})');
  console.log(`📡 Escuchando en 0.0.0.0:${PORT}`);
  await runMigrations().catch((e) => console.error('⚠️ Migrate error:', e.message));
});
