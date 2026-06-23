const express = require('express');
const router = express.Router();
const { 
    obtenerCanchasPorRecinto, 
    crearCancha, 
    editarCancha, 
    eliminarCancha 
} = require('../controllers/canchas.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// GET /api/canchas/recinto/:id_recinto (público)
router.get('/recinto/:id_recinto', obtenerCanchasPorRecinto);

// POST /api/canchas - Solo Admin (1) o Propietario (2)
router.post('/', verificarToken, verificarRol([1, 2]), crearCancha);

// PUT /api/canchas/:id_cancha - Solo Admin (1) o Propietario (2)
router.put('/:id_cancha', verificarToken, verificarRol([1, 2]), editarCancha);

// DELETE /api/canchas/:id_cancha - Solo Admin (1) o Propietario (2)
router.delete('/:id_cancha', verificarToken, verificarRol([1, 2]), eliminarCancha);

module.exports = router;