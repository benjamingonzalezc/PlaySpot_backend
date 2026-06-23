const express = require('express');
const router = express.Router();
const { obtenerRecintos, crearRecinto } = require('../controllers/recintos.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Definimos que al hacer un GET en la ruta raíz de este módulo, ejecute obtenerRecintos (público)
router.get('/', obtenerRecintos);

// POST /api/recintos - Solo accesible por Administradores (1) o Propietarios (2)
router.post('/', verificarToken, verificarRol([1, 2]), crearRecinto);

module.exports = router;