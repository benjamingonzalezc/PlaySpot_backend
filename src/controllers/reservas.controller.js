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

module.exports = {
    crearReserva
};