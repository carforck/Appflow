/**
 * migrate.js — Alzak Flow
 * Ejecución única: node migrate.js (con el túnel SSH activo)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 3,
});

// Agrega columna sin romper si ya existe (compatible MySQL 5.7 y 8+)
async function alterSafely(conn, sql) {
  try {
    await conn.query(sql);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') return; // ya existe, OK
    throw err;
  }
}

async function migrate() {
  const conn = await pool.getConnection();
  console.log('🔄 Conectado a la base de datos. Iniciando migración...\n');

  try {
    // ── 1. TABLA PROJECTS ──────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id_proyecto  VARCHAR(20)  NOT NULL PRIMARY KEY,
        nombre       VARCHAR(255) NOT NULL,
        financiador  VARCHAR(100) DEFAULT NULL,
        status       ENUM('activo','inactivo','completado') NOT NULL DEFAULT 'activo'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Tabla projects OK');

    // ── 2. ALTERACIONES TABLA USERS ────────────────────────────────────────
    await alterSafely(conn, `ALTER TABLE users ADD COLUMN role ENUM('superadmin','admin','user') NOT NULL DEFAULT 'user'`);
    await alterSafely(conn, `ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL`);
    await alterSafely(conn, `ALTER TABLE users ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1`);
    console.log('✅ Columnas en users OK (role, password_hash, activo)');

    // ── 3. ALTERACIONES TABLA TASKS ────────────────────────────────────────
    await alterSafely(conn, `ALTER TABLE tasks ADD COLUMN status ENUM('pendiente','en_proceso','completada','cancelada') NOT NULL DEFAULT 'pendiente'`);
    console.log('✅ Columna status en tasks OK');

    // ── 4. PROYECTOS ───────────────────────────────────────────────────────
    const PROJECTS = [
      ['25923',    'Estudio Clínico Bayer 25923',              'Bayer'],
      ['2424',     'Estudio Sanofi 2424',                      'Sanofi'],
      ['EXTERNO-1','Proyecto Externo 1',                       'Externo'],
      ['5024',     'Estudio Bayer 5024',                       'Bayer'],
      ['6124',     'Estudio Pfizer 6124',                      'Pfizer'],
      ['EXTERNO-2','Proyecto Externo 2',                       'Externo'],
      ['6524',     'Estudio MSD 6524',                         'MSD'],
      ['0124',     'Proyecto Minciencias Ene-2024',            'Minciencias'],
      ['0424',     'Estudio Pfizer 0424',                      'Pfizer'],
      ['2924',     'Estudio Sanofi 2924',                      'Sanofi'],
      ['3524',     'Estudio Bayer 3524',                       'Bayer'],
      ['0325',     'Proyecto Minciencias Mar-2025',            'Minciencias'],
      ['1121',     'Estudio Bayer 1121',                       'Bayer'],
      ['1022',     'Estudio Sanofi 1022',                      'Sanofi'],
      ['1522',     'Estudio Pfizer 1522',                      'Pfizer'],
      ['1022-1',   'Estudio Bayer 1022-1 (Extensión)',         'Bayer'],
      ['1922',     'Estudio MSD 1922',                         'MSD'],
      ['2822',     'Estudio Pfizer 2822',                      'Pfizer'],
      ['0925',     'Proyecto Minciencias Sep-2025',            'Minciencias'],
      ['1111',     'Sin Proyecto / No Identificado',           null],
      ['1125',     'Estudio Bayer 1125',                       'Bayer'],
      ['0425',     'Estudio Pfizer 0425',                      'Pfizer'],
      ['1525',     'Estudio Sanofi 1525',                      'Sanofi'],
      ['2625',     'Estudio MSD 2625',                         'MSD'],
      ['6024',     'Estudio Pfizer 6024',                      'Pfizer'],
      ['0525',     'Proyecto Minciencias May-2025',            'Minciencias'],
      ['1625',     'Estudio Sanofi 1625',                      'Sanofi'],
      ['2125',     'Estudio Bayer 2125',                       'Bayer'],
      ['2225',     'Estudio MSD 2225',                         'MSD'],
      ['1025',     'Proyecto Minciencias Oct-2025',            'Minciencias'],
      ['2025',     'Estudio Pfizer 2025',                      'Pfizer'],
      ['1925',     'Estudio Sanofi 1925',                      'Sanofi'],
      ['0725',     'Estudio Bayer 0725',                       'Bayer'],
      ['3425',     'Estudio MSD 3425',                         'MSD'],
      ['4125',     'Estudio Pfizer 4125',                      'Pfizer'],
      ['3825',     'Estudio Sanofi 3825',                      'Sanofi'],
      ['0326',     'Proyecto Minciencias Mar-2026',            'Minciencias'],
    ];

    for (const [id, nombre, financiador] of PROJECTS) {
      await conn.query(
        `INSERT INTO projects (id_proyecto, nombre, financiador)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), financiador = VALUES(financiador)`,
        [id, nombre, financiador]
      );
    }
    console.log(`✅ ${PROJECTS.length} proyectos insertados/actualizados`);

    // ── 5. USUARIOS ────────────────────────────────────────────────────────
    const hash = await bcrypt.hash('alzak2026', 10);
    console.log('🔐 Hash generado para contraseña por defecto');

    const USERS = [
      // [correo, nombre_completo, role]
      ['c.carranza@alzak.org',  'Carlos Carranza',          'superadmin'],
      ['a.puerto@alzak.org',    'Alejandra Puerto',         'admin'],
      ['am.lozano@alzak.org',   'Ana Milena Lozano',        'user'],
      ['d.torres@alzak.org',    'Daniela Torres',           'user'],
      ['f.chaparro@alzak.org',  'Faiber Chaparro',          'user'],
      ['f.salcedo@alzak.org',   'Fernando Salcedo',         'user'],
      ['g.bossa@alzak.org',     'Gonzalo Bossa',            'user'],
      ['j.zakzuk@alzak.org',    'Josefina Zakzuk',          'user'],
      ['k.diaz@alzak.org',      'Kevin Díaz',               'user'],
      ['l.moyano@alzak.org',    'Lina Moyano',              'user'],
      ['m.angeles@alzak.org',   'María de los Ángeles',     'user'],
      ['nj.alvis@alzak.org',    'Nelson José Alvis',        'user'],
      ['nr.alvis@alzak.org',    'Nelson Rafael Alvis',      'user'],
      ['p.pinzon@alzak.org',    'Paula Pinzón',             'user'],
      ['r.barroso@alzak.org',   'Rosmery Barroso',          'user'],
    ];

    for (const [correo, nombre, role] of USERS) {
      await conn.query(
        `INSERT INTO users (correo, nombre_completo, role, password_hash, activo)
         VALUES (?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           nombre_completo = VALUES(nombre_completo),
           role            = VALUES(role),
           password_hash   = VALUES(password_hash),
           activo          = 1`,
        [correo, nombre, role, hash]
      );
    }
    console.log(`✅ ${USERS.length} usuarios insertados/actualizados`);

    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('   Contraseña por defecto para todos: alzak2026');
    console.log('   Correos: [nombre].[apellido]@alzak.org\n');

  } catch (err) {
    console.error('\n❌ ERROR EN MIGRACIÓN:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

migrate();
