const { Router } = require('express');
const { login, forgotPassword, verifyResetCode, resetPassword } = require('../controllers/authController');

const router = Router();
router.post('/login',               login);
router.post('/forgot-password',     forgotPassword);
router.post('/verify-reset-code',   verifyResetCode);
router.post('/reset-password',      resetPassword);

module.exports = router;
