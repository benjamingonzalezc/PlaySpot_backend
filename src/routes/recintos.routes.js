const express = require('express');
const router = express.Router();
const { obtenerRecintos, obtenerRecintoPorId, crearRecinto, editarRecinto, eliminarRecinto } = require('../controllers/recintos.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Definimos que al hacer un GET en la ruta raíz de este módulo, ejecute obtenerRecintos (público)
router.get('/', obtenerRecintos);

// GET /api/recintos/:id_recinto - Obtener un recinto por id (público)
router.get('/:id_recinto', obtenerRecintoPorId);

// POST /api/recintos - Solo accesible por Administradores (1) o Propietarios (2)
router.post('/', verificarToken, verificarRol([1, 2]), crearRecinto);

// PUT /api/recintos/:id_recinto - Solo accesible por Administradores (1) o Propietarios (2)
router.put('/:id_recinto', verificarToken, verificarRol([1, 2]), editarRecinto);

// DELETE /api/recintos/:id_recinto - Solo accesible por Administradores (1)
router.delete('/:id_recinto', verificarToken, verificarRol(1), eliminarRecinto);

module.exports = router;