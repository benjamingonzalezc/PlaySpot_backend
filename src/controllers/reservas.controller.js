const supabase = require('../config/supabaseClient');

const crearReserva = async (req, res) => {
    // Capturamos los datos que nos envían para hacer la reserva
    const { id_cancha, fecha, hora_inicio, hora_fin, id_horario } = req.body;
    
    // Obtener id_usuario de forma segura del token. Solo el Admin (1) puede forzar un id_usuario de terceros.
    const id_usuario = req.usuario.id_rol === 1 ? (req.body.id_usuario || req.usuario.id_usuario) : req.usuario.id_usuario;

    // Combinamos la fecha y hora que envía el usuario
    const fechaReserva = new Date(`${fecha}T${hora_inicio}`);
    const fechaActual = new Date();

    // Si la fecha de la reserva es menor a la fecha actual, bloqueamos la acción
    if (fechaReserva < fechaActual) {
        return res.status(400).json({ 
            error: 'Máquina del tiempo no detectada: No puedes reservar en una fecha u hora del pasado.' 
        });
    }

    try {
        // Paso 1: Verificar disponibilidad del bloque horario en 'horariodisponibilidad'
        const { data: horario, error: errorHorario } = await supabase
            .from('horariodisponibilidad')
            .select('*')
            .eq('id_horario', id_horario)
            .single();

        if (errorHorario || !horario) {
            return res.status(404).json({ error: 'El bloque horario especificado no existe.' });
        }

        if (!horario.disponible) {
            return res.status(400).json({ error: 'El bloque horario ya se encuentra reservado.' });
        }

        // Paso 2: Insertamos la nueva reserva con estado 'Pendiente de Pago'
        const { data: reservaGenerada, error: errorReserva } = await supabase
            .from('reserva')
            .insert([
                {
                    id_usuario,
                    id_cancha,
                    fecha,
                    hora_inicio,
                    hora_fin,
                    estado_reserva: 'Pendiente de Pago',
                    codigo_reserva: `PLAY-${Date.now()}` // Generamos un código único al azar
                }
            ])
            .select();

        if (errorReserva) throw errorReserva;

        // Paso 3: Actualizamos la disponibilidad de ese bloque para que ya no aparezca
        const { error: errorDisponibilidad } = await supabase
            .from('horariodisponibilidad')
            .update({ disponible: false })
            .eq('id_horario', id_horario);

        if (errorDisponibilidad) throw errorDisponibilidad;

        // Si todo sale bien, respondemos con éxito
        res.status(201).json({
            mensaje: '¡Reserva creada! Pendiente de pago para confirmar.',
            reserva: reservaGenerada[0]
        });

    } catch (error) {
        console.error('Error al crear la reserva:', error);
        res.status(500).json({ error: 'Hubo un problema al procesar la reserva' });
    }
};

const cancelarReserva = async (req, res) => {
    const { id_reserva } = req.params;
    const { id_horario } = req.body; 

    try {
        // Paso 1: Obtener la reserva para verificar existencia y pertenencia
        const { data: reserva, error: errorReserva } = await supabase
            .from('reserva')
            .select('*')
            .eq('id_reserva', id_reserva)
            .single();

        if (errorReserva || !reserva) {
            return res.status(404).json({ error: 'La reserva especificada no existe.' });
        }

        // Verificar propiedad (Solo dueños de la reserva, propietarios del recinto o admin pueden cancelar)
        const esAdmin = req.usuario.id_rol === 1;
        const esPropietario = req.usuario.id_rol === 2;
        const esDuenioReserva = reserva.id_usuario === req.usuario.id_usuario;

        if (!esAdmin && !esPropietario && !esDuenioReserva) {
            return res.status(403).json({ error: 'No tienes permisos para cancelar esta reserva.' });
        }

        if (reserva.estado_reserva === 'Cancelada') {
            return res.status(400).json({ error: 'Esta reserva ya se encuentra cancelada.' });
        }

        // Paso 2: Identificar el id_horario correcto a liberar
        let finalHorarioId = id_horario;
        if (!finalHorarioId) {
            // Resolver id_horario dinámicamente si no se suministra
            const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
            const fechaLocal = new Date(reserva.fecha + 'T12:00:00');
            const diaSemana = diasSemana[fechaLocal.getDay()];

            const { data: horarioEncontrado } = await supabase
                .from('horariodisponibilidad')
                .select('id_horario')
                .eq('id_cancha', reserva.id_cancha)
                .eq('dia_semana', diaSemana)
                .eq('hora_inicio', reserva.hora_inicio)
                .eq('hora_fin', reserva.hora_fin)
                .limit(1);

            if (horarioEncontrado && horarioEncontrado.length > 0) {
                finalHorarioId = horarioEncontrado[0].id_horario;
            }
        } else {
            // Validar que el id_horario provisto coincida con la reserva
            const { data: horario, error: errorHorario } = await supabase
                .from('horariodisponibilidad')
                .select('*')
                .eq('id_horario', id_horario)
                .single();

            if (errorHorario || !horario || horario.id_cancha !== reserva.id_cancha || horario.hora_inicio !== reserva.hora_inicio) {
                return res.status(400).json({ error: 'El bloque horario provisto no coincide con los detalles de la reserva.' });
            }
        }

        if (!finalHorarioId) {
            return res.status(400).json({ error: 'No se pudo identificar el bloque horario asociado para liberarlo.' });
        }

        // Paso 3: Cambiar el estado de la reserva a 'Cancelada'
        const { data: reservaCancelada, error: errorUpdateReserva } = await supabase
            .from('reserva')
            .update({ estado_reserva: 'Cancelada' })
            .eq('id_reserva', id_reserva)
            .select();

        if (errorUpdateReserva) throw errorUpdateReserva;

        // Paso 4: Volver a habilitar la disponibilidad del bloque
        const { error: errorDisponibilidad } = await supabase
            .from('horariodisponibilidad')
            .update({ disponible: true })
            .eq('id_horario', finalHorarioId);

        if (errorDisponibilidad) throw errorDisponibilidad;

        res.status(200).json({
            mensaje: 'Reserva cancelada y cancha liberada exitosamente',
            reserva: reservaCancelada[0]
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
            .from('reserva')
            .select('*')
            .eq('id_usuario', id_usuario);

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'Hubo un problema al cargar el historial' });
    }
};

const pagarReserva = async (req, res) => {
    const { id_reserva } = req.params;
    const { metodo_pago } = req.body;

    try {
        const { data: reserva, error: errorReserva } = await supabase
            .from('reserva')
            .select('*')
            .eq('id_reserva', id_reserva)
            .single();

        if (errorReserva || !reserva) {
            return res.status(404).json({ error: 'La reserva especificada no existe.' });
        }

        // Validar propiedad del usuario (Solo el dueño de la reserva o admin pueden pagar)
        const esAdmin = req.usuario.id_rol === 1;
        const esDuenioReserva = reserva.id_usuario === req.usuario.id_usuario;

        if (!esAdmin && !esDuenioReserva) {
            return res.status(403).json({ error: 'No tienes permisos para pagar esta reserva.' });
        }

        if (reserva.estado_reserva !== 'Pendiente de Pago') {
            return res.status(400).json({ error: `La reserva no está pendiente de pago. Estado actual: ${reserva.estado_reserva}` });
        }

        // Simulación de pasarela de pago (Mercado Pago / Webpay)
        console.log(`[PAGO SIMULADO] Procesando transacción para la reserva ${id_reserva} mediante ${metodo_pago || 'Webpay'}`);

        const { data: reservaConfirmada, error: errorConfirmacion } = await supabase
            .from('reserva')
            .update({ estado_reserva: 'Confirmada' })
            .eq('id_reserva', id_reserva)
            .select();

        if (errorConfirmacion) throw errorConfirmacion;

        res.status(200).json({
            mensaje: 'Pago simulado procesado con éxito y reserva confirmada.',
            reserva: reservaConfirmada[0],
            pagoSimulado: {
                transaccionId: `PAY-${Date.now()}`,
                metodo_pago: metodo_pago || 'Webpay',
                monto: 20000,
                estado: 'Aprobado',
                fecha: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error al pagar la reserva:', error);
        res.status(500).json({ error: 'Hubo un problema al procesar el pago de la reserva' });
    }
};

module.exports = {
    crearReserva,
    cancelarReserva,
    obtenerHistorialUsuario,
    pagarReserva
};