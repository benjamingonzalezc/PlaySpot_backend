const dbFallback = require('../config/dbFallback');
const supabase = require('../config/supabaseClient');

const obtenerPagosUsuario = async (req, res) => {
  const { id_usuario } = req.params;

  // Los clientes (3) solo pueden ver sus propios pagos
  if (req.usuario.id_rol === 3 && parseInt(id_usuario) !== req.usuario.id_usuario) {
    return res.status(403).json({ error: 'Acceso denegado: No tienes permisos para ver pagos de otro usuario.' });
  }

  try {
    const pagos = await dbFallback.selectRows('pagos', { userId: id_usuario });
    res.status(200).json(pagos);
  } catch (error) {
    console.error('Error al obtener pagos de usuario:', error);
    res.status(500).json({ error: 'Hubo un problema al cargar el historial de pagos.' });
  }
};

const obtenerTodosPagos = async (req, res) => {
  try {
    const pagos = await dbFallback.selectRows('pagos');
    res.status(200).json(pagos);
  } catch (error) {
    console.error('Error al obtener todos los pagos:', error);
    res.status(500).json({ error: 'Hubo un problema al cargar los pagos.' });
  }
};

const reembolsarPago = async (req, res) => {
  const { id_pago } = req.params;

  try {
    // 1. Obtener el pago
    const pagosEncontrados = await dbFallback.selectRows('pagos', { id: id_pago });
    if (pagosEncontrados.length === 0) {
      return res.status(404).json({ error: 'Pago no encontrado.' });
    }

    const pago = pagosEncontrados[0];

    // Validar propiedad del usuario (Solo el dueño del pago o admin/propietario)
    const esAdmin = req.usuario.id_rol === 1;
    const esPropietario = req.usuario.id_rol === 2;
    const esDuenioPago = String(pago.userId) === String(req.usuario.id_usuario);

    if (!esAdmin && !esPropietario && !esDuenioPago) {
      return res.status(403).json({ error: 'No tienes permisos para reembolsar este pago.' });
    }

    if (pago.estadoPago === 'reembolsado') {
      return res.status(400).json({ error: 'Este pago ya se encuentra reembolsado.' });
    }

    // 2. Actualizar estado del pago a reembolsado
    const pagoActualizado = await dbFallback.updateRow(
      'pagos',
      { estadoPago: 'reembolsado' },
      'id',
      id_pago
    );

    // 3. Cancelar la reserva asociada
    const { error: errorReserva } = await supabase
      .from('reservas')
      .update({ estado: 'cancelada' })
      .eq('id', pago.reservaId);

    if (errorReserva) throw errorReserva;

    res.status(200).json({
      mensaje: 'Reembolso procesado con éxito y reserva cancelada.',
      pago: pagoActualizado,
    });

  } catch (error) {
    console.error('Error al reembolsar pago:', error);
    res.status(500).json({ error: 'Hubo un problema al procesar el reembolso.' });
  }
};

module.exports = {
  obtenerPagosUsuario,
  obtenerTodosPagos,
  reembolsarPago,
};
