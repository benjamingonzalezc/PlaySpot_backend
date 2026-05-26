const supabase = require('../config/supabaseClient');

const crearReserva = async (req, res) => {
    // Capturamos los datos que nos envían para hacer la reserva
    const { id_usuario, id_cancha, fecha, hora_inicio, hora_fin, id_horario } = req.body;

    try {
        // Paso 1: Insertamos la nueva reserva en la tabla 'reserva'
        const { data: reservaGenerada, error: errorReserva } = await supabase
            .from('reserva')
            .insert([
                {
                    id_usuario,
                    id_cancha,
                    fecha,
                    hora_inicio,
                    hora_fin,
                    estado_reserva: 'Confirmada',
                    codigo_reserva: `PLAY-${Date.now()}` // Generamos un código único al azar
                }
            ])
            .select();

        if (errorReserva) throw errorReserva;

        // Paso 2: Actualizamos la disponibilidad de ese bloque para que ya no aparezca
        const { error: errorDisponibilidad } = await supabase
            .from('horariodisponibilidad')
            .update({ disponible: false })
            .eq('id_horario', id_horario);

        if (errorDisponibilidad) throw errorDisponibilidad;

        // Si todo sale bien, respondemos con éxito
        res.status(201).json({
            mensaje: '¡Reserva creada con éxito!',
            reserva: reservaGenerada[0]
        });

    } catch (error) {
        console.error('Error al crear la reserva:', error);
        res.status(500).json({ error: 'Hubo un problema al procesar la reserva' });
    }
};
const cancelarReserva = async (req, res) => {
    // Tomamos el ID de la reserva desde la URL
    const { id_reserva } = req.params;
    // Tomamos el ID del horario desde el cuerpo para volver a liberarlo
    const { id_horario } = req.body; 

    try {
        // Paso 1: Cambiamos el estado de la reserva a 'Cancelada'
        const { data: reservaCancelada, error: errorReserva } = await supabase
            .from('reserva')
            .update({ estado_reserva: 'Cancelada' })
            .eq('id_reserva', id_reserva)
            .select();

        if (errorReserva) throw errorReserva;

        // Paso 2: Volvemos a dejar 'true' la disponibilidad para que otro pueda reservar
        const { error: errorDisponibilidad } = await supabase
            .from('horariodisponibilidad')
            .update({ disponible: true })
            .eq('id_horario', id_horario);

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

module.exports = {
    crearReserva,
    cancelarReserva
};