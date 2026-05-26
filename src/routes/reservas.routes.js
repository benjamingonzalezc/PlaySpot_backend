const express = require('express');
const router = express.Router();
// Importamos la nueva función
const { crearReserva, cancelarReserva } = require('../controllers/reservas.controller');

// Ruta para crear (la que ya teníamos)
router.post('/', crearReserva);

// Nueva ruta para cancelar (ejemplo: /api/reservas/1/cancelar)
router.put('/:id_reserva/cancelar', cancelarReserva);

module.exports = router;