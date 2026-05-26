const express = require('express');
const router = express.Router();
const { crearReserva } = require('../controllers/reservas.controller');

// Usamos POST porque vamos a enviar datos al servidor para crear algo nuevo
router.post('/', crearReserva);

module.exports = router;