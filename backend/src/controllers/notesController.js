/**
 * src/controllers/notesController.js
 * Notas de tarea como hilo de conversación (chat).
 * Socket.io:
 *   - Emite `new_note`          al room task_{id} (chat en tiempo real)
 *   - Emite `notification_alert` al destinatario correcto (badge instantáneo)
 */
const pool              = require('../config/db');
const { getIo, emitNotifAlert } = require('../config/socket');

async function getNotas(req, res) {
  const { id }          = req.params;
  const { email, role } = req.user;

  try {
    if (role === 'user') {
      const [[task]] = await pool.query('SELECT responsable_correo FROM tasks WHERE id = ?', [id]);
      if (!task || task.responsable_correo !== email) {
        return res.status(403).json({ error: 'Sin acceso a esta tarea' });
      }
    }

    const [notas] = await pool.query(
      'SELECT * FROM task_notas WHERE id_tarea = ? ORDER BY created_at ASC',
      [id],
    );
    res.json({ notas });
  } catch (err) {
    console.error('❌ GET /tareas/:id/notas:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function addNota(req, res) {
  const { id }                  = req.params;
  const { email, role, nombre } = req.user;
  const { mensaje }             = req.body ?? {};

  if (!mensaje?.trim()) return res.status(400).json({ error: 'El mensaje no puede estar vacío' });

  try {
    const [[task]] = await pool.query(
      `SELECT id, tarea_descripcion, responsable_correo FROM tasks WHERE id = ?`,
      [id],
    );
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });

    if (role === 'user' && task.responsable_correo !== email) {
      return res.status(403).json({ error: 'Sin acceso a esta tarea' });
    }

    const autorNombre = nombre ?? email;

    const [result] = await pool.query(
      `INSERT INTO task_notas (id_tarea, usuario_correo, usuario_nombre, mensaje) VALUES (?, ?, ?, ?)`,
      [id, email, autorNombre, mensaje.trim()],
    );

    const nota = {
      id:             result.insertId,
      id_tarea:       parseInt(id, 10),
      usuario_correo: email,
      usuario_nombre: autorNombre,
      mensaje:        mensaje.trim(),
      created_at:     new Date().toISOString(),
    };

    // ── Tiempo real: chat en vivo ─────────────────────────────────────────────
    getIo()?.to(`task_${nota.id_tarea}`).emit('new_note', nota);

    // ── Notificación DB + alerta badge ───────────────────────────────────────
    const taskDesc = task.tarea_descripcion.slice(0, 80);
    const notifMsg = `${autorNombre}: ${mensaje.trim().slice(0, 120)}`;
    const idTarea  = parseInt(id, 10);

    if (role === 'user') {
      await pool.query(
        `INSERT INTO db_notifications (tipo, titulo, mensaje, id_tarea, destinatario_correo)
         VALUES ('nota', ?, ?, ?, NULL)`,
        [`Nota en: ${taskDesc}`, notifMsg, idTarea],
      );
      emitNotifAlert(null, { tipo: 'nota', id_tarea: idTarea });
    } else if (task.responsable_correo) {
      await pool.query(
        `INSERT INTO db_notifications (tipo, titulo, mensaje, id_tarea, destinatario_correo)
         VALUES ('nota', ?, ?, ?, ?)`,
        [`Respuesta del equipo: ${taskDesc}`, notifMsg, idTarea, task.responsable_correo],
      );
      emitNotifAlert(task.responsable_correo, { tipo: 'nota', id_tarea: idTarea });
    }

    res.status(201).json({ nota });
  } catch (err) {
    console.error('❌ POST /tareas/:id/notas:', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getNotas, addNota };
