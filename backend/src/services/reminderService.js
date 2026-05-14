/**
 * src/services/reminderService.js
 * Consulta tareas vencidas y próximas a vencer (≤ 3 días),
 * agrupa por responsable y envía UN correo HTML por persona.
 *
 * Llamado desde src/jobs/dailyReminder.js (cron diario 8:00 AM Colombia).
 */

const nodemailer = require('nodemailer');
const pool       = require('../config/db');

// ── Transporte (mismo patrón que emailService) ─────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtFecha(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function diasRestantes(dateStr) {
  const diff = new Date(dateStr + 'T12:00:00').setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const PRIO_COLOR = { Alta: '#dc2626', Media: '#d97706', Baja: '#16a34a' };
const PRIO_BG    = { Alta: '#fef2f2', Media: '#fffbeb', Baja: '#f0fdf4' };

// ── HTML ───────────────────────────────────────────────────────────────────────

function buildTaskRow(t) {
  const color = PRIO_COLOR[t.prioridad] || '#64748b';
  const bg    = PRIO_BG[t.prioridad]    || '#f8fafc';
  return `
    <tr style="background:${bg};border-bottom:1px solid #e2e8f0;">
      <td style="padding:11px 14px;font-size:13px;color:#1e293b;max-width:200px;word-wrap:break-word;">${t.tarea_descripcion}</td>
      <td style="padding:11px 8px;font-size:12px;color:#64748b;max-width:200px;word-wrap:break-word;">${t.nombre_proyecto || '—'}</td>
      <td style="padding:11px 8px;text-align:center;">
        <span style="background:${color};color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;">${t.prioridad}</span>
      </td>
      <td style="padding:11px 8px;font-size:12px;color:#475569;white-space:nowrap;">${fmtFecha(t.fecha_entrega)}</td>
    </tr>`;
}

function buildSectionTable(titulo, headerBg, headerColor, tareas) {
  if (!tareas.length) return '';
  const filas = tareas.map(buildTaskRow).join('');
  return `
    <tr>
      <td style="padding:20px 32px 0;">
        <div style="background:${headerBg};border-radius:10px 10px 0 0;padding:10px 16px;">
          <p style="margin:0;font-size:13px;font-weight:700;color:${headerColor};">${titulo} (${tareas.length})</p>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;overflow:hidden;">
          <thead>
            <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
              <th style="padding:8px 14px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Tarea</th>
              <th style="padding:8px 8px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Proyecto</th>
              <th style="padding:8px 8px;text-align:center;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Prioridad</th>
              <th style="padding:8px 8px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Vencimiento</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </td>
    </tr>`;
}

function buildReminderHtml(nombre, vencidas, proximas) {
  const totalVencidas = vencidas.length;
  const totalProximas = proximas.length;
  const total = totalVencidas + totalProximas;

  const resumenItems = [];
  if (totalVencidas) resumenItems.push(`<strong style="color:#dc2626;">${totalVencidas} vencida${totalVencidas !== 1 ? 's' : ''}</strong>`);
  if (totalProximas) resumenItems.push(`<strong style="color:#d97706;">${totalProximas} próxima${totalProximas !== 1 ? 's' : ''} a vencer</strong>`);

  const secVencidas = buildSectionTable(
    '🔴 Tareas vencidas — acción requerida',
    '#fef2f2', '#dc2626',
    vencidas,
  );
  const secProximas = buildSectionTable(
    '🟡 Próximas a vencer (en los próximos 3 días)',
    '#fffbeb', '#b45309',
    proximas,
  );

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a365d;padding:28px 32px;">
            <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;">ALZAK Flow</h1>
            <p style="margin:6px 0 0;font-size:14px;color:#93c5fd;">Recordatorio diario de tareas</p>
          </td>
        </tr>

        <!-- Saludo -->
        <tr>
          <td style="padding:24px 32px 12px;">
            <p style="margin:0;font-size:15px;color:#334155;">
              Hola <strong>${nombre}</strong>, tienes ${resumenItems.join(' y ')} en ALZAK Flow.
            </p>
          </td>
        </tr>

        ${secVencidas}
        ${secProximas}

        <!-- Espacio inferior -->
        <tr><td style="padding:8px 0;"></td></tr>

        <!-- Botón CTA -->
        <tr>
          <td style="padding:16px 32px 28px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://appflow2026.vercel.app'}/tareas"
               style="display:inline-block;background:#1a365d;color:#fff;font-size:13px;font-weight:700;
                      padding:12px 28px;border-radius:10px;text-decoration:none;">
              Ver mis tareas →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:14px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
              Este correo se envía automáticamente cada día a las 8:00 AM · Alzak Foundation
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── sendDailyReminders ─────────────────────────────────────────────────────────

/**
 * Punto de entrada del job.
 * Consulta tareas pendientes con fecha ≤ hoy+3, agrupa por responsable y envía.
 */
async function sendDailyReminders() {
  console.log('⏰ [reminder] Iniciando envío de recordatorios diarios...');

  // Consulta unificada: vencidas (dias < 0) + próximas (0 ≤ dias ≤ 3)
  const [rows] = await pool.query(`
    SELECT
      t.id                  AS id_tarea,
      t.tarea_descripcion,
      t.fecha_entrega,
      t.prioridad,
      t.responsable_correo,
      t.responsable_nombre,
      p.nombre_proyecto
    FROM tasks t
    LEFT JOIN projects p ON t.id_proyecto = p.id_proyecto
    WHERE
      t.estado_tarea       != 'Completada'
      AND t.fecha_entrega  IS NOT NULL
      AND t.responsable_correo IS NOT NULL
      AND t.responsable_correo != ''
      AND t.fecha_entrega  <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
    ORDER BY t.responsable_correo ASC, t.fecha_entrega ASC
  `);

  if (!rows.length) {
    console.log('✅ [reminder] Sin tareas vencidas ni próximas. No se envían correos.');
    return { sent: 0, recipients: [] };
  }

  // Agrupar por responsable
  const byResp = new Map();
  for (const row of rows) {
    if (!byResp.has(row.responsable_correo)) {
      byResp.set(row.responsable_correo, { nombre: row.responsable_nombre || row.responsable_correo.split('@')[0], vencidas: [], proximas: [] });
    }
    const entry = byResp.get(row.responsable_correo);
    const dias  = diasRestantes(row.fecha_entrega);
    if (dias < 0) entry.vencidas.push(row);
    else          entry.proximas.push(row);
  }

  const transport = buildTransport();
  const from      = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@alzakfoundation.org';
  const result    = { sent: 0, recipients: [] };

  for (const [correo, { nombre, vencidas, proximas }] of byResp) {
    // Omitir si solo tiene próximas con la misma fecha que ya se notificó (protección básica)
    // En esta versión simplificada: siempre enviar si hay algo que reportar
    if (!vencidas.length && !proximas.length) continue;

    const total = vencidas.length + proximas.length;
    const subject = vencidas.length
      ? `ALZAK Flow — Tienes ${vencidas.length} tarea${vencidas.length !== 1 ? 's' : ''} vencida${vencidas.length !== 1 ? 's' : ''} pendiente${vencidas.length !== 1 ? 's' : ''}`
      : `ALZAK Flow — ${total} tarea${total !== 1 ? 's' : ''} próxima${total !== 1 ? 's' : ''} a vencer`;

    const html = buildReminderHtml(nombre, vencidas, proximas);

    if (!transport) {
      console.log(`📧 [DRY-RUN] Reminder → ${correo} | vencidas: ${vencidas.length} | próximas: ${proximas.length} | SMTP no configurado`);
      result.recipients.push(correo);
      result.sent++;
      continue;
    }

    try {
      await transport.sendMail({ from, to: correo, subject, html });
      console.log(`✅ [reminder] Correo enviado a ${correo} | vencidas: ${vencidas.length} | próximas: ${proximas.length}`);
      result.recipients.push(correo);
      result.sent++;
    } catch (err) {
      console.error(`❌ [reminder] Error enviando a ${correo}:`, err.message);
    }
  }

  console.log(`⏰ [reminder] Finalizado — ${result.sent} correo(s) enviado(s)`);
  return result;
}

module.exports = { sendDailyReminders };
