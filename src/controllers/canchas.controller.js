const supabase = require('../config/supabaseClient');

const obtenerCanchasPorRecinto = async (req, res) => {
    // Capturamos el ID del recinto desde la URL
    const { id_recinto } = req.params; 

    try {
        const { data, error } = await supabase
            .from('canchas')
            .select('*')
            .eq('idRecinto', id_recinto); // Filtro: donde id_recinto sea igual al que pasamos

        if (error) {
            throw error;
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener canchas:', error);
        res.status(500).json({ error: 'Hubo un problema al obtener las canchas' });
    }
};

const crearCancha = async (req, res) => {
    const { nombre, deporte, superficie, capacidad, precioPorHora, precioBloque, idRecinto } = req.body;

    try {
        const { data, error } = await supabase
            .from('canchas')
            .insert([
                {
                    nombre,
                    deporte,
                    superficie,
                    capacidad,
                    precioPorHora,
                    precioBloque,
                    idRecinto
                }
            ])
            .select();

        if (error) throw error;

        res.status(201).json({
            mensaje: 'Cancha creada exitosamente',
            cancha: data[0]
        });
    } catch (error) {
        console.error('Error al crear cancha:', error);
        res.status(500).json({ error: 'Hubo un problema al crear la cancha' });
    }
};

const editarCancha = async (req, res) => {
    const { id_cancha } = req.params;
    const { nombre, tipo_deporte, precio_bloque } = req.body;

    try {
        const { data, error } = await supabase
            .from('canchas')
            .update({ 
                nombre: nombre, 
                deporte: deporte, 
                precioBloque: precioBloque
             })
            .eq('id', id_cancha)
            .select();

        if (error) throw error;

        res.status(200).json({
            mensaje: 'Cancha actualizada exitosamente',
            cancha: data[0]
        });
    } catch (error) {
        console.error('Error al editar cancha:', error);
        res.status(500).json({ error: 'Hubo un problema al editar la cancha' });
    }
};

const eliminarCancha = async (req, res) => {
    const { id_cancha } = req.params;

    try {
        const { data, error } = await supabase
            .from('canchas')
            .delete()
            .eq('id', id_cancha)
            .select();

        if (error) throw error;

        res.status(200).json({
            mensaje: 'Cancha eliminada exitosamente',
            cancha: data[0]
        });
    } catch (error) {
        console.error('Error al eliminar cancha:', error);
        res.status(500).json({ error: 'Hubo un problema al eliminar la cancha' });
    }
};

module.exports = {
    obtenerCanchasPorRecinto,
    crearCancha,
    editarCancha,
    eliminarCancha
};