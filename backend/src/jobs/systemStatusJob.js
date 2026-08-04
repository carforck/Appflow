/**
 * src/jobs/systemStatusJob.js
 * Cron diario — envía informe de estado del sistema al superadmin.
 *
 * Horario: 8:00 AM hora Colombia (America/Bogota, UTC-5)
 * Destinatario: asistenteti@alzakfoundation.org (configurable via SYSTEM_STATUS_EMAIL)
 */

const cron = require('node-cron');
const { sendSystemStatus } = require('../services/systemStatusService');

function scheduleSystemStatus() {
  cron.schedule('0 8 * * *', async () => {
    console.log('\n📊 [cron] Generando informe diario de estado...');
    try {
      const result = await sendSystemStatus();
      console.log(`✅ [cron] Informe enviado → ${result.dest}`);
    } catch (err) {
      console.error('❌ [cron] Error en informe de estado:', err.message);
    }
  }, { timezone: 'America/Bogota' });

  console.log('📅 [cron] Informe de estado programado — 8:00 AM (America/Bogota)');
}

module.exports = { scheduleSystemStatus };
