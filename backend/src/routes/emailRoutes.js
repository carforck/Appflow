const express = require('express');
const router  = express.Router();

router.get('/ping', (_req, res) => res.send('Email service alive'));

module.exports = router;
