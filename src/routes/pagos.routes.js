const express = require('express');
const router = express.Router();
const { obtenerPagosUsuario, obtenerTodosPagos, reembolsarPago } = require('../controllers/pagos.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Todas las rutas de pagos requieren token
router.use(verificarToken);

// GET /api/pagos/usuario/:id_usuario - Obtener pagos de un usuario
router.get('/usuario/:id_usuario', obtenerPagosUsuario);

// GET /api/pagos - Obtener todos los pagos del sistema (solo Admin)
router.get('/', verificarRol(1), obtenerTodosPagos);

// POST /api/pagos/:id_pago/reembolso - Reembolsar un pago
router.post('/:id_pago/reembolso', reembolsarPago);

module.exports = router;
