/**
 * src/services/offlineNotifQueue.js
 * Cola de notificaciones para participantes desconectados del chat de tareas.
 *
 * Mecanismo:
 *   - Cuando alguien escribe en el chat y un participante está offline,
 *     se encola el mensaje con un debounce de DEBOUNCE_MS (default 3 min).
 *   - Si llegan más mensajes antes de que expire el timer, el timer se reinicia
 *     y el nuevo mensaje se acumula → se envía UN solo email con todos los mensajes.
 *   - Cuando el timer dispara → flush → un email consolidado por destinatario.
 *
 * Clave de cola: `${taskId}:${recipientEmail}` — independiente por tarea y destinatario.
 */

const { sendOfflineChatEmail } = require('./emailService');

const DEBOUNCE_MS = process.env.OFFLINE_NOTIF_DEBOUNCE_MS
  ? parseInt(process.env.OFFLINE_NOTIF_DEBOUNCE_MS, 10)
  : 3 * 60 * 1000; // 3 minutos

/** @type {Map<string, { timer: NodeJS.Timeout, taskId: number, taskDesc: string, recipientEmail: string, recipientName: string, messages: { autorNombre: string, mensaje: string }[] }>} */
const queue = new Map();

/**
 * Encola o actualiza la entrada para un destinatario offline.
 * @param {{ taskId: number, taskDesc: string, recipientEmail: string, recipientName: string, autorNombre: string, mensaje: string }} params
 */
function queueOfflineNotif({ taskId, taskDesc, recipientEmail, recipientName, autorNombre, mensaje }) {
  const key = `${taskId}:${recipientEmail}`;

  if (queue.has(key)) {
    const entry = queue.get(key);
    clearTimeout(entry.timer);
    entry.messages.push({ autorNombre, mensaje });
    entry.timer = setTimeout(() => flush(key), DEBOUNCE_MS);
    console.log(`📬 [offlineQueue] +1 msg queued ${key} (total: ${entry.messages.length})`);
  } else {
    const entry = {
      taskId,
      taskDesc,
      recipientEmail,
      recipientName,
      messages: [{ autorNombre, mensaje }],
      timer: setTimeout(() => flush(key), DEBOUNCE_MS),
    };
    queue.set(key, entry);
    console.log(`📬 [offlineQueue] nuevo entry ${key} — dispara en ${DEBOUNCE_MS / 1000}s`);
  }
}

async function flush(key) {
  const entry = queue.get(key);
  queue.delete(key);
  if (!entry) return;
  try {
    await sendOfflineChatEmail({
      correo:    entry.recipientEmail,
      nombre:    entry.recipientName,
      taskId:    entry.taskId,
      taskDesc:  entry.taskDesc,
      messages:  entry.messages,
    });
  } catch (err) {
    console.error(`❌ [offlineQueue] flush ${key}:`, err.message);
  }
}

module.exports = { queueOfflineNotif };
