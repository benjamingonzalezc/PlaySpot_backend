const supabase = require('../config/supabaseClient');

const obtenerCanchasPorRecinto = async (req, res) => {
    // Capturamos el ID del recinto desde la URL
    const { id_recinto } = req.params; 

    try {
        const { data, error } = await supabase
            .from('cancha')
            .select('*')
            .eq('id_recinto', id_recinto); // Filtro: donde id_recinto sea igual al que pasamos

        if (error) {
            throw error;
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener canchas:', error);
        res.status(500).json({ error: 'Hubo un problema al obtener las canchas' });
    }
};

module.exports = {
    obtenerCanchasPorRecinto
};