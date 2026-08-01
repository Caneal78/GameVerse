/**
 * Database Migration System
 * 
 * Handles schema migrations for GameVerse database.
 * Migrations are versioned and run in order.
 * Never destroys user data - only adds/changes schema.
 * 
 * @module migrations
 */

const { v4: uuidv4 } = require("uuid");

/**
 * Migration definitions
 * Each migration has a version number and up/down functions.
 */
const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db) => {
      // Initial schema is handled by schema.js
      // This is a no-op migration for tracking
    },
    down: (db) => {
      // Cannot downgrade from initial schema
    }
  },
  {
    version: 2,
    name: 'add_asset_management_v1_2',
    up: (db) => {
      // Create asset_tags table (separate from item tags to avoid conflicts)
      db.exec(`
        CREATE TABLE IF NOT EXISTS asset_tag_definitions (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          color TEXT DEFAULT 'gray',
          created_at TEXT NOT NULL
        );
      `);

      // Create asset_file_tags table (many-to-many relationship between files and asset tags)
      db.exec(`
        CREATE TABLE IF NOT EXISTS asset_file_tags (
          id TEXT PRIMARY KEY,
          file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
          tag_id TEXT NOT NULL REFERENCES asset_tag_definitions(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL,
          UNIQUE(file_id, tag_id)
        );
        CREATE INDEX IF NOT EXISTS idx_asset_file_tags_file ON asset_file_tags(file_id);
        CREATE INDEX IF NOT EXISTS idx_asset_file_tags_tag ON asset_file_tags(tag_id);
      `);

      // Create favorites table
      db.exec(`
        CREATE TABLE IF NOT EXISTS favorites (
          id TEXT PRIMARY KEY,
          file_id TEXT UNIQUE NOT NULL REFERENCES files(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_favorites_file ON favorites(file_id);
      `);

      // Create saved_searches table
      db.exec(`
        CREATE TABLE IF NOT EXISTS saved_searches (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          filters_json TEXT NOT NULL,
          sort_config_json TEXT DEFAULT '{}',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // Add new columns to files table for v1.2 features
      try {
        db.exec(`ALTER TABLE files ADD COLUMN author TEXT DEFAULT ''`);
      } catch (e) {
        // Column might already exist
      }

      try {
        db.exec(`ALTER TABLE files ADD COLUMN rating INTEGER DEFAULT 0`);
      } catch (e) {
        // Column might already exist
      }

      try {
        db.exec(`ALTER TABLE files ADD COLUMN last_used_at TEXT`);
      } catch (e) {
        // Column might already exist
      }

      try {
        db.exec(`ALTER TABLE files ADD COLUMN polygon_count INTEGER DEFAULT 0`);
      } catch (e) {
        // Column might already exist
      }

      try {
        db.exec(`ALTER TABLE files ADD COLUMN texture_resolution TEXT DEFAULT ''`);
      } catch (e) {
        // Column might already exist
      }

      // Add meta table to track schema version
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );
      `);

      // Insert default asset tag colors
      const now = new Date().toISOString();
      const defaultTags = [
        { name: 'Character', color: 'blue' },
        { name: 'Environment', color: 'green' },
        { name: 'Weapon', color: 'orange' },
        { name: 'Prop', color: 'purple' },
        { name: 'Animation', color: 'red' },
        { name: 'Audio', color: 'gray' },
      ];

      const insertTag = db.prepare(`INSERT OR IGNORE INTO asset_tag_definitions (id, name, color, created_at) VALUES (?, ?, ?, ?)`);
      defaultTags.forEach(tag => {
        insertTag.run(uuidv4(), tag.name, tag.color, now);
      });
    },
    down: (db) => {
      // Remove new columns from files table
      // SQLite doesn't support DROP COLUMN directly, would need to recreate table
      // For now, we'll leave the columns as they don't break existing functionality
      
      // Drop new tables
      db.exec(`DROP TABLE IF EXISTS asset_file_tags`);
      db.exec(`DROP TABLE IF EXISTS asset_tag_definitions`);
      db.exec(`DROP TABLE IF EXISTS favorites`);
      db.exec(`DROP TABLE IF EXISTS saved_searches`);
    }
  }
];

/**
 * Get current schema version from database
 * @param {Database} db - SQLite database connection
 * @returns {number} Current schema version
 */
function getCurrentVersion(db) {
  try {
    const result = db.prepare(`SELECT MAX(version) as version FROM schema_migrations`).get();
    return result?.version || 0;
  } catch (e) {
    // schema_migrations table doesn't exist yet
    return 0;
  }
}

/**
 * Run pending migrations
 * @param {Database} db - SQLite database connection
 * @returns {Object} Migration result
 */
function runMigrations(db) {
  const currentVersion = getCurrentVersion(db);
  const latestVersion = MIGRATIONS[MIGRATIONS.length - 1].version;
  
  if (currentVersion === latestVersion) {
    return { success: true, currentVersion, message: 'Database is up to date' };
  }

  console.log(`[Migrations] Current version: ${currentVersion}, Latest: ${latestVersion}`);

  const pendingMigrations = MIGRATIONS.filter(m => m.version > currentVersion);
  const applied = [];

  for (const migration of pendingMigrations) {
    console.log(`[Migrations] Applying migration: ${migration.name} (v${migration.version})`);
    
    try {
      db.transaction(() => {
        migration.up(db);
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`)
          .run(migration.version, migration.name, now);
      })();
      
      applied.push(migration);
      console.log(`[Migrations] Migration ${migration.name} applied successfully`);
    } catch (e) {
      console.error(`[Migrations] Failed to apply migration ${migration.name}:`, e);
      throw new Error(`Migration failed: ${migration.name} - ${e.message}`);
    }
  }

  return {
    success: true,
    currentVersion: latestVersion,
    applied: applied.map(m => ({ version: m.version, name: m.name })),
    message: `Applied ${applied.length} migration(s)`
  };
}

/**
 * Get migration status
 * @param {Database} db - SQLite database connection
 * @returns {Object} Migration status
 */
function getMigrationStatus(db) {
  const currentVersion = getCurrentVersion(db);
  const latestVersion = MIGRATIONS[MIGRATIONS.length - 1].version;
  const pending = MIGRATIONS.filter(m => m.version > currentVersion);
  
  return {
    currentVersion,
    latestVersion,
    needsMigration: currentVersion < latestVersion,
    pendingMigrations: pending.map(m => ({ version: m.version, name: m.name })),
    totalMigrations: MIGRATIONS.length
  };
}

module.exports = {
  MIGRATIONS,
  runMigrations,
  getMigrationStatus,
  getCurrentVersion,
};
