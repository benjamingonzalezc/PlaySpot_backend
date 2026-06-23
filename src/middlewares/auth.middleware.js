const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // Obtenemos el token desde el header 'Authorization'
    // Formato esperado: "Bearer <token>"
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado: No se proporcionó un token.' });
    }

    try {
        // Verificamos el token con la clave secreta
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        
        // Guardamos los datos del usuario en la request para que los controladores puedan usarlos
        req.usuario = payload;

        // Pasamos al siguiente middleware o controlador
        next();
    } catch (error) {
        console.error('Error al verificar el token:', error);
        return res.status(403).json({ error: 'Acceso denegado: Token inválido o expirado.' });
    }
};

const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ error: 'Acceso denegado: Usuario no autenticado.' });
        }
        
        const rolUsuario = req.usuario.id_rol;
        // Permite que rolesPermitidos sea un solo rol (número) o una lista de roles (array)
        const roles = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];
        
        if (!roles.includes(rolUsuario)) {
            return res.status(403).json({ error: 'Acceso denegado: No tienes permisos para realizar esta acción.' });
        }
        
        next();
    };
};

module.exports = { verificarToken, verificarRol };
