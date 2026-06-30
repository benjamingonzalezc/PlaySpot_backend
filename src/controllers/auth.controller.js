const supabase = require('../config/supabaseClient');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Si guardaste contraseñas sin encriptar, quitaremos esto por ahora.
const dbFallback = require('../config/dbFallback');

const resetTokens = new Map(); // Guarda email -> { token, expira }

const login = async (req, res) => {
    const { email, contrasena } = req.body;

    try {
        // 1. Buscar al usuario por su email
        const { data: usuarios, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email);

        if (error) throw error;
        if (usuarios.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const usuario = usuarios[0];

        // 2. Verificar contraseña usando bcrypt
        const esValida = await bcrypt.compare(contrasena, usuario.contrasena);
        if (!esValida) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        // 3. Generar el Token (Pase VIP válido por 2 horas)
        const token = jwt.sign(
            { id_usuario: usuario.id, id_rol: usuario.id_rol },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        // Obtener teléfono guardado localmente si existe
        const meta = dbFallback.getUsuarioMetadata(usuario.id);

        res.status(200).json({
            mensaje: 'Login exitoso',
            token,
            usuario: {
                id_usuario: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                id_rol: usuario.id_rol,
                rut: usuario.rut,
                telefono: meta.telefono || ''
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
            .from('usuarios')
            .insert([
                {
                    rut,
                    nombre,
                    email,
                    contrasena: contrasena_hash,
                    id_rol
                }
            ])
            .select();

        if (error) throw error;

        // Generar el Token JWT inmediatamente al registrarse (Pase VIP por 2 horas)
        const token = jwt.sign(
            { id_usuario: data[0].id, id_rol: data[0].id_rol || 3 },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        // Obtener teléfono guardado localmente si existe (para registro nuevo estará vacío)
        const meta = dbFallback.getUsuarioMetadata(data[0].id);

        res.status(201).json({
            mensaje: 'Usuario registrado exitosamente',
            token,
            usuario: {
                id_usuario: data[0].id,
                nombre: data[0].nombre,
                email: data[0].email,
                id_rol: data[0].id_rol,
                rut: data[0].rut,
                telefono: meta.telefono || ''
            }
        });

    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ error: 'Hubo un problema al registrar el usuario' });
    }
};

const solicitarRecuperacion = async (req, res) => {
  const { email } = req.body;
  try {
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email);

    if (error) throw error;
    if (usuarios.length === 0) {
      // Por seguridad no informamos si el email no existe, pero retornamos éxito simulado
      return res.status(200).json({ mensaje: 'Si el correo está registrado, se enviará un código temporal de recuperación.' });
    }

    // Generar un token de 6 dígitos numérico
    const token = String(Math.floor(100000 + Math.random() * 900000));
    const expira = Date.now() + 15 * 60 * 1000; // 15 minutos

    resetTokens.set(email.toLowerCase(), { token, expira });

    console.log(`[RECUPERACIÓN CONTRASEÑA] Token generado para ${email}: ${token}`);

    res.status(200).json({
      mensaje: 'Código temporal generado con éxito (verificar consola del servidor en ambiente local).',
      codigoSimulado: token // Para que el frontend pueda leerlo fácilmente en desarrollo
    });

  } catch (error) {
    console.error('Error en solicitarRecuperacion:', error);
    res.status(500).json({ error: 'Hubo un error al procesar la solicitud.' });
  }
};

const resetearContrasena = async (req, res) => {
  const { email, codigo, contrasena_nueva } = req.body;

  if (!email || !codigo || !contrasena_nueva) {
    return res.status(400).json({ error: 'Debes proporcionar email, código de verificación y la nueva contraseña.' });
  }

  const record = resetTokens.get(email.toLowerCase());
  if (!record) {
    return res.status(400).json({ error: 'No se ha solicitado recuperación para este correo o el código expiró.' });
  }

  if (record.codigo !== codigo && record.token !== codigo) {
    return res.status(400).json({ error: 'El código de verificación ingresado es incorrecto.' });
  }

  if (Date.now() > record.expira) {
    resetTokens.delete(email.toLowerCase());
    return res.status(400).json({ error: 'El código ha expirado. Solicita uno nuevo.' });
  }

  try {
    // Hashear nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(contrasena_nueva, salt);

    const { error } = await supabase
      .from('usuarios')
      .update({ contrasena: hash })
      .eq('email', email);

    if (error) throw error;

    // Eliminar token usado
    resetTokens.delete(email.toLowerCase());

    res.status(200).json({ mensaje: 'Contraseña restablecida correctamente.' });

  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({ error: 'Hubo un problema al restablecer tu contraseña.' });
  }
};

module.exports = { login, registro, solicitarRecuperacion, resetearContrasena };