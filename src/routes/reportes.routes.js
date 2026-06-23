const express = require('express');
const router = express.Router();
const { 
    obtenerReportePorFecha, 
    obtenerReportePorRango, 
    obtenerDisponibilidadGeneral 
} = require('../controllers/reportes.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Todas las rutas de reportes requieren autenticación y rol de Administrador (1) o Propietario (2)
router.use(verificarToken);
router.use(verificarRol([1, 2]));

// GET /api/reportes/fecha/:fecha
router.get('/fecha/:fecha', obtenerReportePorFecha);

// GET /api/reportes/rango?inicio=YYYY-MM-DD&fin=YYYY-MM-DD
router.get('/rango', obtenerReportePorRango);

// GET /api/reportes/disponibilidad
router.get('/disponibilidad', obtenerDisponibilidadGeneral);

module.exports = router;
