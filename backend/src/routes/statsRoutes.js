const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/statsController');

const router = express.Router();

// Acceso universal — el controller filtra por email cuando role === 'user'
router.get('/dashboard', authMiddleware, getDashboardStats);

module.exports = router;
