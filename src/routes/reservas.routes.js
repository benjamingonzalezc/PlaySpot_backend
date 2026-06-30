const express = require('express');
const router = express.Router();
const { 
    crearReserva, 
    cancelarReserva, 
    obtenerHistorialUsuario,
    pagarReserva,
    modificarReserva
} = require('../controllers/reservas.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Todas las rutas de reservas requieren autenticación token
router.use(verificarToken);

// POST /api/reservas - Crear reserva (queda Pendiente de Pago)
router.post('/', crearReserva);

// POST /api/reservas/:id_reserva/pagar - Pagar y confirmar la reserva
router.post('/:id_reserva/pagar', pagarReserva);

// PUT /api/reservas/:id_reserva/cancelar - Cancelar y liberar
router.put('/:id_reserva/cancelar', cancelarReserva);

// PUT /api/reservas/:id_reserva - Modificar fecha/horario de reserva
router.put('/:id_reserva', modificarReserva);

// GET /api/reservas/usuario/:id_usuario - Ver historial
router.get('/usuario/:id_usuario', obtenerHistorialUsuario);

module.exports = router;