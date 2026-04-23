const { Router }           = require('express');
const { procesarReunion }  = require('../controllers/meetingController');
const { authMiddleware }   = require('../middleware/auth');

const router = Router();
router.post('/', authMiddleware, procesarReunion);

module.exports = router;
