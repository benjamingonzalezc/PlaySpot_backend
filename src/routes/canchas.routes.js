const express = require('express');
const router = express.Router();
const { obtenerCanchasPorRecinto } = require('../controllers/canchas.controller');

// La ruta será algo como: /api/canchas/recinto/1
router.get('/recinto/:id_recinto', obtenerCanchasPorRecinto);

module.exports = router;