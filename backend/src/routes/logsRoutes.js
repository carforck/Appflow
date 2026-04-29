const express       = require('express');
const { getLogs, getStats } = require('../controllers/logsController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Solo superadmin puede acceder — el guard está en el frontend y en authMiddleware
router.get('/',       authMiddleware, getLogs);
router.get('/stats',  authMiddleware, getStats);

module.exports = router;
