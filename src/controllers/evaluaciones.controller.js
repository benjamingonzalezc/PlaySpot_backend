const dbFallback = require('../config/dbFallback');
const supabase = require('../config/supabaseClient');

const crearEvaluacion = async (req, res) => {
  const {
    reservaId,
    recintoId,
    puntuacionGeneral,
    limpiezaCancha,
    puntualidad,
    comentarios,
  } = req.body;

  const id_usuario = req.usuario.id_usuario;

  if (!reservaId || !recintoId || !puntuacionGeneral) {
    return res.status(400).json({ error: 'Debes proporcionar reservaId, recintoId y puntuacionGeneral.' });
  }

  try {
    // 1. Verificar que la reserva exista, pertenezca al usuario y esté confirmada
    const { data: reserva, error: errorReserva } = await supabase
      .from('reservas')
      .select('*')
      .eq('id', reservaId)
      .single();

    if (errorReserva || !reserva) {
      return res.status(404).json({ error: 'La reserva especificada no existe.' });
    }

    if (String(reserva.userId) !== String(id_usuario)) {
      return res.status(403).json({ error: 'No tienes permisos para evaluar esta reserva.' });
    }

    // 2. Verificar que no haya una evaluación previa para esta reserva
    const evaluacionesExistentes = await dbFallback.selectRows('evaluaciones', { reservaId });
    if (evaluacionesExistentes.length > 0) {
      return res.status(400).json({ error: 'Esta reserva ya ha sido evaluada.' });
    }

    // 3. Crear el registro en Supabase o Fallback Local
    const nuevaEval = await dbFallback.insertRow('evaluaciones', {
      reservaId: parseInt(reservaId),
      userId: parseInt(id_usuario),
      recintoId: parseInt(recintoId),
      puntuacionGeneral: parseInt(puntuacionGeneral),
      limpiezaCancha: parseInt(limpiezaCancha || 5),
      puntualidad: parseInt(puntualidad || 5),
      comentarios: comentarios || '',
      fechaEvaluacion: new Date().toISOString(),
    });

    res.status(201).json({
      mensaje: 'Evaluación registrada correctamente. ¡Gracias por tus comentarios!',
      evaluacion: nuevaEval,
    });

  } catch (error) {
    console.error('Error al crear evaluación:', error);
    res.status(500).json({ error: 'Hubo un problema al guardar tu evaluación.' });
  }
};

const obtenerEvaluacionesRecinto = async (req, res) => {
  const { id_recinto } = req.params;

  try {
    // 1. Obtener todas las evaluaciones del recinto
    const evaluaciones = await dbFallback.selectRows('evaluaciones', { recintoId: id_recinto });

    if (evaluaciones.length === 0) {
      return res.status(200).json({
        evaluaciones: [],
        promedioGeneral: 0,
        promedioLimpieza: 0,
        promedioPuntualidad: 0,
        total: 0,
      });
    }

    // 2. Enriquecer las evaluaciones con el nombre del usuario
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('usuarios')
      .select('id, nombre');

    const usuariosMap = {};
    if (!errorUsuarios && usuarios) {
      usuarios.forEach((u) => {
        usuariosMap[u.id] = u.nombre;
      });
    }

    const enriquecidas = evaluaciones.map((ev) => ({
      ...ev,
      usuarioNombre: usuariosMap[ev.userId] || 'Usuario Anónimo',
    }));

    // 3. Calcular promedios
    const total = evaluaciones.length;
    const sumGeneral = evaluaciones.reduce((acc, ev) => acc + (ev.puntuacionGeneral || 0), 0);
    const sumLimpieza = evaluaciones.reduce((acc, ev) => acc + (ev.limpiezaCancha || 0), 0);
    const sumPuntualidad = evaluaciones.reduce((acc, ev) => acc + (ev.puntualidad || 0), 0);

    res.status(200).json({
      evaluaciones: enriquecidas,
      promedioGeneral: parseFloat((sumGeneral / total).toFixed(1)),
      promedioLimpieza: parseFloat((sumLimpieza / total).toFixed(1)),
      promedioPuntualidad: parseFloat((sumPuntualidad / total).toFixed(1)),
      total,
    });

  } catch (error) {
    console.error('Error al obtener evaluaciones del recinto:', error);
    res.status(500).json({ error: 'Hubo un problema al cargar las evaluaciones del recinto.' });
  }
};

module.exports = {
  crearEvaluacion,
  obtenerEvaluacionesRecinto,
};
