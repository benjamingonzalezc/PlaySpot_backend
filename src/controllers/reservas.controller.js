const supabase = require('../config/supabaseClient');

const crearReserva = async (req, res) => {
    // Capturamos los datos que nos envían para hacer la reserva
    const { id_cancha, fecha, hora_inicio, hora_fin, id_horario, metodo_pago } = req.body;
    
    // Obtener id_usuario de forma segura del token. Solo el Admin (1) puede forzar un id_usuario de terceros.
    const id_usuario = req.usuario.id_rol === 1 ? (req.body.id_usuario || req.usuario.id_usuario) : req.usuario.id_usuario;

    try {
        // Paso 1: Verificar existencia del bloque horario en 'horarios_disponibilidad'
        const { data: horario, error: errorHorario } = await supabase
            .from('horarios_disponibilidad')
            .select('*')
            .eq('id', id_horario)
            .single();

        if (errorHorario || !horario) {
            return res.status(404).json({ error: 'El bloque horario especificado no existe.' });
        }

        // Paso 2: Verificar si ya existe una reserva activa para esa cancha, fecha y hora de inicio
        const { data: reservaExistente, error: errorExistente } = await supabase
            .from('reservas')
            .select('*')
            .eq('canchaId', id_cancha)
            .eq('fecha', fecha)
            .eq('horaInicio', hora_inicio)
            .neq('estado', 'cancelada');

        if (errorExistente) throw errorExistente;
        if (reservaExistente && reservaExistente.length > 0) {
            return res.status(400).json({ error: 'El bloque horario ya se encuentra reservado para esa fecha.' });
        }

        // Paso 3: Obtener detalles de la cancha para rellenar la metadata de la reserva
        const { data: cancha, error: errorCancha } = await supabase
            .from('canchas')
            .select('*')
            .eq('id', id_cancha)
            .single();

        if (errorCancha || !cancha) {
            return res.status(404).json({ error: 'La cancha especificada no existe.' });
        }

        // Paso 4: Obtener detalles del recinto de la cancha
        const { data: recinto, error: errorRecinto } = await supabase
            .from('recintos')
            .select('*')
            .eq('id', cancha.idRecinto)
            .single();

        if (errorRecinto || !recinto) {
            return res.status(404).json({ error: 'El recinto asociado a la cancha no existe.' });
        }

        // Calcular duración de la reserva
        const [hInicio, mInicio] = hora_inicio.split(':').map(Number);
        const [hFin, mFin] = hora_fin.split(':').map(Number);
        const duracion = Math.max(1, (hFin * 60 + mFin - (hInicio * 60 + mInicio)) / 60);

        const total = cancha.precioPorHora * duracion;

        // Generar un código único
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let codigo = 'PLAY-';
        for (let i = 0; i < 6; i++) {
            codigo += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Paso 5: Insertamos la nueva reserva
        const { data: reservaGenerada, error: errorReserva } = await supabase
            .from('reservas')
            .insert([
                {
                    codigo: codigo,
                    userId: id_usuario,
                    canchaId: id_cancha,
                    recintoId: cancha.idRecinto,
                    recintoNombre: recinto.nombre,
                    canchaNombre: cancha.nombre,
                    deporte: cancha.deporte,
                    fecha: fecha,
                    horaInicio: hora_inicio,
                    horaFin: hora_fin,
                    duracionHoras: duracion,
                    precioPorHora: cancha.precioPorHora,
                    total: total,
                    metodoPago: metodo_pago || 'webpay',
                    estado: 'pendiente'
                }
            ])
            .select();

        if (errorReserva) throw errorReserva;

        // Si todo sale bien, respondemos con éxito
        res.status(201).json({
            mensaje: '¡Reserva creada! Pendiente de pago para confirmar.',
            reserva: {
                id_reserva: reservaGenerada[0].id,
                codigo_reserva: reservaGenerada[0].codigo,
                ...reservaGenerada[0]
            }
        });

    } catch (error) {
        console.error('Error al crear la reserva:', error);
        res.status(500).json({ error: 'Hubo un problema al procesar la reserva' });
    }
};

const cancelarReserva = async (req, res) => {
    const { id_reserva } = req.params;

    try {
        // Paso 1: Obtener la reserva para verificar existencia y pertenencia
        const { data: reserva, error: errorReserva } = await supabase
            .from('reservas')
            .select('*')
            .eq('id', id_reserva)
            .single();

        if (errorReserva || !reserva) {
            return res.status(404).json({ error: 'La reserva especificada no existe.' });
        }

        // Verificar propiedad (Solo dueños de la reserva, propietarios del recinto o admin pueden cancelar)
        const esAdmin = req.usuario.id_rol === 1;
        const esPropietario = req.usuario.id_rol === 2;
        const esDuenioReserva = String(reserva.userId) === String(req.usuario.id_usuario);

        if (!esAdmin && !esPropietario && !esDuenioReserva) {
            return res.status(403).json({ error: 'No tienes permisos para cancelar esta reserva.' });
        }

        if (reserva.estado === 'cancelada') {
            return res.status(400).json({ error: 'Esta reserva ya se encuentra cancelada.' });
        }

        // Paso 2: Cambiar el estado de la reserva a 'cancelada'
        const { data: reservaCancelada, error: errorUpdateReserva } = await supabase
            .from('reservas')
            .update({ estado: 'cancelada' })
            .eq('id', id_reserva)
            .select();

        if (errorUpdateReserva) throw errorUpdateReserva;

        res.status(200).json({
            mensaje: 'Reserva cancelada exitosamente',
            reserva: {
                id_reserva: reservaCancelada[0].id,
                codigo_reserva: reservaCancelada[0].codigo,
                ...reservaCancelada[0]
            }
        });

    } catch (error) {
        console.error('Error al cancelar:', error);
        res.status(500).json({ error: 'Hubo un problema al cancelar la reserva' });
    }
};

const obtenerHistorialUsuario = async (req, res) => {
    const { id_usuario } = req.params;

    // Validación de seguridad: los clientes (3) solo pueden ver su propio historial
    if (req.usuario.id_rol === 3 && parseInt(id_usuario) !== req.usuario.id_usuario) {
        return res.status(403).json({ error: 'Acceso denegado: No tienes permisos para ver el historial de otro usuario.' });
    }

    try {
        const { data, error } = await supabase
            .from('reservas')
            .select('*')
            .eq('userId', id_usuario);

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'Hubo un problema al cargar el historial' });
    }
};

const dbFallback = require('../config/dbFallback');

const pagarReserva = async (req, res) => {
    const { id_reserva } = req.params;
    const { metodo_pago } = req.body;

    try {
        const { data: reserva, error: errorReserva } = await supabase
            .from('reservas')
            .select('*')
            .eq('id', id_reserva)
            .single();

        if (errorReserva || !reserva) {
            return res.status(404).json({ error: 'La reserva especificada no existe.' });
        }

        // Validar propiedad del usuario (Solo el dueño de la reserva o admin pueden pagar)
        const esAdmin = req.usuario.id_rol === 1;
        const esDuenioReserva = String(reserva.userId) === String(req.usuario.id_usuario);

        if (!esAdmin && !esDuenioReserva) {
            return res.status(403).json({ error: 'No tienes permisos para pagar esta reserva.' });
        }

        if (reserva.estado !== 'pendiente') {
            return res.status(400).json({ error: `La reserva no está pendiente de pago. Estado actual: ${reserva.estado}` });
        }

        // Simulación de pasarela de pago (Mercado Pago / Webpay)
        console.log(`[PAGO SIMULADO] Procesando transacción para la reserva ${id_reserva} mediante ${metodo_pago || 'Webpay'}`);

        const { data: reservaConfirmada, error: errorConfirmacion } = await supabase
            .from('reservas')
            .update({ estado: 'confirmada' })
            .eq('id', id_reserva)
            .select();

        if (errorConfirmacion) throw errorConfirmacion;

        // Registrar el pago en la base de datos (con fallback local)
        const transaccionId = `TX-${Date.now().toString(36).toUpperCase()}`;
        const nuevoPago = await dbFallback.insertRow('pagos', {
            reservaId: parseInt(id_reserva),
            userId: parseInt(reserva.userId),
            monto: parseFloat(reserva.total),
            metodoPago: metodo_pago || 'webpay',
            estadoPago: 'aprobado',
            fechaPago: new Date().toISOString(),
            referenciaTransaccion: transaccionId
        });

        res.status(200).json({
            mensaje: 'Pago simulado procesado con éxito y reserva confirmada.',
            reserva: {
                id_reserva: reservaConfirmada[0].id,
                codigo_reserva: reservaConfirmada[0].codigo,
                ...reservaConfirmada[0]
            },
            pagoSimulado: {
                idPago: nuevoPago.id || nuevoPago.idPago,
                transaccionId: transaccionId,
                metodo_pago: metodo_pago || 'Webpay',
                monto: reservaConfirmada[0].total,
                estado: 'Aprobado',
                fecha: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error al pagar la reserva:', error);
        res.status(500).json({ error: 'Hubo un problema al procesar el pago de la reserva' });
    }
};

const modificarReserva = async (req, res) => {
    const { id_reserva } = req.params;
    const { fecha, hora_inicio, hora_fin, id_horario } = req.body;

    try {
        // 1. Obtener la reserva existente
        const { data: reserva, error: errorReserva } = await supabase
            .from('reservas')
            .select('*')
            .eq('id', id_reserva)
            .single();

        if (errorReserva || !reserva) {
            return res.status(404).json({ error: 'La reserva especificada no existe.' });
        }

        // Validar propiedad del usuario (Solo el dueño, propietario o admin)
        const esAdmin = req.usuario.id_rol === 1;
        const esPropietario = req.usuario.id_rol === 2;
        const esDuenioReserva = String(reserva.userId) === String(req.usuario.id_usuario);

        if (!esAdmin && !esPropietario && !esDuenioReserva) {
            return res.status(403).json({ error: 'No tienes permisos para modificar esta reserva.' });
        }

        if (reserva.estado === 'cancelada') {
            return res.status(400).json({ error: 'No se puede modificar una reserva cancelada.' });
        }

        // 2. Verificar existencia del nuevo bloque horario
        const { data: horario, error: errorHorario } = await supabase
            .from('horarios_disponibilidad')
            .select('*')
            .eq('id', id_horario)
            .single();

        if (errorHorario || !horario) {
            return res.status(404).json({ error: 'El bloque horario especificado no existe.' });
        }

        // 3. Verificar si el nuevo bloque ya está reservado por otra reserva activa en esa fecha
        const { data: reservaExistente, error: errorExistente } = await supabase
            .from('reservas')
            .select('*')
            .eq('canchaId', reserva.canchaId)
            .eq('fecha', fecha)
            .eq('horaInicio', hora_inicio)
            .neq('id', id_reserva) // Excluir la reserva que estamos modificando
            .neq('estado', 'cancelada');

        if (errorExistente) throw errorExistente;
        if (reservaExistente && reservaExistente.length > 0) {
            return res.status(400).json({ error: 'El bloque horario ya se encuentra reservado para esa fecha.' });
        }

        // 4. Actualizar la reserva
        const { data: reservaModificada, error: errorUpdate } = await supabase
            .from('reservas')
            .update({
                fecha,
                horaInicio: hora_inicio,
                horaFin: hora_fin || reserva.horaFin,
                // Opcional: si la duración cambia, se puede recalcular
            })
            .eq('id', id_reserva)
            .select();

        if (errorUpdate) throw errorUpdate;

        res.status(200).json({
            mensaje: 'Reserva modificada exitosamente.',
            reserva: reservaModificada[0]
        });

    } catch (error) {
        console.error('Error al modificar la reserva:', error);
        res.status(500).json({ error: 'Hubo un problema al modificar la reserva' });
    }
};

module.exports = {
    crearReserva,
    cancelarReserva,
    obtenerHistorialUsuario,
    pagarReserva,
    modificarReserva
};