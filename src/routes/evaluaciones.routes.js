const express = require('express');
const router = express.Router();
const { crearEvaluacion, obtenerEvaluacionesRecinto } = require('../controllers/evaluaciones.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// GET /api/evaluaciones/recinto/:id_recinto - Obtener evaluaciones de un recinto (público)
router.get('/recinto/:id_recinto', obtenerEvaluacionesRecinto);

// POST /api/evaluaciones - Crear una evaluación (requiere token)
router.post('/', verificarToken, crearEvaluacion);

module.exports = router;
