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
  // Garantizar que responsable_correo sea nullable (requerido para FK SET NULL)
  {
    table:  'tasks',
    column: 'responsable_correo_nullable',
    check:  "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'responsable_correo' AND IS_NULLABLE = 'YES'",
    sql:    'ALTER TABLE tasks MODIFY COLUMN responsable_correo VARCHAR(150) NULL',
    desc:   'tasks.responsable_correo → nullable (requerido para FK SET NULL)',
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
        id_tarea            INT NULL,
        tarea_descripcion   TEXT,
        proyecto_nombre     VARCHAR(255),
        prioridad           VARCHAR(20),
        fecha_entrega       DATE,
        enviado             TINYINT(1) DEFAULT 0,
        sent_at             TIMESTAMP NULL,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_enviado (enviado),
        INDEX idx_correo  (destinatario_correo),
        INDEX idx_tarea   (id_tarea)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `,
  },
  {
    name: 'db_notifications',
    sql: `
      CREATE TABLE IF NOT EXISTS db_notifications (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        tipo                VARCHAR(50) NOT NULL,
        titulo              VARCHAR(255) NOT NULL,
        mensaje             TEXT,
        leido               TINYINT(1) DEFAULT 0,
        id_meeting          INT NULL,
        id_tarea            INT NULL,
        destinatario_correo VARCHAR(255) NULL,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_leido    (leido),
        INDEX idx_tipo     (tipo),
        INDEX idx_meeting  (id_meeting),
        INDEX idx_tarea    (id_tarea)
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
  {
    name: 'activity_logs',
    sql: `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        usuario_correo VARCHAR(255) NOT NULL,
        usuario_nombre VARCHAR(255) NOT NULL,
        usuario_role   VARCHAR(50)  NOT NULL DEFAULT 'user',
        accion         VARCHAR(50)  NOT NULL,
        modulo         VARCHAR(100) NOT NULL,
        detalle        TEXT,
        ip_address     VARCHAR(45),
        entity_id      INT NULL,
        entity_type    VARCHAR(50) NULL,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created (created_at),
        INDEX idx_correo  (usuario_correo),
        INDEX idx_accion  (accion),
        INDEX idx_modulo  (modulo)
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

// ── Foreign Keys ──────────────────────────────────────────────────────────────
// Se aplican DESPUÉS de crear todas las tablas.
// Cada FK es idempotente: verifica information_schema antes de aplicar.
// Estrategia:
//   RESTRICT   → no se puede borrar el padre si tiene hijos (proyectos con tareas/reuniones)
//   SET NULL   → el hijo queda huérfano con NULL (tarea sin reunión, tarea sin responsable)
//   CASCADE    → el hijo se elimina con el padre (notas/notificaciones siguen a la tarea)
const FK_MIGRATIONS = [
  // meetings.id_proyecto → projects.id_proyecto
  {
    name: 'fk_meetings_proyecto',
    desc: 'meetings.id_proyecto → projects.id_proyecto (RESTRICT)',
    pre:  [],
    sql: `ALTER TABLE meetings
          ADD CONSTRAINT fk_meetings_proyecto
          FOREIGN KEY (id_proyecto) REFERENCES projects(id_proyecto)
          ON DELETE RESTRICT ON UPDATE CASCADE`,
  },
  // tasks.id_meeting → meetings.id
  {
    name: 'fk_tasks_meeting',
    desc: 'tasks.id_meeting → meetings.id (SET NULL)',
    pre:  [],
    sql: `ALTER TABLE tasks
          ADD CONSTRAINT fk_tasks_meeting
          FOREIGN KEY (id_meeting) REFERENCES meetings(id)
          ON DELETE SET NULL ON UPDATE CASCADE`,
  },
  // tasks.id_proyecto → projects.id_proyecto
  {
    name: 'fk_tasks_proyecto',
    desc: 'tasks.id_proyecto → projects.id_proyecto (RESTRICT)',
    pre:  [],
    sql: `ALTER TABLE tasks
          ADD CONSTRAINT fk_tasks_proyecto
          FOREIGN KEY (id_proyecto) REFERENCES projects(id_proyecto)
          ON DELETE RESTRICT ON UPDATE CASCADE`,
  },
  // tasks.responsable_correo → users.email
  // SET NULL: si se borra el usuario, la tarea permanece sin responsable asignado
  {
    name: 'fk_tasks_responsable',
    desc: 'tasks.responsable_correo → users.email (SET NULL)',
    pre:  [
      // users.email debe tener UNIQUE index para ser referenciado como FK
      // Usa information_schema para ser compatible con MySQL y MariaDB
      `ALTER TABLE users ADD UNIQUE INDEX uq_users_email (email)`,
    ],
    preCheck: `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
               AND INDEX_NAME = 'uq_users_email'`,
    sql: `ALTER TABLE tasks
          ADD CONSTRAINT fk_tasks_responsable
          FOREIGN KEY (responsable_correo) REFERENCES users(email)
          ON DELETE SET NULL ON UPDATE CASCADE`,
  },
  // task_notas.id_tarea → tasks.id
  {
    name: 'fk_notas_tarea',
    desc: 'task_notas.id_tarea → tasks.id (CASCADE)',
    pre:  [],
    sql: `ALTER TABLE task_notas
          ADD CONSTRAINT fk_notas_tarea
          FOREIGN KEY (id_tarea) REFERENCES tasks(id)
          ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  // db_notifications.id_tarea → tasks.id
  {
    name: 'fk_notif_tarea',
    desc: 'db_notifications.id_tarea → tasks.id (CASCADE)',
    pre:  [],
    sql: `ALTER TABLE db_notifications
          ADD CONSTRAINT fk_notif_tarea
          FOREIGN KEY (id_tarea) REFERENCES tasks(id)
          ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  // db_notifications.id_meeting → meetings.id
  {
    name: 'fk_notif_meeting',
    desc: 'db_notifications.id_meeting → meetings.id (CASCADE)',
    pre:  [],
    sql: `ALTER TABLE db_notifications
          ADD CONSTRAINT fk_notif_meeting
          FOREIGN KEY (id_meeting) REFERENCES meetings(id)
          ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  // pending_emails.id_tarea → tasks.id
  {
    name: 'fk_emails_tarea',
    desc: 'pending_emails.id_tarea → tasks.id (CASCADE)',
    pre:  [],
    sql: `ALTER TABLE pending_emails
          ADD CONSTRAINT fk_emails_tarea
          FOREIGN KEY (id_tarea) REFERENCES tasks(id)
          ON DELETE CASCADE ON UPDATE CASCADE`,
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────

async function runMigrations() {
  const report = {
    tables_ok:       [],
    tables_missing:  [],
    columns_added:   [],
    tables_created:  [],
    tables_skipped:  [],
    fks_added:       [],
    fks_ok:          [],
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
        // Re-consultar tableSet para que las FKs encuentren las tablas recién creadas
        (tableSet.has(t.name) ? report.tables_skipped : report.tables_created).push(t.name);
        tableSet.add(t.name);
      } catch (e) {
        report.errors.push(`CREATE ${t.name}: ${e.message}`);
      }
    }

    // ── 5. Foreign Keys ───────────────────────────────────────────────────────
    for (const fk of FK_MIGRATIONS) {
      try {
        // Verificar si la FK ya existe en information_schema
        const [[{ cnt }]] = await pool.query(
          `SELECT COUNT(*) AS cnt
           FROM information_schema.TABLE_CONSTRAINTS
           WHERE CONSTRAINT_SCHEMA = DATABASE()
             AND CONSTRAINT_NAME   = ?
             AND CONSTRAINT_TYPE   = 'FOREIGN KEY'`,
          [fk.name]
        );

        if (cnt > 0) {
          report.fks_ok.push(fk.name);
          continue;
        }

        // Pasos previos — se saltan si ya están aplicados (preCheck), se ignoran sus errores
        if (fk.pre?.length) {
          let skipPre = false;
          if (fk.preCheck) {
            try {
              const [[{ cnt: preCnt }]] = await pool.query(fk.preCheck);
              skipPre = preCnt > 0;
            } catch { /* si falla el check, intenta el pre-step igual */ }
          }
          if (!skipPre) {
            for (const preSql of fk.pre) {
              try {
                await pool.query(preSql);
              } catch (e) {
                report.warnings.push(`FK pre-step [${fk.name}]: ${e.message}`);
              }
            }
          }
        }

        // Aplicar FK
        await pool.query(fk.sql);
        report.fks_added.push(fk.name);
      } catch (e) {
        // Advertencia, no error fatal — el app sigue funcionando sin la FK
        report.warnings.push(`FK ${fk.name} (${fk.desc}): ${e.message}`);
      }
    }

    // ── 6. Validar estado_tarea ───────────────────────────────────────────────
    let estadoInfo = 'no verificado';
    if (tableSet.has('tasks')) {
      const [[col]] = await pool.query("SHOW COLUMNS FROM tasks LIKE 'estado_tarea'");
      const tipo = col?.Type ?? 'desconocido';
      const ok   = tipo.toLowerCase().startsWith('varchar');
      estadoInfo = `${tipo} → ${ok ? '✅ acepta Pendiente Revisión' : '⚠️  revisar: cambiar a VARCHAR(50)'}`;
      if (!ok) report.warnings.push(`estado_tarea tipo ${tipo} puede no aceptar "Pendiente Revisión"`);
    }

    // ── 7. Informe en consola ─────────────────────────────────────────────────
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
    if (report.fks_added.length)
      console.log(`🔗 FKs creadas:          ${report.fks_added.join(', ')}`);
    if (report.fks_ok.length)
      console.log(`   FKs existentes:      ${report.fks_ok.join(', ')}`);

    console.log(`🔍 estado_tarea:         ${estadoInfo}`);

    if (report.warnings.length)
      report.warnings.forEach((w) => console.log(`⚠️   ${w}`));
    if (report.errors.length)
      report.errors.forEach((e)   => console.log(`❌   ${e}`));

    const hayDiscrepancias = report.tables_missing.length > 0 || report.errors.length > 0;
    console.log(sep);
    console.log(hayDiscrepancias
      ? '⚠️  Discrepancias encontradas — revisar los items marcados con ❌ arriba'
      : '✅ Estructura de DB validada y actualizada'
    );
    console.log(`${sep}\n`);

    return report;
  } catch (err) {
    console.error('❌ MIGRATE FATAL:', err.message);
    return report;
  }
}

module.exports = { runMigrations };
