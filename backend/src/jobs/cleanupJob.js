/**
 * src/jobs/cleanupJob.js
 * Limpieza semanal de datos de notificaciones obsoletos.
 *
 * Qué limpia:
 *   1. Notificaciones privadas leídas con más de 60 días
 *   2. Notificaciones globales con más de 90 días
 *   3. Registros huérfanos en notification_reads
 *   4. pending_emails con enviado=0 y más de 24 h (emails bloqueados) → se ELIMINAN
 *      (no se marcan como enviados, para no falsear las métricas del diagnóstico)
 *
 * Horario: domingo 3:00 AM Colombia + una vez al arrancar (con 10s de delay).
 */

const cron = require('node-cron');
const pool = require('../config/db');

async function runCleanup() {
  const [r1] = await pool.query(
    `DELETE FROM db_notifications
     WHERE leido = 1
       AND destinatario_correo IS NOT NULL
       AND created_at < NOW() - INTERVAL 60 DAY`
  );

  const [r2] = await pool.query(
    `DELETE FROM db_notifications
     WHERE destinatario_correo IS NULL
       AND created_at < NOW() - INTERVAL 90 DAY`
  );

  const [r3] = await pool.query(
    `DELETE nr FROM notification_reads nr
     LEFT JOIN db_notifications n ON nr.id_notification = n.id
     WHERE n.id IS NULL`
  );

  const [r4] = await pool.query(
    `DELETE FROM pending_emails
     WHERE enviado = 0 AND created_at < NOW() - INTERVAL 24 HOUR`
  );

  console.log(
    `🧹 [cleanup] notif privadas: ${r1.affectedRows} · notif globales: ${r2.affectedRows}` +
    ` · reads huérfanos: ${r3.affectedRows} · emails atascados eliminados: ${r4.affectedRows}`
  );
}

function scheduleCleanup() {
  cron.schedule('0 3 * * 0', async () => {
    console.log('\n🧹 [cron] Ejecutando limpieza semanal...');
    try {
      await runCleanup();
    } catch (err) {
      console.error('❌ [cron] Error en limpieza:', err.message);
    }
  }, { timezone: 'America/Bogota' });

  // Ejecutar una vez al arrancar para limpiar acumulados
  setTimeout(
    () => runCleanup().catch((e) => console.error('⚠️ cleanup startup:', e.message)),
    10_000
  );

  console.log('📅 [cron] Limpieza semanal programada — Domingo 3:00 AM (America/Bogota)');
}

module.exports = { scheduleCleanup };
