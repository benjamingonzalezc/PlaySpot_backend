const express = require('express');
const router = express.Router();
const { obtenerRecintos } = require('../controllers/recintos.controller');

// Definimos que al hacer un GET en la ruta raíz de este módulo, ejecute obtenerRecintos
router.get('/', obtenerRecintos);

module.exports = router;