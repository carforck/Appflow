/**
 * src/jobs/dailyReminder.js
 * Cron diario — envía recordatorios de tareas vencidas y próximas a vencer.
 *
 * Horario: 8:00 AM hora Colombia (America/Bogota, UTC-5)
 * Llamado una vez al arrancar el servidor desde index.js.
 */

const cron                 = require('node-cron');
const { sendDailyReminders } = require('../services/reminderService');

function scheduleDailyReminder() {
  // '0 8 * * *' → minuto 0, hora 8, todos los días
  cron.schedule('0 8 * * *', async () => {
    console.log('\n⏰ [cron] Ejecutando recordatorio diario de tareas...');
    try {
      await sendDailyReminders();
    } catch (err) {
      console.error('❌ [cron] Error en recordatorio diario:', err.message);
    }
  }, {
    timezone: 'America/Bogota',
  });

  console.log('📅 [cron] Recordatorio diario programado — 8:00 AM (America/Bogota)');
}

module.exports = { scheduleDailyReminder };
