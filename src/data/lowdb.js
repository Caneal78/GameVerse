// src/data/lowdb.js
// Simple file‑based JSON database used as a lightweight replacement for native SQLite.
// Provides a minimal `prepare` API that mimics the subset of SQL used in the codebase.

const path = require('path');
const fs = require('fs');

/**
 * Load or initialise the JSON database for a given project folder.
 * The file is stored as `GameVerse.db.json` inside the project directory.
 *
 * @param {string} projectPath Absolute path to the project vault folder.
 * @returns {object} Database object with `data`, `write`, and `prepare` methods.
 */
function getDB(projectPath) {
  const dbFile = path.join(projectPath, 'GameVerse.db.json');
  // Ensure the folder exists.
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }
  // Load existing file or start with a fresh schema.
  let data;
  if (fs.existsSync(dbFile)) {
    try {
      data = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
    } catch (_) {
      data = null;
    }
  }
  if (!data) {
    data = {
      meta: {},
      templates: [],
      items: [],
      files: [],
      notes: [],
      tags: [],
      item_tags: [],
      thumbnails: [],
      relationships: [] // <-- added for asset relationship tracking
    };
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
  }
  const db = {
    data,
    write: () => fs.writeFileSync(dbFile, JSON.stringify(data, null, 2)),
    prepare: (sql) => createPreparedStatement(db, sql)
  };
  return db;
}

/**
 * Very small SQL‑like parser that works with the custom JSON store.
 * Supports SELECT, INSERT, UPDATE and DELETE for the tables used in the app.
 */
function createPreparedStatement(db, sql) {
  const trimmed = sql.trim().toUpperCase();
  // SELECT * FROM <table> WHERE ID = ?
  let match = trimmed.match(/^SELECT \* FROM (\w+) WHERE ID = \?$/i);
  if (match) {
    const table = match[1].toLowerCase();
    return {
      get: (id) => db.data[table].find((r) => r.id === id),
      all: () => db.data[table]
    };
  }
  // SELECT * FROM <table>
  match = trimmed.match(/^SELECT \* FROM (\w+)$/i);
  if (match) {
    const table = match[1].toLowerCase();
    return { all: () => db.data[table] };
  }
  // INSERT INTO <table> (fields…) VALUES (?, ?, …)
  match = trimmed.match(/^INSERT INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\)$/i);
  if (match) {
    const table = match[1].toLowerCase();
    const fields = match[2].split(',').map((s) => s.trim().toLowerCase());
    return {
      run: (...params) => {
        const obj = {};
        fields.forEach((f, i) => {
          obj[f] = params[i];
        });
        db.data[table].push(obj);
        db.write();
        return { changes: 1 };
      }
    };
  }
  // UPDATE <table> SET ... WHERE ID = ?
  match = trimmed.match(/^UPDATE (\w+) SET (.+) WHERE ID = \?$/i);
  if (match) {
    const table = match[1].toLowerCase();
    const setClause = match[2];
    const assignments = setClause.split(',').map((s) => s.trim());
    return {
      run: (...params) => {
        const id = params[params.length - 1];
        const row = db.data[table].find((r) => r.id === id);
        if (!row) return { changes: 0 };
        assignments.forEach((assign, idx) => {
          const [col] = assign.split('=');
          const field = col.trim().toLowerCase();
          row[field] = params[idx];
        });
        db.write();
        return { changes: 1 };
      }
    };
  }
  // DELETE FROM <table> WHERE ID = ?
  match = trimmed.match(/^DELETE FROM (\w+) WHERE ID = \?$/i);
  if (match) {
    const table = match[1].toLowerCase();
    return {
      run: (id) => {
        const before = db.data[table].length;
        db.data[table] = db.data[table].filter((r) => r.id !== id);
        db.write();
        return { changes: before - db.data[table].length };
      }
    };
  }
  // Fallback – no‑op placeholder
  return { get: () => undefined, run: () => undefined, all: () => [] };
}

module.exports = { getDB };
