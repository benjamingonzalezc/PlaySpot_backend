const express = require('express');
const router = express.Router();
const { obtenerDisponibilidad, generarHorariosSemana } = require('../controllers/horarios.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// GET /api/horarios/cancha/:id_cancha (público)
router.get('/cancha/:id_cancha', obtenerDisponibilidad);

// POST /api/horarios/generar-semana (Administrativo: solo Admin (1) o Propietario (2))
router.post('/generar-semana', verificarToken, verificarRol([1, 2]), generarHorariosSemana);

module.exports = router;