const supabase = require('./src/config/supabaseClient');
const bcrypt = require('bcrypt');

async function seed() {
  console.log("🚀 Iniciando población ampliada de base de datos Supabase con 7 recintos...");

  try {
    // 1. Limpiar datos existentes (reservas primero por FK, luego horarios, canchas, recintos y usuarios)
    console.log("🧹 Limpiando tablas existentes...");
    await supabase.from('reservas').delete().neq('id', 0);
    await supabase.from('horarios_disponibilidad').delete().neq('id', 0);
    await supabase.from('canchas').delete().neq('id', 0);
    await supabase.from('recintos').delete().neq('id', 0);
    await supabase.from('usuarios').delete().neq('id', 0);

    // 2. Insertar Usuarios con IDs fijos (1 y 2)
    console.log("👥 Insertando usuarios de prueba...");
    const salt = await bcrypt.genSalt(10);
    const hashAdmin = await bcrypt.hash('admin123', salt);
    const hashDemo = await bcrypt.hash('123456', salt);

    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('usuarios')
      .insert([
        {
          id: 1,
          rut: '11.111.111-1',
          nombre: 'Admin PlaySpot',
          email: 'admin@playspot.cl',
          contrasena: hashAdmin,
          id_rol: 1
        },
        {
          id: 2,
          rut: '12.345.678-9',
          nombre: 'Usuario Demo',
          email: 'demo@playspot.cl',
          contrasena: hashDemo,
          id_rol: 3
        }
      ])
      .select();

    if (errorUsuarios) throw errorUsuarios;
    console.log(`✅ Usuarios insertados: ${usuarios.length}`);

    // 3. Insertar 7 Recintos con IDs fijos (1 al 7)
    console.log("🏢 Insertando 7 recintos...");
    const { data: recintos, error: errorRecintos } = await supabase
      .from('recintos')
      .insert([
        { id: 1, nombre: 'Arena Providencia', direccion: 'Av. Providencia 2145' },
        { id: 2, nombre: 'Club Deportivo Ñuñoa', direccion: 'Av. Grecia 1800' },
        { id: 3, nombre: 'Padel Club Las Condes', direccion: 'Av. Apoquindo 4500' },
        { id: 4, nombre: 'Estadio Municipal Maipú', direccion: 'Av. Los Pajaritos 3200' },
        { id: 5, nombre: 'Sport Center Viña del Mar', direccion: 'Av. San Martín 850' },
        { id: 6, nombre: 'Multideportivo La Florida', direccion: 'Av. Vicuña Mackenna 6100' },
        { id: 7, nombre: 'Tennis Club Concepción', direccion: 'Av. Pedro de Valdivia 1200' }
      ])
      .select();

    if (errorRecintos) throw errorRecintos;
    console.log(`✅ Recintos insertados: ${recintos.length}`);

    // 4. Insertar 14 Canchas con IDs fijos (1 al 14)
    console.log("🥎 Insertando canchas...");
    const { data: canchas, error: errorCanchas } = await supabase
      .from('canchas')
      .insert([
        // Recinto 1 (id: 1)
        { id: 1, idRecinto: 1, nombre: 'Cancha Fútbol 7 Norte', deporte: 'fútbol', superficie: 'Césped sintético', capacidad: 14, precioPorHora: 18000, precioBloque: 9000, estado: 'disponible' },
        { id: 2, idRecinto: 1, nombre: 'Pádel Premium 1', deporte: 'pádel', superficie: 'Cristal', capacidad: 4, precioPorHora: 22000, precioBloque: 11000, estado: 'disponible' },
        // Recinto 2 (id: 2)
        { id: 3, idRecinto: 2, nombre: 'Básquetbol Principal', deporte: 'básquetbol', superficie: 'Parquet', capacidad: 10, precioPorHora: 14000, precioBloque: 7000, estado: 'disponible' },
        { id: 4, idRecinto: 2, nombre: 'Fútbol 5 Techado', deporte: 'fútbol', superficie: 'Césped sintético', capacidad: 10, precioPorHora: 16000, precioBloque: 8000, estado: 'disponible' },
        // Recinto 3 (id: 3)
        { id: 5, idRecinto: 3, nombre: 'Pádel Panorámica 1', deporte: 'pádel', superficie: 'Cristal', capacidad: 4, precioPorHora: 25000, precioBloque: 12500, estado: 'disponible' },
        { id: 6, idRecinto: 3, nombre: 'Tenis Profesional A', deporte: 'tenis', superficie: 'Hard court', capacidad: 4, precioPorHora: 20000, precioBloque: 10000, estado: 'disponible' },
        // Recinto 4 (id: 4)
        { id: 7, idRecinto: 4, nombre: 'Fútbol 11 Césped Natural', deporte: 'fútbol', superficie: 'Césped natural', capacidad: 22, precioPorHora: 30000, precioBloque: 15000, estado: 'disponible' },
        { id: 8, idRecinto: 4, nombre: 'Fútbol 7 Rápido', deporte: 'fútbol', superficie: 'Césped sintético', capacidad: 14, precioPorHora: 15000, precioBloque: 7500, estado: 'disponible' },
        // Recinto 5 (id: 5)
        { id: 9, idRecinto: 5, nombre: 'Vóleibol de Playa 1', deporte: 'vóleibol', superficie: 'Arena', capacidad: 12, precioPorHora: 12000, precioBloque: 6000, estado: 'disponible' },
        { id: 10, idRecinto: 5, nombre: 'Tenis Arcilla Central', deporte: 'tenis', superficie: 'Arcilla', capacidad: 4, precioPorHora: 18000, precioBloque: 9000, estado: 'disponible' },
        // Recinto 6 (id: 6)
        { id: 11, idRecinto: 6, nombre: 'Fútbol 7 La Florida', deporte: 'fútbol', superficie: 'Césped sintético', capacidad: 14, precioPorHora: 16000, precioBloque: 8000, estado: 'disponible' },
        { id: 12, idRecinto: 6, nombre: 'Pádel Outdoor 1', deporte: 'pádel', superficie: 'Cristal', capacidad: 4, precioPorHora: 20000, precioBloque: 10000, estado: 'disponible' },
        // Recinto 7 (id: 7)
        { id: 13, idRecinto: 7, nombre: 'Tenis Arcilla 1', deporte: 'tenis', superficie: 'Arcilla', capacidad: 4, precioPorHora: 15000, precioBloque: 7500, estado: 'disponible' },
        { id: 14, idRecinto: 7, nombre: 'Pádel Club Sur', deporte: 'pádel', superficie: 'Cristal', capacidad: 4, precioPorHora: 22000, precioBloque: 11000, estado: 'disponible' }
      ])
      .select();

    if (errorCanchas) throw errorCanchas;
    console.log(`✅ Canchas insertadas: ${canchas.length}`);

    // 5. Insertar Horarios de disponibilidad con IDs fijos (1 al 980)
    console.log("⏰ Generando bloques de disponibilidad para cada cancha...");
    const horarios = [];
    const bloques = [
      { apertura: '08:00:00', cierre: '09:00:00' },
      { apertura: '09:00:00', cierre: '10:00:00' },
      { apertura: '10:00:00', cierre: '11:00:00' },
      { apertura: '11:00:00', cierre: '12:00:00' },
      { apertura: '14:00:00', cierre: '15:00:00' },
      { apertura: '15:00:00', cierre: '16:00:00' },
      { apertura: '16:00:00', cierre: '17:00:00' },
      { apertura: '18:00:00', cierre: '19:00:00' },
      { apertura: '19:00:00', cierre: '20:00:00' },
      { apertura: '20:00:00', cierre: '21:00:00' }
    ];

    let horarioId = 1;
    // Para cada cancha (1 al 14), dia 1 (Lunes) a 7 (Domingo), generamos bloques
    for (const c of canchas) {
      for (let dia = 1; dia <= 7; dia++) {
        for (const b of bloques) {
          horarios.push({
            id: horarioId++,
            canchaId: c.id,
            dia_semana: dia,
            horaApertura: b.apertura,
            horaCierre: b.cierre
          });
        }
      }
    }

    // Insertar en lotes de 100
    const loteSize = 100;
    for (let i = 0; i < horarios.length; i += loteSize) {
      const lote = horarios.slice(i, i + loteSize);
      const { error: errorHorarios } = await supabase
        .from('horarios_disponibilidad')
        .insert(lote);
      if (errorHorarios) throw errorHorarios;
    }

    console.log(`✅ Bloques de disponibilidad insertados: ${horarios.length}`);
    console.log("🎉 Base de datos poblada exitosamente con 7 recintos y 14 canchas!");

  } catch (error) {
    console.error("❌ Error durante la población de datos:", error.message);
  }
}

seed();
