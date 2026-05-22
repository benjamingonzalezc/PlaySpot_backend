const supabase = require('../config/supabaseClient');

const obtenerRecintos = async (req, res) => {
    try {
        // Hacemos un SELECT a la tabla recintodeportivo
        const { data, error } = await supabase
            .from('recintodeportivo')
            .select('*');

        if (error) {
            throw error;
        }

        // Si todo sale bien, respondemos con un status 200 y los datos
        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener recintos:', error);
        res.status(500).json({ error: 'Hubo un problema al obtener los recintos' });
    }
};

module.exports = {
    obtenerRecintos
};