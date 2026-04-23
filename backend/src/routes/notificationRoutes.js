const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getNotifications, marcarLeida, marcarTodasLeidas } = require('../controllers/notificationController');

const router = express.Router();

router.get('/',              authMiddleware, getNotifications);
// ⚠️ Rutas específicas ANTES de las paramétricas para evitar captura incorrecta
router.patch('/leer-todo',   authMiddleware, marcarTodasLeidas);
router.patch('/:id/leer',    authMiddleware, marcarLeida);

module.exports = router;
