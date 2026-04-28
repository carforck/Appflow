/**
 * src/config/migrate.js
 * Auto-migración al inicio del servidor (Schema Sync).
 * Valida el schema real en Digital Ocean y aplica los ALTER TABLE necesarios.
 * No bloquea el arranque — los errores se loguean sin detener el proceso.
 */
const pool = require('./db');

// ── Schema esperado ────────────────────────────────────────────────────────────

/** Tablas que deben existir antes de aceptar tráfico */
const CORE_TABLES = ['users', 'projects', 'meetings', 'tasks'];

/** Columnas a agregar si no existen (tabla → array de migraciones) */
const COLUMN_MIGRATIONS = [
  {
    table:  'tasks',
    column: 'fecha_inicio',
    check:  "SHOW COLUMNS FROM tasks LIKE 'fecha_inicio'",
    sql:    'ALTER TABLE tasks ADD COLUMN fecha_inicio DATE NULL AFTER id_proyecto',
    desc:   'Fecha de inicio de la tarea',
  },
  {
    table:  'tasks',
    column: 'estado_tarea',
    check:  "SHOW COLUMNS FROM tasks LIKE 'estado_tarea'",
    sql:    "ALTER TABLE tasks ADD COLUMN estado_tarea VARCHAR(50) NOT NULL DEFAULT 'Pendiente Revisión'",
    desc:   'Estado de la tarea (DEFAULT Pendiente Revisión)',
    skipIfExists: true,
  },
  {
    table:  'tasks',
    column: 'fecha_finalizacion',
    check:  "SHOW COLUMNS FROM tasks LIKE 'fecha_finalizacion'",
    sql:    'ALTER TABLE tasks ADD COLUMN fecha_finalizacion DATETIME NULL AFTER estado_tarea',
    desc:   'Fecha y hora exacta en que la tarea pasó a Completada',
  },
  {
    table:  'db_notifications',
    column: 'destinatario_correo',
    check:  "SHOW COLUMNS FROM db_notifications LIKE 'destinatario_correo'",
    sql:    'ALTER TABLE db_notifications ADD COLUMN destinatario_correo VARCHAR(255) NULL AFTER id_tarea',
    desc:   'Filtro RBAC — NULL = visible para admins, email = visible solo al destinatario',
  },
  {
    table:  'meetings',
    column: 'session_key',
    check:  "SHOW COLUMNS FROM meetings LIKE 'session_key'",
    sql:    'ALTER TABLE meetings ADD COLUMN session_key VARCHAR(255) NULL UNIQUE AFTER id',
    desc:   'Clave de idempotencia — evita duplicar commit-staging',
  },
];

/** Tablas de soporte a crear con CREATE TABLE IF NOT EXISTS */
const SUPPORT_TABLES = [
  {
    name: 'pending_emails',
    sql: `
      CREATE TABLE IF NOT EXISTS pending_emails (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        destinatario_correo VARCHAR(255) NOT NULL,
        destinatario_nombre VARCHAR(255),
        id_tarea            INT NOT NULL,
        tarea_descripcion   TEXT,
        proyecto_nombre     VARCHAR(255),
        prioridad           VARCHAR(20),
        fecha_entrega       DATE,
        enviado             TINYINT(1) DEFAULT 0,
        sent_at             TIMESTAMP NULL,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_enviado (enviado),
        INDEX idx_correo  (destinatario_correo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
  },
  {
    name: 'db_notifications',
    sql: `
      CREATE TABLE IF NOT EXISTS db_notifications (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        tipo        VARCHAR(50) NOT NULL,
        titulo      VARCHAR(255) NOT NULL,
        mensaje     TEXT,
        leido       TINYINT(1) DEFAULT 0,
        id_meeting  INT NULL,
        id_tarea    INT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_leido    (leido),
        INDEX idx_tipo     (tipo),
        INDEX idx_meeting  (id_meeting)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
  },
  {
    name: 'task_notas',
    sql: `
      CREATE TABLE IF NOT EXISTS task_notas (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        id_tarea       INT NOT NULL,
        usuario_correo VARCHAR(255) NOT NULL,
        usuario_nombre VARCHAR(255) NOT NULL,
        mensaje        TEXT NOT NULL,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tarea (id_tarea)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
  },
];

/** Correcciones de DEFAULT en columnas ya existentes */
const DEFAULT_MIGRATIONS = [
  {
    table: 'tasks',
    column: 'estado_tarea',
    sql: "ALTER TABLE tasks ALTER COLUMN estado_tarea SET DEFAULT 'Pendiente Revisión'",
    desc: "DEFAULT estado_tarea → 'Pendiente Revisión'",
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────

async function runMigrations() {
  const report = {
    tables_ok:       [],
    tables_missing:  [],
    columns_added:   [],
    tables_created:  [],
    tables_skipped:  [],   // soporte ya existentes
    errors:          [],
    warnings:        [],
  };

  try {
    // ── 1. Verificar tablas core ──────────────────────────────────────────────
    const [existing] = await pool.query('SHOW TABLES');
    const tableSet   = new Set(existing.map((r) => Object.values(r)[0]));

    for (const t of CORE_TABLES) {
      (tableSet.has(t) ? report.tables_ok : report.tables_missing).push(t);
    }

    // ── 2. Migraciones de columnas ────────────────────────────────────────────
    for (const m of COLUMN_MIGRATIONS) {
      if (!tableSet.has(m.table)) {
        report.warnings.push(`Tabla ${m.table} no existe — omitiendo migración de ${m.column}`);
        continue;
      }
      try {
        const [rows] = await pool.query(m.check);
        if (rows.length === 0) {
          await pool.query(m.sql);
          report.columns_added.push(`${m.table}.${m.column} (${m.desc})`);
        }
      } catch (e) {
        report.errors.push(`ALTER ${m.table}.${m.column}: ${e.message}`);
      }
    }

    // ── 3. Correcciones de DEFAULT ────────────────────────────────────────────
    for (const m of DEFAULT_MIGRATIONS) {
      if (!tableSet.has(m.table)) continue;
      try {
        await pool.query(m.sql);
        report.columns_added.push(`${m.table}.${m.column} default (${m.desc})`);
      } catch (e) {
        report.errors.push(`DEFAULT ${m.table}.${m.column}: ${e.message}`);
      }
    }

    // ── 4. Crear tablas de soporte ────────────────────────────────────────────
    for (const t of SUPPORT_TABLES) {
      try {
        await pool.query(t.sql);
        (tableSet.has(t.name) ? report.tables_skipped : report.tables_created).push(t.name);
      } catch (e) {
        report.errors.push(`CREATE ${t.name}: ${e.message}`);
      }
    }

    // ── 5. Validar estado_tarea ───────────────────────────────────────────────
    let estadoInfo = 'no verificado';
    if (tableSet.has('tasks')) {
      const [[col]] = await pool.query("SHOW COLUMNS FROM tasks LIKE 'estado_tarea'");
      const tipo = col?.Type ?? 'desconocido';
      const ok   = tipo.toLowerCase().startsWith('varchar');
      estadoInfo = `${tipo} → ${ok ? '✅ acepta Pendiente Revisión' : '⚠️  revisar: cambiar a VARCHAR(50)'}`;
      if (!ok) report.warnings.push(`estado_tarea tipo ${tipo} puede no aceptar "Pendiente Revisión"`);
    }

    // ── 5. Informe en consola ─────────────────────────────────────────────────
    const sep = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    console.log(`\n${sep}`);
    console.log('🏥 DB HEALTH CHECK — ALZAK FLOW');
    console.log(sep);

    if (report.tables_ok.length)
      console.log(`✅ Tablas core OK:       ${report.tables_ok.join(', ')}`);
    if (report.tables_missing.length)
      console.log(`❌ Tablas FALTANTES:     ${report.tables_missing.join(', ')}`);
    if (report.columns_added.length)
      console.log(`➕ Columnas añadidas:    ${report.columns_added.join(', ')}`);
    else
      console.log('   Columnas:            sin cambios pendientes');
    if (report.tables_created.length)
      console.log(`🆕 Tablas creadas:       ${report.tables_created.join(', ')}`);
    if (report.tables_skipped.length)
      console.log(`   Tablas soporte OK:   ${report.tables_skipped.join(', ')}`);

    console.log(`🔍 estado_tarea:         ${estadoInfo}`);

    if (report.warnings.length)
      report.warnings.forEach((w) => console.log(`⚠️   ${w}`));
    if (report.errors.length)
      report.errors.forEach((e)   => console.log(`❌   ${e}`));

    const hayDiscrepancias = report.tables_missing.length > 0 || report.errors.length > 0;
    console.log(sep);
    if (hayDiscrepancias) {
      console.log('⚠️  Discrepancias encontradas — revisar los items marcados con ❌ arriba');
    } else {
      console.log('✅ Estructura de DB validada y actualizada');
    }
    console.log(`${sep}\n`);

    return report;
  } catch (err) {
    console.error('❌ MIGRATE FATAL:', err.message);
    return report;
  }
}

module.exports = { runMigrations };
