const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 1. Importación de Rutas de los Módulos
const recintosRoutes = require('./routes/recintos.routes');
const canchasRoutes = require('./routes/canchas.routes');
const horariosRoutes = require('./routes/horarios.routes');
const reservasRoutes = require('./routes/reservas.routes');
const authRoutes = require('./routes/auth.routes');
const reportesRoutes = require('./routes/reportes.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const pagosRoutes = require('./routes/pagos.routes');
const evaluacionesRoutes = require('./routes/evaluaciones.routes');
const app = express();
const PORT = process.env.PORT || 3000;

// 2. Middlewares Globales
app.use(cors()); // Permite la comunicación segura con el frontend en Angular
app.use(express.json()); // Habilita la lectura de formato JSON en el cuerpo de las peticiones (req.body)

app.use((req, res, next) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const logMsg = `[REQUEST] ${new Date().toISOString()} - ${req.method} ${req.url}\nHeaders: ${JSON.stringify(req.headers)}\nBody: ${JSON.stringify(req.body)}\n`;
    fs.appendFileSync(path.join(__dirname, '../requests.log'), logMsg, 'utf8');
  } catch (e) {
    console.error('Logging middleware error:', e);
  }

  // Interceptar la respuesta
  const originalSend = res.send;
  res.send = function (body) {
    try {
      const fs = require('fs');
      const path = require('path');
      const logMsg = `[RESPONSE] Status: ${res.statusCode}\nBody: ${body}\n--------------------\n`;
      fs.appendFileSync(path.join(__dirname, '../requests.log'), logMsg, 'utf8');
    } catch (e) {
      console.error('Error logging response:', e);
    }
    return originalSend.apply(res, arguments);
  };

  next();
});

// 3. Registro de Rutas (Endpoints)
app.use('/api/recintos', recintosRoutes);
app.use('/api/canchas', canchasRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/evaluaciones', evaluacionesRoutes);
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