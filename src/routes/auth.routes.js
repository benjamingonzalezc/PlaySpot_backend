const express = require('express');
const router = express.Router();
const { login, registro, solicitarRecuperacion, resetearContrasena } = require('../controllers/auth.controller');

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/registro
router.post('/registro', registro);

// POST /api/auth/recuperar - Solicitar código
router.post('/recuperar', solicitarRecuperacion);

// POST /api/auth/reset - Aplicar cambio
router.post('/reset', resetearContrasena);

module.exports = router;