const { Router }    = require('express');
const { ingestaAuto } = require('../controllers/ingestaController');

const router = Router();

// Sin authMiddleware — autenticación vía api_key en el body
router.post('/ingesta-auto', ingestaAuto);

module.exports = router;
