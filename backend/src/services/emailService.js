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
    // Verificación de certificado TLS activada por defecto (previene MITM).
    // Solo desactivar con SMTP_TLS_INSECURE=true si el servidor usa cert self-signed.
    tls:    { rejectUnauthorized: process.env.SMTP_TLS_INSECURE !== 'true' },
  });
}

/**
 * Escapa contenido de usuario antes de interpolarlo en HTML de correo.
 * Previene inyección de HTML/phishing en los emails.
 */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
        <td style="padding:12px 16px; font-size:14px; color:#1e293b; max-width:200px; word-wrap:break-word; overflow-wrap:break-word;">${escapeHtml(t.tarea_descripcion)}</td>
        <td style="padding:12px 8px; font-size:12px; color:#64748b; max-width:220px; word-wrap:break-word; overflow-wrap:break-word;">${escapeHtml(t.proyecto_nombre || '')}</td>
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
            <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;">ALZAK Flow</h1>
            <p style="margin:6px 0 0;font-size:14px;color:#93c5fd;">Resumen de tareas asignadas</p>
          </td>
        </tr>

        <!-- Saludo -->
        <tr>
          <td style="padding:24px 32px 16px;">
            <p style="margin:0;font-size:15px;color:#334155;">
              Hola <strong>${escapeHtml(nombre)}</strong>, se te han asignado
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
      ? `ALZAK Flow — Nueva tarea asignada: ${tareas[0].tarea_descripcion.slice(0, 60)}`
      : `ALZAK Flow — ${tareas.length} nuevas tareas asignadas`;
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

// ── sendPasswordResetEmail ─────────────────────────────────────────────────────

/**
 * Envía un correo con el código OTP de 6 dígitos para reseteo de contraseña.
 */
async function sendPasswordResetEmail({ email, nombre, code }) {
  const transport = buildTransport();
  const from      = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@alzakfoundation.org';

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#1a365d;padding:28px 32px;">
            <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;">ALZAK Flow</h1>
            <p style="margin:6px 0 0;font-size:14px;color:#93c5fd;">Recuperación de contraseña</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#334155;">
              Hola <strong>${escapeHtml(nombre || email)}</strong>, recibimos una solicitud para restablecer tu contraseña.
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#64748b;">
              Usa el siguiente código de verificación. Expira en <strong>15 minutos</strong>.
            </p>
            <div style="text-align:center;margin:24px 0;">
              <span style="display:inline-block;background:#f1f5f9;border:2px dashed #1a365d;border-radius:12px;
                           padding:18px 40px;font-size:36px;font-weight:800;letter-spacing:12px;color:#1a365d;">
                ${code}
              </span>
            </div>
            <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
              Si no solicitaste este cambio, ignora este correo. Tu contraseña no será modificada.
            </p>
          </td>
        </tr>
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

  if (!transport) {
    console.log(`📧 [DRY-RUN] Reset OTP para ${email}: ${code}`);
    return;
  }
  await transport.sendMail({
    from,
    to:      email,
    subject: 'ALZAK Flow — Código de verificación para restablecer contraseña',
    html,
  });
  console.log(`✅ OTP enviado a ${email}`);
}

// ── sendTaskUpdateEmail ────────────────────────────────────────────────────────
const FIELD_LABELS = {
  tarea_descripcion:  'Descripción',
  prioridad:          'Prioridad',
  responsable_nombre: 'Responsable',
  fecha_inicio:       'Fecha inicio',
  fecha_entrega:      'Fecha entrega',
  id_proyecto:        'Proyecto',
};

async function sendTaskUpdateEmail({ correo, nombre, taskId, changes, adminNombre }) {
  if (!correo) return;
  const transport = buildTransport();
  const from      = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@alzakfoundation.org';

  const rows = Object.entries(changes)
    .filter(([key]) => FIELD_LABELS[key])
    .map(([key, { antes, despues }]) => `
      <tr>
        <td style="padding:10px 16px;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9;font-weight:600;white-space:nowrap;">
          ${FIELD_LABELS[key]}
        </td>
        <td style="padding:10px 16px;font-size:13px;color:#94a3b8;border-bottom:1px solid #f1f5f9;">
          <span style="text-decoration:line-through;">${escapeHtml(antes ?? '—')}</span>
        </td>
        <td style="padding:10px 16px;font-size:13px;color:#1a365d;border-bottom:1px solid #f1f5f9;font-weight:700;">
          ${escapeHtml(despues ?? '—')}
        </td>
      </tr>`).join('');

  if (!rows) return; // nada cambiable que mostrar

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#1a365d;padding:28px 32px;">
            <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;">ALZAK Flow</h1>
            <p style="margin:6px 0 0;font-size:14px;color:#93c5fd;">Una de tus tareas fue modificada</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 8px;">
            <p style="margin:0 0 6px;font-size:15px;color:#334155;">
              Hola <strong>${escapeHtml(nombre || correo)}</strong>,
            </p>
            <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
              El administrador <strong>${escapeHtml(adminNombre || 'del sistema')}</strong> realizó cambios en la tarea <strong>#${taskId}</strong>:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:10px 16px;font-size:11px;color:#94a3b8;text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">Campo</th>
                  <th style="padding:10px 16px;font-size:11px;color:#94a3b8;text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">Antes</th>
                  <th style="padding:10px 16px;font-size:11px;color:#94a3b8;text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:.05em;">Ahora</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;">
            <p style="margin:0;font-size:13px;color:#94a3b8;">
              Ingresa a <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://appflow2026.vercel.app'}/tareas" style="color:#1a365d;font-weight:600;">ALZAK Flow</a> para ver tu tarea actualizada.
            </p>
          </td>
        </tr>
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

  if (!transport) {
    console.log(`📧 [DRY-RUN] Notificación de edición tarea #${taskId} → ${correo}`);
    return;
  }
  await transport.sendMail({
    from,
    to:      correo,
    subject: `ALZAK Flow — Tu tarea #${taskId} fue modificada`,
    html,
  });
  console.log(`✅ Notificación edición tarea #${taskId} enviada a ${correo}`);
}

// ── sendOfflineChatEmail ───────────────────────────────────────────────────────

/**
 * Email consolidado para participantes desconectados.
 * Muestra todos los mensajes acumulados por el debounce de offlineNotifQueue.
 * @param {{ correo: string, nombre: string, taskId: number, taskDesc: string, messages: { autorNombre: string, mensaje: string }[] }} param
 */
async function sendOfflineChatEmail({ correo, nombre, taskId, taskDesc, messages }) {
  if (!correo || !messages?.length) return;
  const transport = buildTransport();
  const from      = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@alzakfoundation.org';
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL || 'https://appflow2026.vercel.app';

  const msgCount   = messages.length;
  const autores    = [...new Set(messages.map((m) => m.autorNombre))];
  const autoresStr = autores.length === 1
    ? autores[0]
    : `${autores.slice(0, -1).join(', ')} y ${autores[autores.length - 1]}`;

  const messageRows = messages.map((m) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#1a365d;">${escapeHtml(m.autorNombre)}</p>
        <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;">${escapeHtml(m.mensaje.slice(0, 300))}</p>
      </td>
    </tr>`).join('');

  const subject = msgCount === 1
    ? `ALZAK Flow — Mensaje de ${messages[0].autorNombre} en tu tarea`
    : `ALZAK Flow — ${msgCount} mensajes nuevos de ${autoresStr}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#1a365d;padding:28px 32px;">
            <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;">ALZAK Flow</h1>
            <p style="margin:6px 0 0;font-size:14px;color:#93c5fd;">
              ${msgCount === 1 ? 'Nuevo mensaje mientras estabas desconectado/a' : `${msgCount} mensajes mientras estabas desconectado/a`}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 8px;">
            <p style="margin:0 0 20px;font-size:15px;color:#334155;">
              Hola <strong>${escapeHtml(nombre || correo)}</strong>,
            </p>
            <div style="background:#f8fafc;border-left:3px solid #1a365d;border-radius:0 8px 8px 0;padding:12px 16px;margin:0 0 20px;">
              <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Tarea</p>
              <p style="margin:0;font-size:14px;color:#334155;font-weight:600;">${escapeHtml(taskDesc?.slice(0, 120) || `#${taskId}`)}</p>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:0 0 24px;">
              <thead>
                <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                  <th style="padding:10px 16px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">
                    Mensajes nuevos (${msgCount})
                  </th>
                </tr>
              </thead>
              <tbody>${messageRows}</tbody>
            </table>
            <p style="margin:0 0 24px;">
              <a href="${appUrl}/tareas"
                 style="display:inline-block;background:#1a365d;color:#fff;font-size:13px;font-weight:700;
                        padding:12px 24px;border-radius:8px;text-decoration:none;">
                Ver en ALZAK Flow →
              </a>
            </p>
          </td>
        </tr>
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

  if (!transport) {
    console.log(`📧 [DRY-RUN] Chat offline tarea #${taskId} → ${correo} (${msgCount} msgs)`);
    return;
  }
  await transport.sendMail({ from, to: correo, subject, html });
  console.log(`✅ Email chat offline tarea #${taskId} → ${correo} (${msgCount} msgs)`);
}

// ── sendNoteReplyEmail ─────────────────────────────────────────────────────────

/**
 * Notifica al responsable de una tarea cuando el equipo responde una nota.
 * Solo se dispara cuando un admin/superadmin escribe en el hilo.
 */
async function sendNoteReplyEmail({ correo, nombre, taskId, taskDesc, mensaje, autorNombre }) {
  if (!correo) return;
  const transport = buildTransport();
  const from      = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@alzakfoundation.org';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://appflow2026.vercel.app';

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#1a365d;padding:28px 32px;">
            <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;">ALZAK Flow</h1>
            <p style="margin:6px 0 0;font-size:14px;color:#93c5fd;">Nueva respuesta del equipo</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 8px;">
            <p style="margin:0 0 6px;font-size:15px;color:#334155;">
              Hola <strong>${escapeHtml(nombre || correo)}</strong>,
            </p>
            <p style="margin:0 0 20px;font-size:14px;color:#64748b;">
              <strong>${escapeHtml(autorNombre || 'El equipo')}</strong> respondió en la tarea:
            </p>
            <div style="background:#f8fafc;border-left:3px solid #1a365d;border-radius:0 8px 8px 0;padding:12px 16px;margin:0 0 20px;">
              <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Tarea</p>
              <p style="margin:0;font-size:14px;color:#334155;">${escapeHtml(taskDesc?.slice(0, 120) || `#${taskId}`)}</p>
            </div>
            <div style="background:#eff6ff;border-radius:10px;padding:16px 20px;margin:0 0 20px;">
              <p style="margin:0 0 6px;font-size:12px;color:#3b82f6;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Mensaje</p>
              <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6;">${escapeHtml(mensaje?.slice(0, 300) || '')}</p>
            </div>
            <p style="margin:0 0 24px;">
              <a href="${appUrl}/tareas"
                 style="display:inline-block;background:#1a365d;color:#fff;font-size:13px;font-weight:700;
                        padding:12px 24px;border-radius:8px;text-decoration:none;">
                Ver en ALZAK Flow →
              </a>
            </p>
          </td>
        </tr>
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

  if (!transport) {
    console.log(`📧 [DRY-RUN] Nota del equipo tarea #${taskId} → ${correo}`);
    return;
  }
  await transport.sendMail({
    from,
    to:      correo,
    subject: `ALZAK Flow — Nueva respuesta del equipo en tu tarea #${taskId}`,
    html,
  });
  console.log(`✅ Email nota respuesta tarea #${taskId} → ${correo}`);
}

// ── sendCredentialsEmail ────────────────────────────────────────────────────────

/**
 * Notifica a un usuario que un administrador cambió sus credenciales de acceso.
 * Incluye la contraseña asignada y (si aplica) el aviso de cambio obligatorio.
 * @param {{ correo: string, nombre: string, password: string, requireChange?: boolean, adminNombre?: string }} param
 */
async function sendCredentialsEmail({ correo, nombre, password, requireChange = true, adminNombre }) {
  if (!correo || !password) return;
  const transport = buildTransport();
  const from      = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@alzakfoundation.org';
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL || 'https://appflow2026.vercel.app';

  const safeNombre = escapeHtml(nombre || correo);
  const safePass   = escapeHtml(password);
  const safeAdmin  = escapeHtml(adminNombre || 'un administrador');

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#1a365d;padding:28px 32px;">
            <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;">ALZAK Flow</h1>
            <p style="margin:6px 0 0;font-size:14px;color:#93c5fd;">Tus credenciales de acceso fueron actualizadas</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 8px;">
            <p style="margin:0 0 16px;font-size:15px;color:#334155;">
              Hola <strong>${safeNombre}</strong>,
            </p>
            <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">
              ${safeAdmin} restableció la contraseña de tu cuenta. Esta es tu nueva contraseña de acceso:
            </p>
            <div style="background:#f8fafc;border:1px dashed #94a3b8;border-radius:10px;padding:16px 20px;margin:0 0 20px;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Contraseña asignada</p>
              <p style="margin:0;font-size:20px;font-family:'Courier New',monospace;font-weight:700;color:#1a365d;letter-spacing:.03em;">${safePass}</p>
            </div>
            ${requireChange ? `
            <div style="background:#fffbeb;border-left:3px solid #eab308;border-radius:0 8px 8px 0;padding:12px 16px;margin:0 0 20px;">
              <p style="margin:0;font-size:13px;color:#854d0e;line-height:1.5;">
                🔐 Por seguridad, deberás <strong>definir una contraseña personal</strong> en tu próximo inicio de sesión.
              </p>
            </div>` : ''}
            <p style="margin:0 0 24px;">
              <a href="${appUrl}"
                 style="display:inline-block;background:#1a365d;color:#fff;font-size:13px;font-weight:700;
                        padding:12px 24px;border-radius:8px;text-decoration:none;">
                Iniciar sesión →
              </a>
            </p>
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
              Si no esperabas este cambio, contacta de inmediato al equipo de soporte.
            </p>
          </td>
        </tr>
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

  if (!transport) {
    console.log(`📧 [DRY-RUN] Credenciales → ${correo}`);
    return;
  }
  await transport.sendMail({
    from,
    to:      correo,
    subject: 'ALZAK Flow — Tus credenciales de acceso fueron actualizadas',
    html,
  });
  console.log(`✅ Email de credenciales → ${correo}`);
}

module.exports = { queueApprovedTask, sendConsolidatedEmails, sendPasswordResetEmail, sendTaskUpdateEmail, sendNoteReplyEmail, sendOfflineChatEmail, sendCredentialsEmail };
