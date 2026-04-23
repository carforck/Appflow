/**
 * src/services/emailService.js
 * Servicio de correo consolidado — evita spam al equipo.
 *
 * Flujo:
 *   1. queueApprovedTask()  → inserta fila en `pending_emails` (estado=0)
 *   2. sendConsolidatedEmails() → agrupa por destinatario, un solo correo por usuario
 *
 * SMTP configurado via variables de entorno:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * Si no están definidas, los envíos se loguean sin error (modo dry-run).
 */

const nodemailer = require('nodemailer');
const pool       = require('../config/db');

// ── Transporte ─────────────────────────────────────────────────────────────────

function buildTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   parseInt(SMTP_PORT || '587', 10),
    secure: parseInt(SMTP_PORT || '587', 10) === 465,
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
    tls:    { rejectUnauthorized: false },
  });
}

// ── queueApprovedTask ──────────────────────────────────────────────────────────

/**
 * Encola una tarea aprobada para enviar en el próximo ciclo de correo.
 * @param {object} data
 * @param {string} data.destinatario_correo
 * @param {string} [data.destinatario_nombre]
 * @param {number} data.id_tarea
 * @param {string} data.tarea_descripcion
 * @param {string} [data.proyecto_nombre]
 * @param {string} [data.prioridad]
 * @param {string} [data.fecha_entrega]  YYYY-MM-DD
 */
async function queueApprovedTask(data) {
  const {
    destinatario_correo,
    destinatario_nombre = '',
    id_tarea,
    tarea_descripcion,
    proyecto_nombre    = '',
    prioridad          = 'Media',
    fecha_entrega      = null,
  } = data;

  if (!destinatario_correo) {
    console.log(`📧 queueApprovedTask: sin correo para tarea #${id_tarea} — omitida`);
    return;
  }

  try {
    await pool.query(
      `INSERT INTO pending_emails
         (destinatario_correo, destinatario_nombre, id_tarea,
          tarea_descripcion, proyecto_nombre, prioridad, fecha_entrega)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        destinatario_correo,
        destinatario_nombre,
        id_tarea,
        tarea_descripcion,
        proyecto_nombre,
        prioridad,
        fecha_entrega,
      ]
    );
    console.log(`📧 Tarea #${id_tarea} encolada para ${destinatario_correo}`);
  } catch (err) {
    console.error(`❌ queueApprovedTask #${id_tarea}:`, err.message);
  }
}

// ── buildHtml ──────────────────────────────────────────────────────────────────

const PRIO_COLOR = { Alta: '#dc2626', Media: '#d97706', Baja: '#16a34a' };
const PRIO_BG    = { Alta: '#fef2f2', Media: '#fffbeb', Baja: '#f0fdf4' };

function buildHtml(nombre, tareas) {
  const filas = tareas.map((t) => {
    const color = PRIO_COLOR[t.prioridad] || '#64748b';
    const bg    = PRIO_BG[t.prioridad]    || '#f8fafc';
    const fecha = t.fecha_entrega
      ? new Date(t.fecha_entrega + 'T12:00:00').toLocaleDateString('es-ES', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
      : 'Sin fecha';

    return `
      <tr style="background:${bg}; border-bottom:1px solid #e2e8f0;">
        <td style="padding:12px 16px; font-size:14px; color:#1e293b;">${t.tarea_descripcion}</td>
        <td style="padding:12px 8px; font-size:12px; color:#64748b; white-space:nowrap;">${t.proyecto_nombre || ''}</td>
        <td style="padding:12px 8px; text-align:center;">
          <span style="background:${color}; color:#fff; font-size:11px; font-weight:700;
                       padding:2px 8px; border-radius:99px;">${t.prioridad}</span>
        </td>
        <td style="padding:12px 8px; font-size:12px; color:#475569; white-space:nowrap;">${fecha}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a365d;padding:28px 32px;">
            <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;">Alzak Flow</h1>
            <p style="margin:6px 0 0;font-size:14px;color:#93c5fd;">Resumen de tareas asignadas</p>
          </td>
        </tr>

        <!-- Saludo -->
        <tr>
          <td style="padding:24px 32px 16px;">
            <p style="margin:0;font-size:15px;color:#334155;">
              Hola <strong>${nombre}</strong>, se te han asignado
              <strong>${tareas.length} tarea${tareas.length !== 1 ? 's' : ''}</strong>
              aprobadas para el equipo.
            </p>
          </td>
        </tr>

        <!-- Tabla -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
              <thead>
                <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                  <th style="padding:10px 16px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Tarea</th>
                  <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Proyecto</th>
                  <th style="padding:10px 8px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Prioridad</th>
                  <th style="padding:10px 8px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Entrega</th>
                </tr>
              </thead>
              <tbody>${filas}</tbody>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              Alzak Foundation · Sistema de Gestión de Proyectos Clínicos
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── sendConsolidatedEmails ─────────────────────────────────────────────────────

/**
 * Lee `pending_emails` (enviado=0), agrupa por destinatario y
 * envía UN correo HTML consolidado por usuario.
 * @returns {{ sent: number, recipients: string[], errors: string[] }}
 */
async function sendConsolidatedEmails() {
  const result = { sent: 0, recipients: [], errors: [] };

  // 1. Obtener pendientes
  const [rows] = await pool.query(`
    SELECT id, destinatario_correo, destinatario_nombre,
           tarea_descripcion, proyecto_nombre, prioridad, fecha_entrega
    FROM pending_emails
    WHERE enviado = 0
    ORDER BY destinatario_correo, id ASC
  `);

  if (rows.length === 0) {
    console.log('📧 sendConsolidatedEmails: sin pendientes');
    return result;
  }

  // 2. Agrupar por destinatario
  /** @type {Map<string, { nombre: string, ids: number[], tareas: object[] }>} */
  const byRecipient = new Map();
  for (const row of rows) {
    if (!byRecipient.has(row.destinatario_correo)) {
      byRecipient.set(row.destinatario_correo, {
        nombre: row.destinatario_nombre || row.destinatario_correo.split('@')[0],
        ids:    [],
        tareas: [],
      });
    }
    const entry = byRecipient.get(row.destinatario_correo);
    entry.ids.push(row.id);
    entry.tareas.push({
      tarea_descripcion: row.tarea_descripcion,
      proyecto_nombre:   row.proyecto_nombre,
      prioridad:         row.prioridad,
      fecha_entrega:     row.fecha_entrega,
    });
  }

  console.log(`📧 Enviando correos consolidados a ${byRecipient.size} destinatario(s)...`);

  const transport = buildTransport();
  const from      = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@alzakfoundation.org';

  // 3. Enviar un correo por destinatario
  for (const [correo, { nombre, ids, tareas }] of byRecipient) {
    const subject = tareas.length === 1
      ? `Alzak Flow — Nueva tarea asignada: ${tareas[0].tarea_descripcion.slice(0, 60)}`
      : `Alzak Flow — ${tareas.length} nuevas tareas asignadas`;
    const html = buildHtml(nombre, tareas);

    if (!transport) {
      // Modo dry-run: sin SMTP configurado
      console.log(`📧 [DRY-RUN] Correo a ${correo} — ${tareas.length} tareas — SMTP no configurado`);
    } else {
      try {
        await transport.sendMail({ from, to: correo, subject, html });
        console.log(`✅ Correo enviado a ${correo} (${tareas.length} tareas)`);
      } catch (err) {
        console.error(`❌ Error enviando a ${correo}:`, err.message);
        result.errors.push(`${correo}: ${err.message}`);
        continue; // no marcar como enviado si falló
      }
    }

    // 4. Marcar como enviados
    await pool.query(
      `UPDATE pending_emails SET enviado = 1, sent_at = NOW() WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    result.recipients.push(correo);
    result.sent++;
  }

  return result;
}

module.exports = { queueApprovedTask, sendConsolidatedEmails };
