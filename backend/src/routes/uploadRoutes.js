const { Router }           = require('express');
const { upload, extraerTexto } = require('../controllers/uploadController');
const { authMiddleware }   = require('../middleware/auth');

const router = Router();

// POST /upload/texto  — campo multipart: "file"
router.post('/texto', authMiddleware, upload.single('file'), extraerTexto);

module.exports = router;
