const express = require('express');
const router = express.Router();
const { 
    obtenerReportePorFecha, 
    obtenerReportePorRango, 
    obtenerDisponibilidadGeneral,
    exportarReporteCSV,
    exportarReportePDF
} = require('../controllers/reportes.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Todas las rutas de reportes requieren autenticación y rol de Admin (1), Propietario (2) o Jugador (3)
router.use(verificarToken);

// GET /api/reportes/exportar/csv - Exportar reporte CSV (Admin y Propietario)
router.get('/exportar/csv', verificarRol([1, 2]), exportarReporteCSV);

// GET /api/reportes/exportar/pdf - Exportar reporte PDF (Admin y Propietario)
router.get('/exportar/pdf', verificarRol([1, 2]), exportarReportePDF);

// GET /api/reportes/fecha/:fecha
router.get('/fecha/:fecha', verificarRol([1, 2, 3]), obtenerReportePorFecha);

// GET /api/reportes/rango?inicio=YYYY-MM-DD&fin=YYYY-MM-DD
router.get('/rango', verificarRol([1, 2, 3]), obtenerReportePorRango);

// GET /api/reportes/disponibilidad
router.get('/disponibilidad', verificarRol([1, 2, 3]), obtenerDisponibilidadGeneral);

module.exports = router;
