/**
 * src/config/socket.js
 * Singleton de Socket.io + helpers de emisión reutilizables.
 * Los controladores importan `getIo` / `emitNotifAlert` directamente.
 */

/** @type {import('socket.io').Server | null} */
let _io = null;

/** @param {import('socket.io').Server} io */
function setIo(io) { _io = io; }

/** @returns {import('socket.io').Server | null} */
function getIo() { return _io; }

/**
 * Emite `notification_alert` al destinatario correcto.
 * @param {string | null} destinatario_correo  NULL → broadcast a todos los admins (alzak_global)
 * @param {{ tipo?: string, id_tarea?: number }} [payload]  Contexto para el frontend
 */
function emitNotifAlert(destinatario_correo, payload = {}) {
  if (!_io) return;
  const data = { tipo: null, id_tarea: null, ...payload };
  if (destinatario_correo) {
    _io.to(`user_${destinatario_correo}`).emit('notification_alert', data);
  } else {
    _io.to('alzak_global').emit('notification_alert', data);
  }
}

/**
 * Emite `task_updated` al room global para sincronizar el tablero.
 * @param {object} payload  Mínimo: { id }. Opcional: status, prioridad, fecha_entrega, etc.
 */
function emitTaskUpdated(payload) {
  _io?.to('alzak_global').emit('task_updated', payload);
}

/**
 * Emite `task_created` para que todos hagan refresh de la lista.
 */
function emitTaskCreated() {
  _io?.to('alzak_global').emit('task_created');
}

module.exports = { setIo, getIo, emitNotifAlert, emitTaskUpdated, emitTaskCreated };
