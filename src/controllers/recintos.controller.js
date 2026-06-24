const supabase = require('../config/supabaseClient');

const obtenerRecintos = async (req, res) => {
    try {
        // Hacemos un SELECT a la tabla recintodeportivo
        const { data, error } = await supabase
            .from('recintos')
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

const crearRecinto = async (req, res) => {
    const { nombre, direccion } = req.body;

    try {
        const { data, error } = await supabase
            .from('recintos')
            .insert([
                {
                    nombre,
                    direccion
                }
            ])
            .select();

        if (error) throw error;

        res.status(201).json({
            mensaje: 'Recinto creado exitosamente',
            recinto: data[0]
        });
    } catch (error) {
        console.error('Error al crear recinto:', error);
        res.status(500).json({ error: 'Hubo un problema al crear el recinto' });
    }
};

module.exports = {
    obtenerRecintos,
    crearRecinto
};