const fs = require('fs');
const path = require('path');
const supabase = require('./supabaseClient');

const LOCAL_DB_PATH = path.join(__dirname, 'local_db.json');

// Inicializa el archivo JSON si no existe
function initLocalDb() {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(
      LOCAL_DB_PATH,
      JSON.stringify({ pagos: [], evaluaciones: [], usuarios_metadata: [] }, null, 2),
      'utf8'
    );
  }
}

function readLocalDb() {
  initLocalDb();
  try {
    const content = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
    const data = JSON.parse(content);
    if (!data.usuarios_metadata) data.usuarios_metadata = [];
    return data;
  } catch (error) {
    console.error('Error al leer base de datos local:', error);
    return { pagos: [], evaluaciones: [], usuarios_metadata: [] };
  }
}

function writeLocalDb(data) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error al escribir base de datos local:', error);
  }
}

/**
 * Inserta un registro en una tabla. Intenta Supabase primero, si falla porque
 * la tabla no existe, lo guarda en el archivo local JSON.
 */
async function insertRow(table, rowData) {
  try {
    // Intentar insertar en Supabase
    const { data, error } = await supabase
      .from(table)
      .insert([rowData])
      .select();

    if (error) {
      // Si el error es que la tabla no existe, usamos el fallback local
      if (error.message && error.message.includes('Could not find the table')) {
        return insertLocal(table, rowData);
      }
      throw error;
    }
    return data[0];
  } catch (error) {
    if (error.message && error.message.includes('Could not find the table')) {
      return insertLocal(table, rowData);
    }
    console.error(`Error en insertRow de '${table}':`, error);
    throw error;
  }
}

/**
 * Obtiene registros de una tabla aplicando filtros sencillos de igualdad.
 */
async function selectRows(table, filters = {}) {
  try {
    let query = supabase.from(table).select('*');
    for (const key in filters) {
      query = query.eq(key, filters[key]);
    }
    const { data, error } = await query;
    if (error) {
      if (error.message && error.message.includes('Could not find the table')) {
        return selectLocal(table, filters);
      }
      throw error;
    }
    return data;
  } catch (error) {
    if (error.message && error.message.includes('Could not find the table')) {
      return selectLocal(table, filters);
    }
    console.error(`Error en selectRows de '${table}':`, error);
    throw error;
  }
}

/**
 * Actualiza registros de una tabla según un filtro.
 */
async function updateRow(table, updateData, matchColumn, matchValue) {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(updateData)
      .eq(matchColumn, matchValue)
      .select();

    if (error) {
      if (error.message && error.message.includes('Could not find the table')) {
        return updateLocal(table, updateData, matchColumn, matchValue);
      }
      throw error;
    }
    return data[0];
  } catch (error) {
    if (error.message && error.message.includes('Could not find the table')) {
      return updateLocal(table, updateData, matchColumn, matchValue);
    }
    console.error(`Error en updateRow de '${table}':`, error);
    throw error;
  }
}

// --- Métodos de persistencia local ---

function insertLocal(table, rowData) {
  console.log(`[DB Fallback] Guardando en tabla local: ${table}`);
  const db = readLocalDb();
  if (!db[table]) {
    db[table] = [];
  }
  // Generar ID numérico secuencial
  const nextId = db[table].length > 0 ? Math.max(...db[table].map((r) => r.id || 0)) + 1 : 1;
  const newRow = { id: nextId, ...rowData };
  db[table].push(newRow);
  writeLocalDb(db);
  return newRow;
}

function selectLocal(table, filters = {}) {
  console.log(`[DB Fallback] Leyendo de tabla local: ${table}`);
  const db = readLocalDb();
  const list = db[table] || [];
  return list.filter((row) => {
    for (const key in filters) {
      // Comparación flexible de string/número
      if (String(row[key]) !== String(filters[key])) {
        return false;
      }
    }
    return true;
  });
}

function updateLocal(table, updateData, matchColumn, matchValue) {
  console.log(`[DB Fallback] Actualizando en tabla local: ${table}`);
  const db = readLocalDb();
  const list = db[table] || [];
  const index = list.findIndex((row) => String(row[matchColumn]) === String(matchValue));
  if (index === -1) return null;
  list[index] = { ...list[index], ...updateData };
  db[table] = list;
  writeLocalDb(db);
  return list[index];
}

function getUsuarioMetadata(userId) {
  const db = readLocalDb();
  const list = db.usuarios_metadata || [];
  const found = list.find((m) => String(m.userId) === String(userId));
  return found || { userId, telefono: '' };
}

function saveUsuarioMetadata(userId, metadata) {
  const db = readLocalDb();
  if (!db.usuarios_metadata) db.usuarios_metadata = [];
  const index = db.usuarios_metadata.findIndex((m) => String(m.userId) === String(userId));
  if (index !== -1) {
    db.usuarios_metadata[index] = { ...db.usuarios_metadata[index], ...metadata };
  } else {
    db.usuarios_metadata.push({ userId, ...metadata });
  }
  writeLocalDb(db);
  return db.usuarios_metadata[index !== -1 ? index : db.usuarios_metadata.length - 1];
}

module.exports = {
  insertRow,
  selectRows,
  updateRow,
  getUsuarioMetadata,
  saveUsuarioMetadata,
};
