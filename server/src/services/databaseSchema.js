const fs = require('fs/promises');
const path = require('path');

const structureMarker = '-- @schema:structure';

async function sqlBatches(filename) {
  const source = await fs.readFile(path.resolve(__dirname, '../../../database', filename), 'utf8');
  if (filename === 'seed.sql') {
    // The CLI already selects DB_NAME; never switch a pooled connection to the default DB.
    return source.replace(/^USE JobtimizeDB;\s*GO\s*/m, '')
      .split(/^\s*GO\s*$/im).map(batch => batch.trim()).filter(Boolean);
  }
  const start = source.indexOf(structureMarker);
  if (start < 0) throw new Error('Missing schema structure marker');
  return source.slice(start + structureMarker.length).split(/^\s*GO\s*$/im)
    .map(batch => batch.trim()).filter(Boolean);
}

async function applySql(query, filename) {
  const batches = await sqlBatches(filename);
  for (const [index, batch] of batches.entries()) {
    try { await query(batch); }
    catch (error) { throw new Error(`${filename} batch ${index + 1}: ${error.message}`, { cause: error }); }
  }
  return batches.length;
}

const applySchema = query => applySql(query, 'schema.sql');
const applySeed = query => applySql(query, 'seed.sql');

let initialization;
function ensureSchema() {
  if (!initialization) initialization = applySchema(text => require('../config/db').executeQuery(text))
    .catch(error => { initialization = null; throw error; });
  return initialization;
}

module.exports = { applySchema, applySeed, ensureSchema };
