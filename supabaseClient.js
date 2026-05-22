const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Carga las variables del archivo .env

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Creamos la instancia de conexión
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;