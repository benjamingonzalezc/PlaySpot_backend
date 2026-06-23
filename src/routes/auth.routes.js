const express = require('express');
const router = express.Router();
const { login, registro } = require('../controllers/auth.controller');

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/registro
router.post('/registro', registro);

module.exports = router;