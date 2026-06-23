const supabase = require('../config/supabaseClient');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Si guardaste contraseñas sin encriptar, quitaremos esto por ahora.

const login = async (req, res) => {
    const { email, contrasena } = req.body;

    try {
        // 1. Buscar al usuario por su email
        const { data: usuarios, error } = await supabase
            .from('usuario')
            .select('*')
            .eq('email', email);

        if (error) throw error;
        if (usuarios.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const usuario = usuarios[0];

        // 2. Verificar contraseña usando bcrypt
        const esValida = await bcrypt.compare(contrasena, usuario.contrasena_hash);
        if (!esValida) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        // 3. Generar el Token (Pase VIP válido por 2 horas)
        const token = jwt.sign(
            { id_usuario: usuario.id_usuario, id_rol: usuario.id_rol },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.status(200).json({
            mensaje: 'Login exitoso',
            token,
            usuario: {
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                email: usuario.email
            }
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
const registro = async (req, res) => {
    const { rut, nombre, email, contrasena, id_rol } = req.body;

    try {
        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const contrasena_hash = await bcrypt.hash(contrasena, salt);

        const { data, error } = await supabase
            .from('usuario')
            .insert([
                {
                    rut,
                    nombre,
                    email,
                    contrasena_hash,
                    id_rol
                }
            ])
            .select();

        if (error) throw error;

        res.status(201).json({
            mensaje: 'Usuario registrado exitosamente',
            usuario: {
                id_usuario: data[0].id_usuario,
                nombre: data[0].nombre,
                email: data[0].email
            }
        });

    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ error: 'Hubo un problema al registrar el usuario' });
    }
};

module.exports = { login, registro };