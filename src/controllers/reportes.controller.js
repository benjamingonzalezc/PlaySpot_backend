const supabase = require('../config/supabaseClient');

// RF5.1 – Reporte por fecha exacta
const obtenerReportePorFecha = async (req, res) => {
    const { fecha } = req.params;

    try {
        const { data, error } = await supabase
            .from('reservas')
            .select('*')
            .eq('fecha', fecha);

        if (error) throw error;

        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener reporte por fecha:', error);
        res.status(500).json({ error: 'Hubo un problema al generar el reporte' });
    }
};

// RF5.2 – Reporte por rango de fechas
const obtenerReportePorRango = async (req, res) => {
    const { inicio, fin } = req.query;

    if (!inicio || !fin) {
        return res.status(400).json({ error: 'Debes proporcionar fechas de inicio y fin en los query params' });
    }

    try {
        const { data, error } = await supabase
            .from('reservas')
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

// RF5.3 – Consultar canchas disponibles por deporte
const obtenerDisponibilidadGeneral = async (req, res) => {
    const { deporte, fecha } = req.query;

    try {
        // 1. Obtener canchas, opcionalmente filtradas por deporte
        let queryCanchas = supabase
            .from('canchas')
            .select('*, recintos(nombre, direccion)');

        if (deporte) {
            queryCanchas = queryCanchas.eq('deporte', deporte);
        }

        const { data: canchas, error: errorCanchas } = await queryCanchas;
        if (errorCanchas) throw errorCanchas;

        // 2. Para cada cancha, calcular la disponibilidad cruzando horarios con reservas
        const fechaConsulta = fecha || new Date().toISOString().split('T')[0];
        const parts = fechaConsulta.split('-');
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        let diaSemanaNum = d.getDay();
        if (diaSemanaNum === 0) diaSemanaNum = 7;

        const resultado = [];

        for (const cancha of canchas) {
            // Obtener bloques horarios del día
            const { data: bloques, error: errorBloques } = await supabase
                .from('horarios_disponibilidad')
                .select('*')
                .eq('canchaId', cancha.id)
                .eq('dia_semana', diaSemanaNum);

            if (errorBloques) throw errorBloques;

            // Obtener reservas activas para esa cancha/fecha
            const { data: reservas, error: errorReservas } = await supabase
                .from('reservas')
                .select('*')
                .eq('canchaId', cancha.id)
                .eq('fecha', fechaConsulta)
                .neq('estado', 'cancelada');

            if (errorReservas) throw errorReservas;

            const bloquesDisponibles = (bloques || []).filter(b => {
                const inicioBloque = b.horaApertura.slice(0, 5);
                return !(reservas || []).some(r => r.horaInicio.slice(0, 5) === inicioBloque);
            });

            resultado.push({
                cancha_id: cancha.id,
                cancha_nombre: cancha.nombre,
                deporte: cancha.deporte,
                superficie: cancha.superficie,
                precioPorHora: cancha.precioPorHora,
                recinto_nombre: cancha.recintos?.nombre || 'Sin recinto',
                recinto_direccion: cancha.recintos?.direccion || '',
                fecha: fechaConsulta,
                total_bloques: (bloques || []).length,
                bloques_disponibles: bloquesDisponibles.length,
                bloques_ocupados: (bloques || []).length - bloquesDisponibles.length,
                horarios: bloquesDisponibles.map(b => ({
                    hora_inicio: b.horaApertura,
                    hora_fin: b.horaCierre
                }))
            });
        }

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al obtener disponibilidad general:', error);
        res.status(500).json({ error: 'Hubo un problema al cargar la disponibilidad' });
    }
};

const exportarReporteCSV = async (req, res) => {
    const { inicio, fin } = req.query;

    try {
        let query = supabase.from('reservas').select('*');
        if (inicio) query = query.gte('fecha', inicio);
        if (fin) query = query.lte('fecha', fin);

        const { data: reservas, error } = await query;
        if (error) throw error;

        // Generar CSV manualmente
        const headers = ['ID', 'Código', 'ID Usuario', 'ID Cancha', 'Recinto', 'Cancha', 'Deporte', 'Fecha', 'Hora Inicio', 'Hora Fin', 'Total', 'Método Pago', 'Estado', 'Fecha Creación'];
        const rows = (reservas || []).map(r => [
            r.id,
            r.codigo,
            r.userId,
            r.canchaId,
            `"${r.recintoNombre || ''}"`,
            `"${r.canchaNombre || ''}"`,
            r.deporte || '',
            r.fecha,
            r.horaInicio,
            r.horaFin,
            r.total,
            r.metodoPago || 'webpay',
            r.estado,
            r.fechaCreacion || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=reporte-reservas-${Date.now()}.csv`);
        res.status(200).send(csvContent);

    } catch (error) {
        console.error('Error al exportar reporte CSV:', error);
        res.status(500).json({ error: 'Hubo un problema al generar el archivo CSV' });
    }
};

const exportarReportePDF = async (req, res) => {
    const { inicio, fin } = req.query;

    try {
        let query = supabase.from('reservas').select('*');
        if (inicio) query = query.gte('fecha', inicio);
        if (fin) query = query.lte('fecha', fin);

        const { data: reservas, error } = await query;
        if (error) throw error;

        // Calcular estadísticas
        const totalIngresos = (reservas || []).reduce((sum, r) => sum + (r.total || 0), 0);
        const totalReservas = (reservas || []).length;
        const confirmadas = (reservas || []).filter(r => r.estado === 'confirmada').length;
        const pendientes = (reservas || []).filter(r => r.estado === 'pendiente').length;

        // Generar HTML estético
        const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Reporte de Reservas - PlaySpot</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
                
                body {
                    font-family: 'Outfit', sans-serif;
                    color: #1e293b;
                    margin: 0;
                    padding: 40px;
                    background-color: #ffffff;
                }
                
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #f1f5f9;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                
                .logo {
                    font-size: 28px;
                    font-weight: 700;
                    color: #047857;
                }
                
                .title-area h1 {
                    font-size: 24px;
                    margin: 0;
                    color: #0f172a;
                }
                
                .title-area p {
                    font-size: 14px;
                    color: #64748b;
                    margin: 5px 0 0;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    margin-bottom: 35px;
                }
                
                .stat-card {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                }
                
                .stat-card span {
                    display: block;
                    font-size: 12px;
                    color: #64748b;
                    text-transform: uppercase;
                    font-weight: 600;
                    margin-bottom: 5px;
                }
                
                .stat-card strong {
                    font-size: 24px;
                    color: #0f172a;
                    font-weight: 700;
                }
                
                .stat-card.primary strong {
                    color: #047857;
                }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                    font-size: 14px;
                }
                
                th, td {
                    padding: 12px 15px;
                    text-align: left;
                    border-bottom: 1px solid #e2e8f0;
                }
                
                th {
                    background-color: #f1f5f9;
                    color: #475569;
                    font-weight: 600;
                }
                
                tr:hover {
                    background-color: #f8fafc;
                }
                
                .badge {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 9999px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: capitalize;
                }
                
                .badge-confirmada {
                    background-color: #d1fae5;
                    color: #065f46;
                }
                
                .badge-pendiente {
                    background-color: #fef3c7;
                    color: #92400e;
                }
                
                .badge-cancelada {
                    background-color: #fee2e2;
                    color: #991b1b;
                }

                @media print {
                    body {
                        padding: 0;
                    }
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title-area">
                    <h1>Reporte de Reservas</h1>
                    <p>Filtro: ${inicio || 'Inicio'} hasta ${fin || 'Fin'}</p>
                </div>
                <div class="logo">PlaySpot</div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card primary">
                    <span>Ingresos Totales</span>
                    <strong>$${totalIngresos.toLocaleString('es-CL')}</strong>
                </div>
                <div class="stat-card">
                    <span>Total Reservas</span>
                    <strong>${totalReservas}</strong>
                </div>
                <div class="stat-card">
                    <span>Confirmadas</span>
                    <strong>${confirmadas}</strong>
                </div>
                <div class="stat-card">
                    <span>Pendientes</span>
                    <strong>${pendientes}</strong>
                </div>
            </div>
            
            <h2>Listado Detallado de Reservas</h2>
            <table>
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Recinto</th>
                        <th>Cancha</th>
                        <th>Deporte</th>
                        <th>Fecha</th>
                        <th>Horario</th>
                        <th>Total</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${(reservas || []).map(r => `
                        <tr>
                            <td><strong>${r.codigo}</strong></td>
                            <td>${r.recintoNombre || '—'}</td>
                            <td>${r.canchaNombre || '—'}</td>
                            <td style="text-transform: capitalize;">${r.deporte || '—'}</td>
                            <td>${r.fecha}</td>
                            <td>${(r.horaInicio || '').slice(0, 5)} - ${(r.horaFin || '').slice(0, 5)}</td>
                            <td>$${(r.total || 0).toLocaleString('es-CL')}</td>
                            <td>
                                <span class="badge badge-${r.estado}">${r.estado}</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <script>
                // Activar el cuadro de diálogo de impresión/PDF automáticamente
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(htmlContent);

    } catch (error) {
        console.error('Error al exportar reporte PDF:', error);
        res.status(500).json({ error: 'Hubo un problema al generar el reporte en PDF' });
    }
};

module.exports = {
    obtenerReportePorFecha,
    obtenerReportePorRango,
    obtenerDisponibilidadGeneral,
    exportarReporteCSV,
    exportarReportePDF
};
