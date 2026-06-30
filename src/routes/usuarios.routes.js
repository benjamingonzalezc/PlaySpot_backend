const express = require('express');
const router = express.Router();
const { editarPerfil, eliminarCuenta } = require('../controllers/usuarios.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Todas las rutas de perfil requieren token
router.use(verificarToken);

// PUT /api/usuarios/perfil - Editar perfil propio
router.put('/perfil', editarPerfil);

// DELETE /api/usuarios/cuenta - Eliminar cuenta propia
router.delete('/cuenta', eliminarCuenta);

module.exports = router;
