/**
 * src/services/systemStatusService.js
 * Diagnóstico técnico diario del sistema para el superadmin (asistenteti).
 *
 * Diseño del correo: claro, legible y con lo accionable primero
 *   1. Estado general + semáforos
 *   2. KPIs clave (vencidas, completadas, usuarios, errores, sin leer, latencia)
 *   3. Tareas (desglose + quién está atrasado)
 *   4. Usuarios, actividad, salud del servidor, DB, email, notificaciones
 *   5. Alertas (errores, resets) y jobs programados
 */

const nodemailer = require('nodemailer');
const os         = require('os');
const pool       = require('../config/db');

// ── Helpers ───────────────────────────────────────────────────────────────────

function uptimeStr(secs) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(secs % 60)}s`;
}

function mbStr(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function pct(used, total) {
  return total > 0 ? Math.round((used / total) * 100) : 0;
}

/** Escapa contenido dinámico de la DB antes de meterlo en el HTML. */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buildTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: parseInt(SMTP_PORT || '587', 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: process.env.SMTP_TLS_INSECURE !== 'true' },
  });
}

// ── Recopilación de métricas ──────────────────────────────────────────────────

async function fetchTechData() {
  const mem     = process.memoryUsage();
  const cpus    = os.cpus();
  const load    = os.loadavg();
  const cpuLoad = load[0] / cpus.length; // load por core (último 1min)

  // DB latency
  const t0 = Date.now();
  await pool.query('SELECT 1');
  const dbLatency = Date.now() - t0;

  // Tamaños de tablas
  const [tables] = await pool.query(`
    SELECT TABLE_NAME AS name,
           TABLE_ROWS AS filas,
           ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 3) AS mb
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = ?
    ORDER BY TABLE_ROWS DESC
  `, [process.env.DB_NAME || 'alzak_flow_db']);

  // Actividad 24h
  const [actions24h] = await pool.query(`
    SELECT accion, COUNT(*) AS cnt
    FROM activity_logs
    WHERE created_at >= NOW() - INTERVAL 24 HOUR
    GROUP BY accion ORDER BY cnt DESC
  `);
  const [modules24h] = await pool.query(`
    SELECT modulo, COUNT(*) AS cnt
    FROM activity_logs
    WHERE created_at >= NOW() - INTERVAL 24 HOUR
    GROUP BY modulo ORDER BY cnt DESC LIMIT 8
  `);
  const [activity_meta] = await pool.query(`
    SELECT
      COUNT(*) AS total_requests,
      COUNT(DISTINCT usuario_correo) AS unique_users,
      COUNT(DISTINCT ip_address) AS unique_ips
    FROM activity_logs
    WHERE created_at >= NOW() - INTERVAL 24 HOUR
  `);

  // Email stats
  const [email24h] = await pool.query(`SELECT COUNT(*) AS cnt FROM pending_emails WHERE enviado=1 AND sent_at >= NOW()-INTERVAL 24 HOUR`);
  const [email7d]  = await pool.query(`SELECT COUNT(*) AS cnt FROM pending_emails WHERE enviado=1 AND sent_at >= NOW()-INTERVAL 7 DAY`);
  const [emailFail]= await pool.query(`SELECT COUNT(*) AS cnt FROM pending_emails WHERE enviado=0 AND created_at < NOW()-INTERVAL 2 HOUR`);
  const [emailTot] = await pool.query(`SELECT COUNT(*) AS total, SUM(enviado=1) AS enviados FROM pending_emails`);

  // Notificaciones
  const [notifStats] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(leido = 1) AS leidas,
      SUM(leido = 0) AS no_leidas,
      SUM(created_at >= NOW() - INTERVAL 24 HOUR) AS nuevas_24h,
      SUM(created_at >= NOW() - INTERVAL 7 DAY)   AS nuevas_7d
    FROM db_notifications
  `);
  const [notifTipos] = await pool.query(`
    SELECT tipo, COUNT(*) AS cnt FROM db_notifications
    GROUP BY tipo ORDER BY cnt DESC
  `);

  // Notas de chat
  const [notas24h] = await pool.query(`SELECT COUNT(*) AS cnt FROM task_notas WHERE created_at >= NOW()-INTERVAL 24 HOUR`);
  const [notasTotal] = await pool.query(`SELECT COUNT(*) AS cnt FROM task_notas`);

  // Usuarios inactivos
  const [inactivos] = await pool.query(`SELECT email, nombre_complete FROM users WHERE activo=0`);

  // Usuarios por rol
  const [usersByRole] = await pool.query(`
    SELECT role, COUNT(*) AS total, SUM(activo=1) AS activos
    FROM users GROUP BY role ORDER BY FIELD(role,'superadmin','admin','user')
  `);

  // Errores en activity_logs 24h
  const [errors24h] = await pool.query(`
    SELECT usuario_correo, accion, modulo, detalle, created_at
    FROM activity_logs
    WHERE created_at >= NOW()-INTERVAL 24 HOUR
      AND (detalle LIKE '%error%' OR detalle LIKE '%Error%' OR detalle LIKE '%fail%')
    ORDER BY created_at DESC LIMIT 5
  `);

  // Últimas resets de contraseña
  const [resets24h] = await pool.query(`
    SELECT email, created_at, used FROM password_resets
    WHERE created_at >= NOW()-INTERVAL 24 HOUR
    ORDER BY created_at DESC LIMIT 5
  `);

  // Tareas — desglose por estado
  const [tareasKpi] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(estado_tarea='Completada')  AS completadas,
      SUM(estado_tarea='En Proceso')  AS en_proceso,
      SUM(estado_tarea='Pendiente')   AS pendientes,
      SUM(fecha_entrega < CURDATE() AND estado_tarea != 'Completada') AS vencidas
    FROM tasks
  `);

  // Quién está atrasado — top responsables con tareas vencidas (accionable)
  const [vencidasPorResp] = await pool.query(`
    SELECT responsable_nombre AS nombre, COUNT(*) AS c
    FROM tasks
    WHERE fecha_entrega < CURDATE() AND estado_tarea != 'Completada'
      AND responsable_correo IS NOT NULL AND responsable_correo <> ''
    GROUP BY responsable_correo, responsable_nombre
    ORDER BY c DESC LIMIT 5
  `);

  return {
    runtime: {
      nodeVersion: process.version,
      uptime:      process.uptime(),
      heapUsed:    mem.heapUsed,
      heapTotal:   mem.heapTotal,
      rss:         mem.rss,
      external:    mem.external,
    },
    os: {
      cpuCount:  cpus.length,
      cpuModel:  cpus[0]?.model?.trim() || '—',
      loadAvg:   load,
      cpuLoad,
      freeMem:   os.freemem(),
      totalMem:  os.totalmem(),
      platform:  os.platform(),
    },
    db: { latency: dbLatency, tables },
    activity: { meta: activity_meta[0], actions: actions24h, modules: modules24h },
    email: {
      sent24h:  email24h[0].cnt,
      sent7d:   email7d[0].cnt,
      failed:   emailFail[0].cnt,
      total:    emailTot[0].total,
      totalSent:emailTot[0].enviados,
    },
    notifs: { ...notifStats[0], tipos: notifTipos },
    notas: { last24h: notas24h[0].cnt, total: notasTotal[0].cnt },
    inactivos,
    usersByRole,
    errors24h,
    resets24h,
    tareas: tareasKpi[0],
    vencidasPorResp,
    smtp: { host: process.env.SMTP_HOST || null, user: process.env.SMTP_USER || null },
  };
}

// ── Builder HTML ──────────────────────────────────────────────────────────────

function buildTechHtml(d) {
  const hoy  = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://appflow2026.vercel.app';

  const { runtime, os: osData, db, activity, email, notifs, notas, inactivos, usersByRole, errors24h, resets24h, tareas, vencidasPorResp, smtp } = d;

  // ── Umbrales (latencia DB: túnel SSH a DigitalOcean tiene ~500ms normales) ──
  const heapPct  = pct(runtime.heapUsed, runtime.heapTotal);
  const memUsedPct = 100 - (osData.freeMem / osData.totalMem) * 100;
  const perCore  = osData.cpuLoad;

  const st = (icon) => ({
    '✅': { bg: '#dcfce7', bd: '#bbf7d0', fg: '#15803d' },
    '🟡': { bg: '#fef3c7', bd: '#fde68a', fg: '#b45309' },
    '🔴': { bg: '#fee2e2', bd: '#fecaca', fg: '#b91c1c' },
  }[icon]);

  const dbIcon   = db.latency < 600 ? '✅' : db.latency < 1200 ? '🟡' : '🔴';
  const heapIcon = heapPct < 75 ? '✅' : heapPct < 90 ? '🟡' : '🔴';
  const memIcon  = memUsedPct < 80 ? '✅' : memUsedPct < 92 ? '🟡' : '🔴';
  const errIcon  = errors24h.length === 0 ? '✅' : '🟡';

  const semaforos = [
    { label: 'API Runtime', icon: '✅' },
    { label: 'DB Latencia', icon: dbIcon },
    { label: 'Heap Node',   icon: heapIcon },
    { label: 'Memoria OS',  icon: memIcon },
    { label: 'Email SMTP',  icon: smtp.host ? '✅' : '🔴' },
    { label: 'Errores 24h', icon: errIcon },
  ];
  // El badge refleja la salud TÉCNICA del sistema; las tareas vencidas van en el
  // asunto y en su propio KPI (son negocio, no un fallo técnico).
  const overallCrit = semaforos.some(s => s.icon === '🔴');
  const overallWarn = semaforos.some(s => s.icon === '🟡');
  const estado = overallCrit
    ? { txt: 'REQUIERE ATENCIÓN', bg: '#b91c1c', fg: '#ffffff' }
    : overallWarn
      ? { txt: 'CON OBSERVACIONES', bg: '#b45309', fg: '#ffffff' }
      : { txt: 'TODO EN ORDEN', bg: '#15803d', fg: '#ffffff' };

  const semChips = semaforos.map(s => {
    const c = st(s.icon);
    return `<span style="display:inline-block;margin:3px 4px 3px 0;background:${c.bg};border:1px solid ${c.bd};border-radius:999px;padding:5px 11px;font-size:12px;font-weight:600;color:${c.fg};">${s.icon} ${s.label}</span>`;
  }).join('');

  // ── KPIs hero ───────────────────────────────────────────────────────────────
  const totalT = Number(tareas.total) || 0;
  const complT = Number(tareas.completadas) || 0;
  const vencT  = Number(tareas.vencidas) || 0;
  const activosTot = usersByRole.reduce((a, u) => a + Number(u.activos), 0);
  const usersTot   = usersByRole.reduce((a, u) => a + Number(u.total), 0);
  const noLeidas   = Number(notifs.no_leidas) || 0;

  const kpi = (valor, label, fg, bg) =>
    `<td width="33%" valign="top" style="padding:5px;">
      <div style="background:${bg};border-radius:14px;padding:16px 8px;text-align:center;">
        <div style="font-size:28px;font-weight:800;color:${fg};line-height:1;">${valor}</div>
        <div style="margin-top:6px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.03em;">${label}</div>
      </div>
    </td>`;

  const kpiGrid = `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        ${kpi(vencT, 'Tareas vencidas', vencT > 0 ? '#b91c1c' : '#15803d', vencT > 0 ? '#fee2e2' : '#dcfce7')}
        ${kpi(pct(complT, totalT) + '%', 'Completadas', '#1d4ed8', '#dbeafe')}
        ${kpi(`${activosTot}/${usersTot}`, 'Usuarios activos', '#0f766e', '#ccfbf1')}
      </tr>
      <tr>
        ${kpi(errors24h.length, 'Errores 24h', errors24h.length > 0 ? '#b45309' : '#15803d', errors24h.length > 0 ? '#fef3c7' : '#dcfce7')}
        ${kpi(noLeidas, 'Notif. sin leer', noLeidas > 100 ? '#b45309' : '#475569', noLeidas > 100 ? '#fef3c7' : '#f1f5f9')}
        ${kpi(db.latency + 'ms', 'Latencia DB', st(dbIcon).fg, st(dbIcon).bg)}
      </tr>
    </table>`;

  // ── Secciones ────────────────────────────────────────────────────────────────
  const sec = (titulo, contenido) => `
  <tr><td style="padding:20px 26px 0;">
    <p style="margin:0 0 10px;font-size:12px;font-weight:800;color:#1a365d;letter-spacing:.03em;text-transform:uppercase;">${titulo}</p>
    ${contenido}
  </td></tr>`;

  const card = (inner) => `<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">${inner}</div>`;

  const kvRows = (pairs) => pairs.map(([k, v], i) =>
    `<tr><td style="padding:9px 14px;font-size:12px;color:#64748b;width:46%;${i ? 'border-top:1px solid #f1f5f9;' : ''}">${k}</td>
      <td style="padding:9px 14px;font-size:12px;color:#1e293b;font-weight:600;${i ? 'border-top:1px solid #f1f5f9;' : ''}">${v}</td></tr>`).join('');

  // Tareas: barra desglose + atrasados
  const tareasSec = card(`
    <div style="padding:14px 16px;">
      <p style="margin:0 0 10px;font-size:13px;color:#334155;">
        <strong style="color:#1e293b;">${totalT}</strong> tareas ·
        <span style="color:#15803d;font-weight:700;">${complT} completadas</span> ·
        <span style="color:#1d4ed8;font-weight:700;">${Number(tareas.en_proceso) || 0} en proceso</span> ·
        <span style="color:#64748b;font-weight:700;">${Number(tareas.pendientes) || 0} pendientes</span> ·
        <span style="color:${vencT > 0 ? '#b91c1c' : '#15803d'};font-weight:700;">${vencT} vencidas</span>
      </p>
      ${vencidasPorResp.length ? `
      <p style="margin:6px 0 6px;font-size:11px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:.03em;">Con tareas vencidas</p>
      ${vencidasPorResp.map(r => `<span style="display:inline-block;margin:2px 4px 2px 0;background:#fef2f2;border:1px solid #fecaca;border-radius:999px;padding:3px 10px;font-size:11px;color:#991b1b;">${esc(r.nombre || 'Sin nombre')} · <strong>${r.c}</strong></span>`).join('')}
      ` : '<p style="margin:0;font-size:12px;color:#15803d;">✓ Nadie con tareas vencidas.</p>'}
    </div>`);

  // Usuarios
  const rolesRows = usersByRole.map((u, i) =>
    `<tr><td style="padding:8px 14px;font-size:12px;font-weight:600;color:#334155;text-transform:capitalize;${i ? 'border-top:1px solid #f1f5f9;' : ''}">${esc(u.role)}</td>
      <td style="padding:8px 14px;font-size:12px;color:#15803d;text-align:center;font-weight:700;${i ? 'border-top:1px solid #f1f5f9;' : ''}">${u.activos}</td>
      <td style="padding:8px 14px;font-size:12px;color:#64748b;text-align:center;${i ? 'border-top:1px solid #f1f5f9;' : ''}">${u.total}</td></tr>`).join('');
  const usuariosSec = card(`
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr style="background:#f8fafc;"><th style="padding:7px 14px;text-align:left;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;">Rol</th>
        <th style="padding:7px 14px;text-align:center;font-size:10px;color:#94a3b8;text-transform:uppercase;">Activos</th>
        <th style="padding:7px 14px;text-align:center;font-size:10px;color:#94a3b8;text-transform:uppercase;">Total</th></tr>
      ${rolesRows}
    </table>`) + (inactivos.length ? `
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:10px 14px;margin-top:8px;">
      <p style="margin:0 0 4px;font-size:11px;color:#9a3412;font-weight:700;">⚠ Cuentas inactivas (${inactivos.length})</p>
      <p style="margin:0;font-size:11px;color:#7c2d12;line-height:1.5;">${inactivos.map(u => esc(u.nombre_complete)).join(' · ')}</p>
    </div>` : '');

  // Actividad
  const chip = (txt, bg, fg) => `<span style="display:inline-block;margin:2px 3px 2px 0;background:${bg};border-radius:6px;padding:3px 9px;font-size:11px;color:${fg};">${txt}</span>`;
  const actividadSec = card(`
    <div style="padding:14px 16px;">
      <p style="margin:0 0 10px;font-size:13px;color:#334155;">
        <strong>${activity.meta.total_requests}</strong> acciones ·
        <strong>${activity.meta.unique_users}</strong> usuarios ·
        <strong>${activity.meta.unique_ips}</strong> IPs
      </p>
      <div>${activity.modules.map(m => chip(`${esc(m.modulo)} ×${m.cnt}`, '#eff6ff', '#1d4ed8')).join('') || '<span style="font-size:11px;color:#94a3b8;">Sin actividad</span>'}</div>
    </div>`);

  // Salud del servidor (runtime + OS)
  const saludSec = card(`<table width="100%" cellpadding="0" cellspacing="0" role="presentation">${kvRows([
    ['Uptime del proceso', uptimeStr(runtime.uptime)],
    ['Node.js', runtime.nodeVersion + ' · ' + osData.platform],
    ['Memoria heap', `${mbStr(runtime.heapUsed)} / ${mbStr(runtime.heapTotal)} (${heapPct}%)`],
    ['RAM del servidor', `${(osData.freeMem/1073741824).toFixed(1)} GB libres de ${(osData.totalMem/1073741824).toFixed(0)} GB (${memUsedPct.toFixed(0)}% usada)`],
    ['CPU (load / core)', `${perCore.toFixed(2)} · ${osData.cpuCount} cores`],
    ['Latencia a la BD', `${db.latency} ms ${db.latency >= 600 ? '(túnel SSH lento)' : '(normal)'}`],
  ])}</table>`);

  // Base de datos
  const dbRows = db.tables.slice(0, 8).map((t, i) =>
    `<tr><td style="padding:6px 14px;font-size:11px;color:#334155;${i ? 'border-top:1px solid #f1f5f9;' : ''}">${esc(t.name || '—')}</td>
      <td style="padding:6px 14px;font-size:11px;color:#64748b;text-align:right;${i ? 'border-top:1px solid #f1f5f9;' : ''}">${(t.filas || 0).toLocaleString('es-CO')}</td>
      <td style="padding:6px 14px;font-size:11px;color:#94a3b8;text-align:right;${i ? 'border-top:1px solid #f1f5f9;' : ''}">${t.mb || 0} MB</td></tr>`).join('');
  const dbSec = card(`
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr style="background:#f8fafc;"><th style="padding:7px 14px;text-align:left;font-size:10px;color:#94a3b8;text-transform:uppercase;">Tabla</th>
        <th style="padding:7px 14px;text-align:right;font-size:10px;color:#94a3b8;text-transform:uppercase;">Filas</th>
        <th style="padding:7px 14px;text-align:right;font-size:10px;color:#94a3b8;text-transform:uppercase;">Tamaño</th></tr>
      ${dbRows}
    </table>`);

  // Email + Notificaciones
  const emailNotifSec = card(`<table width="100%" cellpadding="0" cellspacing="0" role="presentation">${kvRows([
    ['Correos enviados (24h / 7d)', `${email.sent24h} / ${email.sent7d}`],
    ['Correos atascados', `<span style="color:${Number(email.failed) > 0 ? '#b91c1c' : '#15803d'};font-weight:700;">${email.failed}</span>`],
    ['SMTP', smtp.host ? `✅ ${esc(smtp.host)}` : '🔴 no configurado'],
    ['Notificaciones (sin leer / total)', `${notifs.no_leidas} / ${notifs.total}`],
    ['Notas de chat (hoy / total)', `${notas.last24h} / ${notas.total}`],
  ])}</table>`);

  // Alertas: errores + resets
  const erroresHtml = errors24h.length
    ? errors24h.map((e, i) => `<tr>
        <td style="padding:7px 14px;font-size:11px;color:#991b1b;font-weight:600;${i ? 'border-top:1px solid #fee2e2;' : ''}">${esc(e.modulo)}</td>
        <td style="padding:7px 14px;font-size:11px;color:#475569;${i ? 'border-top:1px solid #fee2e2;' : ''}">${esc((e.detalle || '').slice(0, 70))}</td>
        <td style="padding:7px 14px;font-size:11px;color:#94a3b8;white-space:nowrap;${i ? 'border-top:1px solid #fee2e2;' : ''}">${new Date(e.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</td></tr>`).join('')
    : `<tr><td style="padding:10px 14px;font-size:12px;color:#15803d;">✓ Sin errores registrados en 24h</td></tr>`;
  const resetsLine = resets24h.length
    ? resets24h.map(r => `${esc(r.email)} (${r.used ? '✓ usado' : '⏳ pendiente'})`).join(' · ')
    : 'Ninguno en 24h';
  const alertasSec = card(`
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${erroresHtml}</table>
    <div style="padding:9px 14px;border-top:1px solid #f1f5f9;">
      <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.03em;">Resets de contraseña 24h:</span>
      <span style="font-size:11px;color:#475569;"> ${resetsLine}</span>
    </div>`);

  // Jobs
  const jobs = [
    ['Recordatorio diario', '8:00 AM', 'Tareas vencidas/próximas → responsables'],
    ['Diagnóstico técnico', '8:00 AM', 'Este informe → superadmin'],
    ['Limpieza semanal', 'Dom 3:00 AM', 'Purga notificaciones/emails obsoletos'],
  ];
  const jobsSec = card(`<table width="100%" cellpadding="0" cellspacing="0" role="presentation">${jobs.map(([n, c, desc], i) =>
    `<tr><td style="padding:8px 14px;font-size:12px;color:#1e293b;font-weight:600;${i ? 'border-top:1px solid #f1f5f9;' : ''}">✅ ${n}</td>
      <td style="padding:8px 14px;font-size:11px;color:#1d4ed8;white-space:nowrap;${i ? 'border-top:1px solid #f1f5f9;' : ''}">${c}</td>
      <td style="padding:8px 14px;font-size:11px;color:#94a3b8;${i ? 'border-top:1px solid #f1f5f9;' : ''}">${desc}</td></tr>`).join('')}</table>`);

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#eef2f6;padding:24px 12px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08);">

  <!-- HEADER -->
  <tr>
    <td style="background:#1a365d;padding:24px 26px;">
      <p style="margin:0;font-size:11px;color:#93c5fd;letter-spacing:.08em;text-transform:uppercase;">ALZAK Flow · Sistema de Gestión</p>
      <h1 style="margin:6px 0 0;font-size:21px;color:#ffffff;font-weight:800;">📊 Diagnóstico Técnico Diario</h1>
      <p style="margin:10px 0 0;font-size:12px;color:#cbd5e1;text-transform:capitalize;">${hoy} · ${hora} COT</p>
      <span style="display:inline-block;margin-top:12px;background:${estado.bg};color:${estado.fg};font-size:12px;font-weight:800;padding:6px 14px;border-radius:999px;letter-spacing:.02em;">● ${estado.txt}</span>
    </td>
  </tr>

  <!-- SEMÁFOROS -->
  <tr><td style="padding:18px 26px 4px;">${semChips}</td></tr>

  <!-- KPIs -->
  <tr><td style="padding:12px 22px 4px;">${kpiGrid}</td></tr>

  ${sec('📋 Tareas', tareasSec)}
  ${sec('👥 Usuarios', usuariosSec)}
  ${sec('⚡ Actividad · últimas 24 h', actividadSec)}
  ${sec('🖥️ Salud del servidor', saludSec)}
  ${sec('🗄️ Base de datos', dbSec)}
  ${sec('✉️ Correo y notificaciones', emailNotifSec)}
  ${sec('🚨 Alertas', alertasSec)}
  ${sec('⏱️ Jobs programados', jobsSec)}

  <!-- CTA -->
  <tr><td style="padding:22px 26px 8px;" align="center">
    <a href="${appUrl}" style="display:inline-block;background:#1a365d;color:#ffffff;font-size:13px;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;">Abrir ALZAK Flow →</a>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#f8fafc;padding:16px 26px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.5;">
      Informe automático · 8:00 AM (hora Colombia) · para el superadministrador<br>
      Alzak Foundation · Sistema de Gestión de Proyectos Clínicos
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── sendSystemStatus ──────────────────────────────────────────────────────────

async function sendSystemStatus() {
  const DEST = process.env.SYSTEM_STATUS_EMAIL || 'asistenteti@alzakfoundation.org';
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@alzakfoundation.org';

  console.log('📊 [systemStatus] Recopilando métricas técnicas...');
  const data = await fetchTechData();

  const vencidas = Number(data.tareas.vencidas) || 0;
  const fecha    = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  const subject  = vencidas > 0
    ? `⚠️ ALZAK Flow — Diagnóstico Técnico · ${vencidas} tareas vencidas · ${fecha}`
    : `✅ ALZAK Flow — Diagnóstico Técnico · Sistemas OK · ${fecha}`;

  const html      = buildTechHtml(data);
  const transport = buildTransport();

  if (!transport) {
    console.log(`📧 [DRY-RUN] systemStatus → ${DEST}`);
    return { sent: false, dry: true, dest: DEST };
  }

  await transport.sendMail({ from, to: DEST, subject, html });
  console.log(`✅ [systemStatus] Diagnóstico técnico enviado → ${DEST}`);
  return { sent: true, dest: DEST, dbLatency: data.db.latency, vencidas };
}

module.exports = { sendSystemStatus };
