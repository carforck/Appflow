const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getDashboardStats, getActividadHeatmap } = require('../controllers/statsController');

const router = express.Router();

router.get('/dashboard',          authMiddleware, getDashboardStats);
router.get('/actividad-heatmap',  authMiddleware, getActividadHeatmap);

module.exports = router;
