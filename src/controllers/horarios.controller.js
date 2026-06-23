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

const generarHorariosSemana = async (req, res) => {
    const { id_cancha, hora_apertura, hora_cierre, bloque_duracion_horas, reiniciar } = req.body;

    if (!id_cancha || !hora_apertura || !hora_cierre) {
        return res.status(400).json({ error: 'Debes proporcionar id_cancha, hora_apertura y hora_cierre' });
    }

    try {
        // Validar que la cancha exista
        const { data: cancha, error: errorCancha } = await supabase
            .from('cancha')
            .select('*')
            .eq('id_cancha', id_cancha)
            .single();

        if (errorCancha || !cancha) {
            return res.status(404).json({ error: 'La cancha especificada no existe.' });
        }

        // Parsear horas (Formato esperado: "HH:MM")
        let [aperturaHora, aperturaMin] = hora_apertura.split(':').map(Number);
        let [cierreHora, cierreMin] = hora_cierre.split(':').map(Number);
        
        let duracionHoras = parseFloat(bloque_duracion_horas) || 1.0;
        let inicioEnMinutos = aperturaHora * 60 + (aperturaMin || 0);
        let finEnMinutos = cierreHora * 60 + (cierreMin || 0);
        let duracionEnMinutos = duracionHoras * 60;

        if (inicioEnMinutos >= finEnMinutos || duracionEnMinutos <= 0) {
            return res.status(400).json({ error: 'Horarios de apertura/cierre o duración del bloque no válidos.' });
        }

        // Generar intervalos
        let bloques = [];
        for (let min = inicioEnMinutos; min + duracionEnMinutos <= finEnMinutos; min += duracionEnMinutos) {
            let hInicio = Math.floor(min / 60);
            let mInicio = min % 60;
            let hFin = Math.floor((min + duracionEnMinutos) / 60);
            let mFin = (min + duracionEnMinutos) % 60;

            const pad = (num) => String(num).padStart(2, '0');
            bloques.push({
                hora_inicio: `${pad(hInicio)}:${pad(mInicio)}:00`,
                hora_fin: `${pad(hFin)}:${pad(mFin)}:00`
            });
        }

        const diasSemana = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
        const registros = [];

        for (const dia of diasSemana) {
            for (const bloque of bloques) {
                registros.push({
                    id_cancha: parseInt(id_cancha),
                    dia_semana: dia,
                    hora_inicio: bloque.hora_inicio,
                    hora_fin: bloque.hora_fin,
                    disponible: true
                });
            }
        }

        // Si se solicita reiniciar, borramos los horarios existentes para esa cancha
        if (reiniciar) {
            console.log(`[GENERADOR] Reiniciando disponibilidad para cancha ${id_cancha}`);
            const { error: errorBorrado } = await supabase
                .from('horariodisponibilidad')
                .delete()
                .eq('id_cancha', id_cancha);
            
            if (errorBorrado) throw errorBorrado;
        }

        // Insertar en lote
        const { data: horariosCreados, error: errorInsercion } = await supabase
            .from('horariodisponibilidad')
            .insert(registros)
            .select();

        if (errorInsercion) throw errorInsercion;

        res.status(201).json({
            mensaje: `Se generaron exitosamente ${horariosCreados.length} bloques de disponibilidad semanal.`,
            cantidad: horariosCreados.length,
            bloquesGenerados: bloques
        });

    } catch (error) {
        console.error('Error al generar disponibilidad semanal:', error);
        res.status(500).json({ error: 'Hubo un problema al generar la disponibilidad semanal.' });
    }
};

module.exports = {
    obtenerDisponibilidad,
    generarHorariosSemana
};