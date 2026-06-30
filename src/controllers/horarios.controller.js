const supabase = require('../config/supabaseClient');

const obtenerDisponibilidad = async (req, res) => {
    const { id_cancha } = req.params;
    // Si no se proporciona fecha, usamos el día de hoy
    let fecha = req.query.fecha;
    if (!fecha) {
        fecha = new Date().toISOString().split('T')[0];
    }

    try {
        // 1. Obtener día de la semana (1 = Lunes, ..., 7 = Domingo)
        const parts = fecha.split('-');
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        let diaSemanaNum = d.getDay(); 
        if (diaSemanaNum === 0) diaSemanaNum = 7; // Domingo es 7 en nuestro seed

        // 2. Obtener los bloques semanales definidos para la cancha en ese día de la semana
        const { data: bloques, error: errorBloques } = await supabase
            .from('horarios_disponibilidad')
            .select('*')
            .eq('canchaId', id_cancha)
            .eq('dia_semana', diaSemanaNum);

        if (errorBloques) throw errorBloques;

        // 3. Obtener reservas activas para la cancha en esa fecha específica
        const { data: reservas, error: errorReservas } = await supabase
            .from('reservas')
            .select('*')
            .eq('canchaId', id_cancha)
            .eq('fecha', fecha)
            .neq('estado', 'cancelada'); // Excluimos canceladas

        if (errorReservas) throw errorReservas;

        // 4. Mapear disponibilidad cruzando bloques de horarios con las reservas existentes
        const disponibilidad = (bloques || []).map(b => {
            // Verificar si este bloque horario coincide con alguna reserva
            const reservado = (reservas || []).some(r => {
                // Formato de hora en Supabase suele ser "HH:MM:SS" o similar. Normalizamos para comparar
                const inicioReserva = r.horaInicio.slice(0, 5); // ej "08:00"
                const inicioBloque = b.horaApertura.slice(0, 5); // ej "08:00"
                return inicioReserva === inicioBloque;
            });

            return {
                id_horario: b.id,
                id_cancha: b.canchaId,
                dia_semana: b.dia_semana,
                hora_inicio: b.horaApertura,
                hora_fin: b.horaCierre,
                disponible: !reservado
            };
        });

        // Ordenamos por hora de inicio para mejor visualización
        disponibilidad.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

        res.status(200).json(disponibilidad);
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
        // Validar que la cancha exista en la tabla 'canchas'
        const { data: cancha, error: errorCancha } = await supabase
            .from('canchas')
            .select('*')
            .eq('id', id_cancha)
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

        // Días representados por número (1 = Lunes, ..., 7 = Domingo)
        const registros = [];
        for (let dia = 1; dia <= 7; dia++) {
            for (const bloque of bloques) {
                registros.push({
                    canchaId: parseInt(id_cancha),
                    dia_semana: dia,
                    horaApertura: bloque.hora_inicio,
                    horaCierre: bloque.hora_fin
                });
            }
        }

        // Si se solicita reiniciar, borramos los horarios existentes para esa cancha
        if (reiniciar) {
            console.log(`[GENERADOR] Reiniciando disponibilidad para cancha ${id_cancha}`);
            const { error: errorBorrado } = await supabase
                .from('horarios_disponibilidad')
                .delete()
                .eq('canchaId', id_cancha);
            
            if (errorBorrado) throw errorBorrado;
        }

        // Insertar en lote
        const { data: horariosCreados, error: errorInsercion } = await supabase
            .from('horarios_disponibilidad')
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