/**
 * src/services/systemStatusService.js
 * Diagnóstico técnico diario del sistema para el superadmin/dev.
 *
 * Métricas recopiladas:
 *   - Runtime Node.js: uptime, heap, RSS, versión
 *   - OS: CPUs, RAM libre, load average (con contexto por core)
 *   - DB: latencia de conexión, tamaño y filas por tabla
 *   - Actividad 24h: requests, acciones, módulos, IPs únicas
 *   - Email: entregados 24h / 7d / atascados
 *   - Notificaciones: total, leídas, sin leer, nuevas 24h
 *   - Usuarios inactivos
 *   - Jobs programados (estado declarativo)
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

// Semáforo visual simple
function light(ok, warn, crit, val) {
  if (val >= crit)  return { icon: '🔴', level: 'CRÍTICO' };
  if (val >= warn)  return { icon: '🟡', level: 'ATENCIÓN' };
  return { icon: '✅', level: 'OK' };
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

  // Intentos de auth fallidos (tokens expirados en logs no van a activity_logs,
  // pero sí va el Login exitoso — calculamos diferencia vs sesiones activas)
  const [failedAuth] = await pool.query(`
    SELECT COUNT(*) AS cnt FROM password_resets
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

  // Notificaciones por tipo
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

  // Tareas KPI rápido (solo para contexto)
  const [tareasKpi] = await pool.query(`
    SELECT
      COUNT(*) AS total,
      SUM(estado_tarea='Completada') AS completadas,
      SUM(fecha_entrega < CURDATE() AND estado_tarea != 'Completada') AS vencidas
    FROM tasks
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
    db: {
      latency: dbLatency,
      tables,
    },
    activity: {
      meta:    activity_meta[0],
      actions: actions24h,
      modules: modules24h,
    },
    email: {
      sent24h:  email24h[0].cnt,
      sent7d:   email7d[0].cnt,
      failed:   emailFail[0].cnt,
      total:    emailTot[0].total,
      totalSent:emailTot[0].enviados,
    },
    notifs: {
      ...notifStats[0],
      tipos: notifTipos,
    },
    notas: {
      last24h: notas24h[0].cnt,
      total:   notasTotal[0].cnt,
    },
    inactivos,
    usersByRole,
    errors24h,
    resets24h,
    tareas: tareasKpi[0],
    smtp: {
      host: process.env.SMTP_HOST || null,
      user: process.env.SMTP_USER || null,
    },
  };
}

// ── Builder HTML ──────────────────────────────────────────────────────────────

function buildTechHtml(d) {
  const hoy  = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });

  const { runtime, os: osData, db, activity, email, notifs, notas, inactivos, usersByRole, errors24h, resets24h, tareas, smtp } = d;

  // ── Thresholds técnicos ────────────────────────────────────────────────────
  const dbOk     = db.latency < 300;
  const dbWarn   = db.latency >= 300 && db.latency < 600;
  const heapPct  = pct(runtime.heapUsed, runtime.heapTotal);
  const memFree  = (osData.freeMem / osData.totalMem) * 100;
  const perCore  = osData.cpuLoad;

  const semaforos = [
    { label: 'API Runtime',    ok: true,             icon: '✅' },
    { label: 'DB Latencia',    ok: dbOk,             icon: dbWarn ? '🟡' : (db.latency >= 600 ? '🔴' : '✅') },
    { label: 'Heap Node.js',   ok: heapPct < 80,     icon: heapPct >= 90 ? '🔴' : heapPct >= 70 ? '🟡' : '✅' },
    { label: 'Memoria OS',     ok: memFree > 20,     icon: memFree < 10 ? '🔴' : memFree < 20 ? '🟡' : '✅' },
    { label: 'Email SMTP',     ok: !!smtp.host,      icon: smtp.host ? '✅' : '🔴' },
    { label: 'Errores 24h',    ok: errors24h.length === 0, icon: errors24h.length > 0 ? '🟡' : '✅' },
  ];

  const overallOk = semaforos.every(s => s.icon === '✅');
  const overallCrit = semaforos.some(s => s.icon === '🔴');

  const semChips = semaforos.map(s =>
    `<span style="display:inline-block;margin:3px;background:${s.icon==='✅'?'#f0fdf4':s.icon==='🟡'?'#fffbeb':'#fef2f2'};border:1px solid ${s.icon==='✅'?'#bbf7d0':s.icon==='🟡'?'#fde68a':'#fecaca'};border-radius:8px;padding:5px 10px;font-size:12px;color:#334155;">
      ${s.icon} <strong>${s.label}</strong>
    </span>`).join('');

  // ── Runtime block ──────────────────────────────────────────────────────────
  const runtimeRows = [
    ['Node.js versión',   runtime.nodeVersion],
    ['Uptime proceso',    uptimeStr(runtime.uptime)],
    ['Heap usado',        `${mbStr(runtime.heapUsed)} / ${mbStr(runtime.heapTotal)} (${heapPct}%)`],
    ['RSS (memoria real)',`${mbStr(runtime.rss)}`],
    ['External',          `${mbStr(runtime.external)}`],
  ].map(([k,v]) => `<tr><td style="padding:6px 12px;font-size:12px;color:#64748b;width:42%;border-bottom:1px solid #f1f5f9;">${k}</td><td style="padding:6px 12px;font-size:12px;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9;">${v}</td></tr>`).join('');

  // ── OS block ──────────────────────────────────────────────────────────────
  const perCoreIcon = perCore > 2 ? '🔴' : perCore > 1 ? '🟡' : '✅';
  const osRows = [
    ['CPUs',              `${osData.cpuCount} cores`],
    ['Load avg (1/5/15m)',`${osData.loadAvg.map(l=>l.toFixed(2)).join(' / ')} ${perCoreIcon} → ${perCore.toFixed(2)} por core`],
    ['RAM libre',         `${(osData.freeMem/1024/1024/1024).toFixed(2)} GB / ${(osData.totalMem/1024/1024/1024).toFixed(2)} GB (${(100-memFree).toFixed(0)}% usado)`],
    ['Plataforma',        osData.platform],
  ].map(([k,v]) => `<tr><td style="padding:6px 12px;font-size:12px;color:#64748b;width:42%;border-bottom:1px solid #f1f5f9;">${k}</td><td style="padding:6px 12px;font-size:12px;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9;">${v}</td></tr>`).join('');

  // ── DB block ──────────────────────────────────────────────────────────────
  const dbIcon  = db.latency < 300 ? '✅' : db.latency < 600 ? '🟡' : '🔴';
  const dbRows = db.tables.map(t =>
    `<tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:5px 12px;font-size:11px;font-family:monospace;color:#1e293b;">${t.name || '—'}</td>
      <td style="padding:5px 8px;font-size:11px;color:#334155;text-align:right;">${(t.filas || 0).toLocaleString('es-CO')} filas</td>
      <td style="padding:5px 8px;font-size:11px;color:#64748b;text-align:right;">${t.mb || 0} MB</td>
    </tr>`).join('');

  // ── Activity block ─────────────────────────────────────────────────────────
  const actRows = activity.actions.map(a =>
    `<span style="display:inline-block;margin:2px;background:#f1f5f9;border-radius:6px;padding:3px 8px;font-size:11px;color:#334155;">${a.accion} ×${a.cnt}</span>`).join('');
  const modRows = activity.modules.map(m =>
    `<span style="display:inline-block;margin:2px;background:#eff6ff;border-radius:6px;padding:3px 8px;font-size:11px;color:#1d4ed8;">${m.modulo} ×${m.cnt}</span>`).join('');

  // ── Notif tipos ────────────────────────────────────────────────────────────
  const notifTiposHtml = notifs.tipos.map(t =>
    `<span style="display:inline-block;margin:2px;background:#f8fafc;border-radius:6px;padding:3px 8px;font-size:11px;color:#334155;">${t.tipo} ×${t.cnt}</span>`).join('');

  // ── Users by role ──────────────────────────────────────────────────────────
  const rolesHtml = usersByRole.map(u =>
    `<tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:5px 12px;font-size:12px;font-weight:600;color:#334155;">${u.role}</td>
      <td style="padding:5px 8px;font-size:12px;color:#64748b;text-align:center;">${u.activos}</td>
      <td style="padding:5px 8px;font-size:12px;color:#64748b;text-align:center;">${u.total}</td>
    </tr>`).join('');

  // ── Inactivos ──────────────────────────────────────────────────────────────
  const inactivosHtml = inactivos.length
    ? inactivos.map(u => `<li style="font-size:12px;color:#dc2626;margin:2px 0;">${u.nombre_complete} — <code style="font-size:11px;">${u.email}</code></li>`).join('')
    : '<li style="font-size:12px;color:#16a34a;">Ninguno</li>';

  // ── Password resets ────────────────────────────────────────────────────────
  const resetsHtml = resets24h.length
    ? resets24h.map(r =>
        `<tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:5px 12px;font-size:11px;color:#334155;">${r.email}</td>
          <td style="padding:5px 8px;font-size:11px;color:#64748b;text-align:center;">${r.used ? '✅ usado' : '⏳ pendiente'}</td>
          <td style="padding:5px 8px;font-size:11px;color:#94a3b8;">${new Date(r.created_at).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}</td>
        </tr>`).join('')
    : `<tr><td colspan="3" style="padding:8px 12px;font-size:12px;color:#94a3b8;">Ninguna en las últimas 24h</td></tr>`;

  // ── Errores ────────────────────────────────────────────────────────────────
  const erroresHtml = errors24h.length
    ? errors24h.map(e =>
        `<tr style="border-bottom:1px solid #fecaca;">
          <td style="padding:5px 12px;font-size:11px;color:#991b1b;">${e.modulo}</td>
          <td style="padding:5px 8px;font-size:11px;color:#334155;word-break:break-all;">${(e.detalle||'').slice(0,80)}</td>
          <td style="padding:5px 8px;font-size:11px;color:#94a3b8;white-space:nowrap;">${new Date(e.created_at).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}</td>
        </tr>`).join('')
    : `<tr><td colspan="3" style="padding:8px 12px;font-size:12px;color:#16a34a;">✅ Sin errores registrados</td></tr>`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://appflow2026.vercel.app';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Courier New',Courier,monospace;background:#0f172a;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
<tr><td align="center">
<table width="700" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;">

  <!-- HEADER -->
  <tr>
    <td style="background:#0f172a;padding:20px 28px;border-bottom:1px solid #334155;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0;font-size:10px;color:#64748b;font-family:monospace;letter-spacing:.1em;">ALZAK FLOW · SISTEMA DE GESTIÓN</p>
            <h1 style="margin:4px 0 0;font-size:18px;color:#f8fafc;font-family:monospace;font-weight:700;">📊 Diagnóstico Técnico Diario</h1>
          </td>
          <td style="text-align:right;vertical-align:top;">
            <p style="margin:0;font-size:11px;color:#64748b;font-family:monospace;">${hoy}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#94a3b8;font-family:monospace;">Generado: ${hora} COT</p>
            <span style="display:inline-block;margin-top:6px;background:${overallCrit?'#7f1d1d':overallOk?'#14532d':'#713f12'};color:${overallCrit?'#fca5a5':overallOk?'#86efac':'#fde047'};border:1px solid ${overallCrit?'#991b1b':overallOk?'#16a34a':'#a16207'};font-size:10px;font-weight:700;padding:3px 10px;border-radius:4px;font-family:monospace;letter-spacing:.05em;">${overallCrit?'● CRÍTICO':overallOk?'● ALL SYSTEMS OK':'● REVISAR'}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- SEMÁFOROS -->
  <tr>
    <td style="padding:16px 28px;border-bottom:1px solid #334155;background:#0f172a;">
      ${semChips}
    </td>
  </tr>

  <!-- RUNTIME NODE.JS -->
  <tr><td style="padding:16px 28px 0;">
    <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#60a5fa;font-family:monospace;letter-spacing:.1em;text-transform:uppercase;">▸ Runtime Node.js</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;overflow:hidden;border:1px solid #334155;">
      <tbody>${runtimeRows}</tbody>
    </table>
  </td></tr>

  <!-- OS -->
  <tr><td style="padding:16px 28px 0;">
    <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#60a5fa;font-family:monospace;letter-spacing:.1em;text-transform:uppercase;">▸ Sistema Operativo</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;overflow:hidden;border:1px solid #334155;">
      <tbody>${osRows}</tbody>
    </table>
  </td></tr>

  <!-- DB -->
  <tr><td style="padding:16px 28px 0;">
    <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#60a5fa;font-family:monospace;letter-spacing:.1em;text-transform:uppercase;">▸ Base de Datos — MySQL vía SSH Tunnel (DigitalOcean)</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;overflow:hidden;border:1px solid #334155;">
      <thead>
        <tr style="background:#1e293b;">
          <th style="padding:6px 12px;text-align:left;font-size:10px;color:#64748b;font-family:monospace;letter-spacing:.05em;">TABLA</th>
          <th style="padding:6px 8px;text-align:right;font-size:10px;color:#64748b;font-family:monospace;letter-spacing:.05em;">FILAS</th>
          <th style="padding:6px 8px;text-align:right;font-size:10px;color:#64748b;font-family:monospace;letter-spacing:.05em;">TAMAÑO</th>
        </tr>
      </thead>
      <tbody>${dbRows}</tbody>
      <tfoot>
        <tr><td colspan="3" style="padding:8px 12px;font-size:11px;color:${dbIcon==='✅'?'#86efac':dbIcon==='🟡'?'#fde047':'#fca5a5'};font-family:monospace;">
          ${dbIcon} Latencia conexión: <strong>${db.latency}ms</strong>${db.latency>300?' — túnel SSH al droplet puede tener latencia variable':''}
        </td></tr>
      </tfoot>
    </table>
  </td></tr>

  <!-- ACTIVIDAD 24H -->
  <tr><td style="padding:16px 28px 0;">
    <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#60a5fa;font-family:monospace;letter-spacing:.1em;text-transform:uppercase;">▸ Actividad API — Últimas 24 horas</p>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:12px 16px;">
      <p style="margin:0 0 8px;font-size:12px;color:#cbd5e1;font-family:monospace;">
        Requests: <strong style="color:#f8fafc;">${activity.meta.total_requests}</strong> &nbsp;|&nbsp;
        Usuarios únicos: <strong style="color:#f8fafc;">${activity.meta.unique_users}</strong> &nbsp;|&nbsp;
        IPs distintas: <strong style="color:#f8fafc;">${activity.meta.unique_ips}</strong>
      </p>
      <p style="margin:0 0 6px;font-size:10px;color:#64748b;font-family:monospace;text-transform:uppercase;letter-spacing:.05em;">Acciones</p>
      <div style="margin:0 0 10px;">${actRows || '<span style="font-size:11px;color:#64748b;">Sin actividad</span>'}</div>
      <p style="margin:0 0 6px;font-size:10px;color:#64748b;font-family:monospace;text-transform:uppercase;letter-spacing:.05em;">Módulos</p>
      <div>${modRows || '<span style="font-size:11px;color:#64748b;">Sin actividad</span>'}</div>
    </div>
  </td></tr>

  <!-- EMAIL SYSTEM -->
  <tr><td style="padding:16px 28px 0;">
    <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#60a5fa;font-family:monospace;letter-spacing:.1em;text-transform:uppercase;">▸ Sistema de Email (SMTP)</p>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:12px 16px;">
      <p style="margin:0 0 6px;font-size:12px;color:#cbd5e1;font-family:monospace;">
        ${smtp.host ? `✅ SMTP configurado: <strong style="color:#f8fafc;">${smtp.host}</strong> / <strong style="color:#86efac;">${smtp.user}</strong>` : '🔴 SMTP no configurado'}
      </p>
      <p style="margin:0;font-size:12px;color:#cbd5e1;font-family:monospace;">
        Enviados 24h: <strong style="color:#f8fafc;">${email.sent24h}</strong> &nbsp;|&nbsp;
        Enviados 7d: <strong style="color:#f8fafc;">${email.sent7d}</strong> &nbsp;|&nbsp;
        Total histórico: <strong style="color:#f8fafc;">${email.totalSent}</strong> &nbsp;|&nbsp;
        Atascados: <strong style="color:${email.failed>0?'#fca5a5':'#86efac'};">${email.failed}</strong>
      </p>
    </div>
  </td></tr>

  <!-- NOTIFICACIONES -->
  <tr><td style="padding:16px 28px 0;">
    <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#60a5fa;font-family:monospace;letter-spacing:.1em;text-transform:uppercase;">▸ Notificaciones In-App</p>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:12px 16px;">
      <p style="margin:0 0 8px;font-size:12px;color:#cbd5e1;font-family:monospace;">
        Total en DB: <strong style="color:#f8fafc;">${notifs.total}</strong> &nbsp;|&nbsp;
        Leídas: <strong style="color:#86efac;">${notifs.leidas}</strong> &nbsp;|&nbsp;
        Sin leer: <strong style="color:${Number(notifs.no_leidas)>50?'#fca5a5':'#fde047'};">${notifs.no_leidas}</strong> &nbsp;|&nbsp;
        Nuevas 24h: <strong style="color:#f8fafc;">${notifs.nuevas_24h}</strong>
      </p>
      <p style="margin:0 0 6px;font-size:10px;color:#64748b;font-family:monospace;letter-spacing:.05em;">Por tipo:</p>
      <div>${notifTiposHtml}</div>
    </div>
  </td></tr>

  <!-- USUARIOS -->
  <tr><td style="padding:16px 28px 0;">
    <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#60a5fa;font-family:monospace;letter-spacing:.1em;text-transform:uppercase;">▸ Cuentas de Usuario</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;overflow:hidden;border:1px solid #334155;">
      <thead>
        <tr style="background:#1e293b;">
          <th style="padding:6px 12px;text-align:left;font-size:10px;color:#64748b;font-family:monospace;">ROL</th>
          <th style="padding:6px 8px;text-align:center;font-size:10px;color:#64748b;font-family:monospace;">ACTIVOS</th>
          <th style="padding:6px 8px;text-align:center;font-size:10px;color:#64748b;font-family:monospace;">TOTAL</th>
        </tr>
      </thead>
      <tbody>${rolesHtml}</tbody>
    </table>
    ${inactivos.length ? `
    <div style="background:#1a0a0a;border:1px solid #7f1d1d;border-radius:6px;padding:8px 14px;margin-top:8px;">
      <p style="margin:0 0 4px;font-size:10px;color:#f87171;font-family:monospace;font-weight:700;">⚠ CUENTAS INACTIVAS (${inactivos.length})</p>
      <ul style="margin:0;padding-left:16px;">${inactivosHtml}</ul>
    </div>` : ''}
  </td></tr>

  <!-- PASSWORD RESETS 24H -->
  <tr><td style="padding:16px 28px 0;">
    <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#60a5fa;font-family:monospace;letter-spacing:.1em;text-transform:uppercase;">▸ Resets de Contraseña — Últimas 24h</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;overflow:hidden;border:1px solid #334155;">
      <thead><tr style="background:#1e293b;">
        <th style="padding:6px 12px;text-align:left;font-size:10px;color:#64748b;font-family:monospace;">EMAIL</th>
        <th style="padding:6px 8px;text-align:center;font-size:10px;color:#64748b;font-family:monospace;">ESTADO</th>
        <th style="padding:6px 8px;text-align:left;font-size:10px;color:#64748b;font-family:monospace;">HORA</th>
      </tr></thead>
      <tbody>${resetsHtml}</tbody>
    </table>
  </td></tr>

  <!-- JOBS PROGRAMADOS -->
  <tr><td style="padding:16px 28px 0;">
    <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#60a5fa;font-family:monospace;letter-spacing:.1em;text-transform:uppercase;">▸ Jobs Programados (node-cron)</p>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:12px 16px;">
      ${[
        ['scheduleDailyReminder',  '0 8 * * *',   'Recordatorios de tareas vencidas → responsables'],
        ['scheduleSystemStatus',   '0 8 * * *',   'Este informe → superadmin'],
        ['scheduleCleanup',        '0 3 * * 0',   'Limpieza notificaciones/emails obsoletos (domingo)'],
      ].map(([name, cron, desc]) =>
        `<p style="margin:0 0 4px;font-size:11px;color:#cbd5e1;font-family:monospace;">
          ✅ <strong style="color:#86efac;">${name}</strong>
          <code style="background:#1e293b;padding:1px 6px;border-radius:4px;font-size:10px;color:#fde047;">${cron}</code>
          <span style="color:#64748b;"> — ${desc}</span>
        </p>`).join('')}
    </div>
  </td></tr>

  <!-- ERRORES 24H -->
  <tr><td style="padding:16px 28px 0;">
    <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#60a5fa;font-family:monospace;letter-spacing:.1em;text-transform:uppercase;">▸ Errores en Logs — Últimas 24h</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;overflow:hidden;border:1px solid ${errors24h.length?'#7f1d1d':'#334155'};">
      <thead><tr style="background:#1e293b;">
        <th style="padding:6px 12px;text-align:left;font-size:10px;color:#64748b;font-family:monospace;">MÓDULO</th>
        <th style="padding:6px 8px;text-align:left;font-size:10px;color:#64748b;font-family:monospace;">DETALLE</th>
        <th style="padding:6px 8px;text-align:left;font-size:10px;color:#64748b;font-family:monospace;">HORA</th>
      </tr></thead>
      <tbody>${erroresHtml}</tbody>
    </table>
  </td></tr>

  <!-- TAREAS KPI RÁPIDO -->
  <tr><td style="padding:16px 28px 0;">
    <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#60a5fa;font-family:monospace;letter-spacing:.1em;text-transform:uppercase;">▸ Estado de Tareas (referencia rápida)</p>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:12px 16px;">
      <p style="margin:0;font-size:12px;color:#cbd5e1;font-family:monospace;">
        Total: <strong style="color:#f8fafc;">${tareas.total}</strong> &nbsp;|&nbsp;
        Completadas: <strong style="color:#86efac;">${tareas.completadas}</strong> (${pct(Number(tareas.completadas), Number(tareas.total))}%) &nbsp;|&nbsp;
        Vencidas sin cerrar: <strong style="color:${Number(tareas.vencidas)>0?'#fca5a5':'#86efac'};">${tareas.vencidas}</strong> &nbsp;|&nbsp;
        Notas chat: <strong style="color:#f8fafc;">${notas.total}</strong> total · <strong style="color:#f8fafc;">${notas.last24h}</strong> hoy
      </p>
    </div>
  </td></tr>

  <!-- CTA + FOOTER -->
  <tr><td style="padding:20px 28px 24px;">
    <a href="${appUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;font-size:12px;font-weight:700;padding:10px 22px;border-radius:6px;text-decoration:none;font-family:monospace;margin-right:8px;">→ Abrir sistema</a>
    <a href="${appUrl}/logs" style="display:inline-block;background:#1e293b;color:#94a3b8;border:1px solid #334155;font-size:12px;font-weight:700;padding:10px 18px;border-radius:6px;text-decoration:none;font-family:monospace;">→ Ver logs</a>
  </td></tr>
  <tr>
    <td style="background:#0f172a;padding:12px 28px;border-top:1px solid #334155;">
      <p style="margin:0;font-size:10px;color:#475569;text-align:center;font-family:monospace;">
        ALZAK Flow · Diagnóstico técnico automático · 8:00 AM Colombia · asistenteti@alzakfoundation.org
      </p>
    </td>
  </tr>

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
  const subject  = vencidas > 0
    ? `⚠️ ALZAK Flow — Diagnóstico Técnico · ${vencidas} tareas vencidas · ${new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}`
    : `✅ ALZAK Flow — Diagnóstico Técnico · Sistemas OK · ${new Date().toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}`;

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
