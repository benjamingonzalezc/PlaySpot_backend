const express = require('express');
const router = express.Router();
const { obtenerDisponibilidad } = require('../controllers/horarios.controller');

// La ruta será: /api/horarios/cancha/1
router.get('/cancha/:id_cancha', obtenerDisponibilidad);

module.exports = router;