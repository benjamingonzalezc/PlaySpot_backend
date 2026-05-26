const supabase = require('../config/supabaseClient');

const obtenerDisponibilidad = async (req, res) => {
    const { id_cancha } = req.params;

    try {
        const { data, error } = await supabase
            .from('horariodisponibilidad')
            .select('*')
            .eq('id_cancha', id_cancha)
            .eq('disponible', true); // La clave: Solo traemos los que no están reservados

        if (error) {
            throw error;
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener disponibilidad:', error);
        res.status(500).json({ error: 'Hubo un problema al cargar los horarios' });
    }
};

module.exports = {
    obtenerDisponibilidad
};