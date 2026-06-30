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

const obtenerRecintoPorId = async (req, res) => {
    const { id_recinto } = req.params;
    try {
        const { data, error } = await supabase
            .from('recintos')
            .select('*')
            .eq('id', id_recinto)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'El recinto especificado no existe.' });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener recinto:', error);
        res.status(500).json({ error: 'Hubo un problema al obtener el recinto' });
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

const editarRecinto = async (req, res) => {
    const { id_recinto } = req.params;
    const { nombre, direccion } = req.body;

    try {
        const { data, error } = await supabase
            .from('recintos')
            .update({ nombre, direccion })
            .eq('id', id_recinto)
            .select();

        if (error) throw error;

        if (data.length === 0) {
            return res.status(404).json({ error: 'El recinto no existe o no se pudo actualizar.' });
        }

        res.status(200).json({
            mensaje: 'Recinto actualizado exitosamente',
            recinto: data[0]
        });
    } catch (error) {
        console.error('Error al editar recinto:', error);
        res.status(500).json({ error: 'Hubo un problema al editar el recinto' });
    }
};

const eliminarRecinto = async (req, res) => {
    const { id_recinto } = req.params;

    try {
        // Verificar primero si tiene canchas con reservas activas (opcional/seguridad básica)
        const { data: canchas, error: errorCanchas } = await supabase
            .from('canchas')
            .select('id')
            .eq('idRecinto', id_recinto);

        if (errorCanchas) throw errorCanchas;

        if (canchas && canchas.length > 0) {
            const canchaIds = canchas.map(c => c.id);
            const { data: reservas, error: errorReservas } = await supabase
                .from('reservas')
                .select('id')
                .in('canchaId', canchaIds)
                .neq('estado', 'cancelada');

            if (errorReservas) throw errorReservas;

            if (reservas && reservas.length > 0) {
                return res.status(400).json({ error: 'No se puede eliminar el recinto porque tiene canchas con reservas activas.' });
            }

            // Eliminar horarios y canchas asociadas
            await supabase.from('horarios_disponibilidad').delete().in('canchaId', canchaIds);
            await supabase.from('canchas').delete().in('id', canchaIds);
        }

        const { data, error } = await supabase
            .from('recintos')
            .delete()
            .eq('id', id_recinto)
            .select();

        if (error) throw error;

        if (data.length === 0) {
            return res.status(404).json({ error: 'El recinto no existe.' });
        }

        res.status(200).json({
            mensaje: 'Recinto eliminado exitosamente',
            recinto: data[0]
        });
    } catch (error) {
        console.error('Error al eliminar recinto:', error);
        res.status(500).json({ error: 'Hubo un problema al eliminar el recinto' });
    }
};

module.exports = {
    obtenerRecintos,
    obtenerRecintoPorId,
    crearRecinto,
    editarRecinto,
    eliminarRecinto
};