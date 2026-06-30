const dbFallback = require('../config/dbFallback');
const supabase = require('../config/supabaseClient');
const bcrypt = require('bcrypt');

const editarPerfil = async (req, res) => {
  const { nombre, telefono, contrasena_actual, contrasena_nueva } = req.body;
  const id_usuario = req.usuario.id_usuario;

  try {
    // 1. Obtener datos actuales del usuario
    const { data: usuarios, error: errorUser } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id_usuario);

    if (errorUser || usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = usuarios[0];
    const updateData = {};

    if (nombre) updateData.nombre = nombre;

    // Si quiere actualizar contraseña
    if (contrasena_nueva) {
      // Hashear la nueva contraseña directamente sin requerir la actual
      const salt = await bcrypt.genSalt(10);
      updateData.contrasena = await bcrypt.hash(contrasena_nueva, salt);
    }

    // 2. Si viene teléfono, lo guardamos localmente usando dbFallback
    if (telefono !== undefined) {
      dbFallback.saveUsuarioMetadata(id_usuario, { telefono });
    }

    // 3. Ejecutar actualización en Supabase (solo los campos válidos)
    let usuarioActualizado = null;
    if (Object.keys(updateData).length > 0) {
      const { data, error: errorUpdate } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', id_usuario)
        .select();

      if (errorUpdate) throw errorUpdate;
      usuarioActualizado = data;
    }

    // Leer el teléfono de la base de datos local
    const meta = dbFallback.getUsuarioMetadata(id_usuario);
    const userResult = (usuarioActualizado && usuarioActualizado.length > 0)
      ? usuarioActualizado[0]
      : usuario;

    res.status(200).json({
      mensaje: 'Perfil actualizado exitosamente',
      usuario: {
        id_usuario: userResult.id,
        nombre: userResult.nombre,
        email: userResult.email,
        telefono: meta.telefono || '',
        rut: userResult.rut,
      }
    });

  } catch (error) {
    console.error('Error al editar perfil:', error);
    try {
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(
        path.join(__dirname, '../../debug_error.log'),
        `Request Body: ${JSON.stringify(req.body)}\nUser: ${JSON.stringify(req.usuario)}\nError Stack: ${error.stack || error.message}\nDate: ${new Date().toISOString()}`,
        'utf8'
      );
    } catch (e) {
      console.error('Error writing debug file:', e);
    }
    res.status(500).json({ error: 'Hubo un problema al actualizar el perfil.' });
  }
};

const eliminarCuenta = async (req, res) => {
  const { contrasena } = req.body;
  const id_usuario = req.usuario.id_usuario;

  if (!contrasena) {
    return res.status(400).json({ error: 'Debes proporcionar tu contraseña para confirmar la eliminación.' });
  }

  try {
    // 1. Obtener usuario para validar contraseña
    const { data: usuarios, error: errorUser } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id_usuario);

    if (errorUser || usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = usuarios[0];
    const esValida = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!esValida) {
      return res.status(401).json({ error: 'Contraseña incorrecta. No se pudo eliminar la cuenta.' });
    }

    // 2. Cancelar reservas pendientes del usuario
    await supabase
      .from('reservas')
      .update({ estado: 'cancelada' })
      .eq('userId', id_usuario)
      .eq('estado', 'pendiente');

    // 3. Eliminar usuario
    const { error: errorDelete } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id_usuario);

    if (errorDelete) throw errorDelete;

    res.status(200).json({ mensaje: 'Cuenta eliminada exitosamente' });

  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
    res.status(500).json({ error: 'Hubo un problema al intentar eliminar la cuenta.' });
  }
};

module.exports = {
  editarPerfil,
  eliminarCuenta
};
