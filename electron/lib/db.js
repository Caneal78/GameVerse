// electron/lib/db.js

/**
 * SQLite database wrapper for GameVerse using better-sqlite3.
 * Provides initialization, schema setup, and a simple migration helper.
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { SCHEMA_SQL, DEFAULT_TEMPLATES } = require('./schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Initialise (or retrieve) the SQLite database for a given project folder.
 * This creates the physical *.db file if it does not exist and runs the
 * full schema (which uses IF NOT EXISTS, so it is safe to run on each launch).
 *
 * @param {string} projectPath Absolute path to the GameVerse vault.
 * @returns {object} The better‑sqlite3 Database instance.
 */
function init(projectPath) {
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project path does not exist: ${projectPath}`);
  }
  const dbPath = path.join(projectPath, 'GameVerse.db');
  const db = new Database(dbPath);
  // Enable foreign keys and WAL mode for concurrency and integrity.
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  // Run the full schema – it is idempotent.
  db.exec(SCHEMA_SQL);
  return db;
}

/**
 * Perform a one‑time migration from an existing lowdb JSON file to the
 * newly‑created SQLite database. The function reads the JSON file generated
 * by the old lowdb implementation (GameVerse.db.json) and inserts the data
 * into the corresponding SQLite tables.
 *
 * The migration is best‑effort – if any insert fails the transaction is
 * rolled back and the JSON file is left untouched.
 *
 * @param {string} projectPath Absolute path to the vault.
 * @param {string} jsonPath   Absolute path to the lowdb JSON file.
 */
function migrateFromJSON(projectPath, jsonPath) {
  if (!fs.existsSync(jsonPath)) return; // nothing to migrate
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  let data;
  try { data = JSON.parse(raw); } catch (_) { return; }
  const db = init(projectPath);
  const tx = db.transaction(() => {
    // meta – store relevant keys as key/value rows
    if (data.meta) {
      for (const [k, v] of Object.entries(data.meta)) {
        db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)')
          .run(k, String(v));
      }
    }
    // templates
    if (Array.isArray(data.templates)) {
      const stmt = db.prepare('INSERT OR REPLACE INTO templates (id, category, fields_json) VALUES (?, ?, ?)');
      for (const t of data.templates) {
        stmt.run(t.id || uuidv4(), t.category, t.fields_json);
      }
    }
    // items and related tables – follow the same shape as lowdb stores
    if (Array.isArray(data.items)) {
      const insertItem = db.prepare(`INSERT OR REPLACE INTO items (id, name, category, status, summary, created_at, updated_at, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      const insertField = db.prepare('INSERT OR REPLACE INTO item_fields (id, item_id, field_key, field_value, field_order) VALUES (?, ?, ?, ?, ?)');
      for (const it of data.items) {
        insertItem.run(it.id, it.name, it.category, it.status, it.summary, it.created_at, it.updated_at, it.sort_order || 0);
      }
      if (Array.isArray(data.item_fields)) {
        for (const f of data.item_fields) {
          insertField.run(f.id, f.item_id, f.field_key, f.field_value, f.field_order);
        }
      }
    }
    // tags & item_tags
    if (Array.isArray(data.tags)) {
      const stmtTag = db.prepare('INSERT OR REPLACE INTO tags (id, name) VALUES (?, ?)');
      for (const tg of data.tags) {
        stmtTag.run(tg.id, tg.name);
      }
    }
    if (Array.isArray(data.item_tags)) {
      const stmtIt = db.prepare('INSERT OR REPLACE INTO item_tags (item_id, tag_id) VALUES (?, ?)');
      for (const it of data.item_tags) {
        stmtIt.run(it.item_id, it.tag_id);
      }
    }
    // notes, files, thumbnails, links, collections, collection_items, world_bible_pages, backups – simple inserts
    const simpleTables = ['notes', 'files', 'thumbnails', 'links', 'collections', 'collection_items', 'world_bible_pages', 'backups'];
    for (const tbl of simpleTables) {
      if (Array.isArray(data[tbl]) && data[tbl].length) {
        const cols = Object.keys(data[tbl][0]);
        const placeholders = cols.map(() => '?').join(', ');
        const stmt = db.prepare(`INSERT OR REPLACE INTO ${tbl} (${cols.join(', ')}) VALUES (${placeholders})`);
        for (const row of data[tbl]) {
          stmt.run(...cols.map(c => row[c]));
        }
      }
    }
  });
  tx();
}

module.exports = { init, migrateFromJSON };
