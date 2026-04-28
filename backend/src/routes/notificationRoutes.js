const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  getNotifications, marcarLeida, marcarTodasLeidas,
  getNotasUnread, marcarLeidasPorTarea,
} = require('../controllers/notificationController');

const router = express.Router();

// ⚠️ Rutas específicas SIEMPRE antes de las paramétricas
router.get('/',                         authMiddleware, getNotifications);
router.get('/notas-sin-leer',           authMiddleware, getNotasUnread);
router.patch('/leer-todo',              authMiddleware, marcarTodasLeidas);
router.patch('/leer-tarea/:taskId',     authMiddleware, marcarLeidasPorTarea);
router.patch('/:id/leer',              authMiddleware, marcarLeida);

module.exports = router;
