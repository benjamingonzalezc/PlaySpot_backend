const supabase = require('../config/supabaseClient');

const obtenerReportePorFecha = async (req, res) => {
    const { fecha } = req.params;

    try {
        const { data, error } = await supabase
            .from('reserva')
            .select('*')
            .eq('fecha', fecha);

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener reporte por fecha:', error);
        res.status(500).json({ error: 'Hubo un problema al generar el reporte' });
    }
};

const obtenerReportePorRango = async (req, res) => {
    const { inicio, fin } = req.query;

    if (!inicio || !fin) {
        return res.status(400).json({ error: 'Debes proporcionar fechas de inicio y fin en los query params' });
    }

    try {
        const { data, error } = await supabase
            .from('reserva')
            .select('*')
            .gte('fecha', inicio)
            .lte('fecha', fin);

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener reporte por rango:', error);
        res.status(500).json({ error: 'Hubo un problema al generar el reporte' });
    }
};

const obtenerDisponibilidadGeneral = async (req, res) => {
    const { deporte } = req.query;

    try {
        let query = supabase
            .from('horariodisponibilidad')
            .select('*, cancha!inner(*)') // Hacemos join con cancha
            .eq('disponible', true);

        // Si mandan el filtro de deporte, lo aplicamos
        if (deporte) {
            query = query.eq('cancha.tipo_deporte', deporte);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener disponibilidad general:', error);
        res.status(500).json({ error: 'Hubo un problema al cargar la disponibilidad' });
    }
};

module.exports = {
    obtenerReportePorFecha,
    obtenerReportePorRango,
    obtenerDisponibilidadGeneral
};
