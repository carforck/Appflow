/**
 * src/config/test-db.js — Script de verificación de conectividad
 *
 * Uso desde el contenedor Docker:
 *   docker exec -it alzak_flow_api node src/config/test-db.js
 *
 * Qué hace:
 *   1. Conecta al pool con las credenciales del .env
 *   2. Ejecuta SELECT COUNT(*) FROM projects
 *   3. Inserta 'PROYECTO_TEST_CLAUDIA' si no existe
 *   4. Muestra el resultado final
 *
 * Esquema real de la tabla projects en DigitalOcean:
 *   id_proyecto      VARCHAR(20) PK
 *   nombre_proyecto  TEXT
 *   estado           VARCHAR(50)   — valores: 'Activo', 'Cerrado'
 *   empresa          VARCHAR(100)
 *   financiador      VARCHAR(100)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testDB() {
  console.log('\n🔌 Alzak Flow — Test de Conectividad DB');
  console.log('─'.repeat(45));
  console.log(`   Host : ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log(`   User : ${process.env.DB_USER}`);
  console.log(`   DB   : ${process.env.DB_NAME}`);
  console.log('─'.repeat(45) + '\n');

  const pool = mysql.createPool({
    host:                  process.env.DB_HOST || 'db-tunnel',
    port:                  parseInt(process.env.DB_PORT) || 3306,
    user:                  process.env.DB_USER,
    password:              process.env.DB_PASS,
    database:              process.env.DB_NAME,
    waitForConnections:    true,
    connectionLimit:       3,
    enableKeepAlive:       true,
    keepAliveInitialDelay: 10000,
    connectTimeout:        10000,
  });

  try {
    // ── 1. Verificar conexión ────────────────────────────────────────────────
    const conn = await pool.getConnection();
    console.log('✅ Conexión establecida');
    conn.release();

    // ── 2. COUNT de proyectos ────────────────────────────────────────────────
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM projects');
    console.log(`📊 Proyectos en DB: ${total}`);

    // ── 3. Insertar proyecto de prueba si no existe ──────────────────────────
    const TEST_ID     = 'TEST-CLAUDIA';
    const TEST_NOMBRE = 'PROYECTO_TEST_CLAUDIA';

    const [[existing]] = await pool.query(
      'SELECT id_proyecto FROM projects WHERE id_proyecto = ?',
      [TEST_ID]
    );

    if (existing) {
      console.log(`ℹ️  Proyecto de prueba ya existía: ${TEST_ID}`);
    } else {
      await pool.query(
        `INSERT INTO projects (id_proyecto, nombre_proyecto, financiador, empresa, estado)
         VALUES (?, ?, 'Test', 'ALZAK Foundation', 'Activo')`,
        [TEST_ID, TEST_NOMBRE]
      );
      console.log(`✅ Proyecto de prueba insertado: ${TEST_ID} — ${TEST_NOMBRE}`);
    }

    // ── 4. Verificación final ────────────────────────────────────────────────
    const [[{ total: totalFinal }]] = await pool.query('SELECT COUNT(*) AS total FROM projects');
    console.log(`📊 Total final de proyectos: ${totalFinal}`);

    console.log('\n🎉 TEST EXITOSO — Los cables están bien puestos\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('   Código:', err.code);
    console.error('\n   Posibles causas:');
    console.error('   • El servicio db-tunnel no está corriendo   → docker compose ps');
    console.error('   • El healthcheck aún no pasó (espera ~20s)  → docker compose logs db-tunnel');
    console.error('   • SSH_REMOTE_DB_PORT no coincide con MySQL en DigitalOcean\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testDB();
