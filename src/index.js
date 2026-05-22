const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 1. Importación de Rutas
const recintosRoutes = require('./routes/recintos.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// 2. Middlewares Globales
app.use(cors()); // Permite la comunicación segura con el frontend de Angular
app.use(express.json()); // Habilita el parsing de JSON en el cuerpo de las peticiones (req.body)

// 3. Definición de Rutas (Endpoints)
app.use('/api/recintos', recintosRoutes);

// Ruta base de diagnóstico (Health Check)
app.get('/', (req, res) => {
    res.json({ 
        estado: 'online',
        mensaje: 'API de PlaySpot corriendo correctamente' 
    });
});

// 4. Manejo de Errores para Rutas No Encontradas (404)
app.use((req, res, next) => {
    res.status(404).json({ 
        error: 'La ruta solicitada no existe' 
    });
});

// 5. Inicialización del Servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});