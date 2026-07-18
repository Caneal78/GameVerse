// GameVerse SQLite Database Service
// Provides initialization, connection handling, migrations, transactions, queries, and error handling

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'GameVerse.db');
const migrationsDir = path.join(__dirname, 'migrations');

// Database connection
let db;
let currentSchemaVersion = 1;

// Initialize database
async function initDatabase() {
  try {
    // Check if database file exists
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, '');
    }

    // Connect to database
    db = new sqlite3.Database(dbPath);

    // Create schema_version table
    await db.run(
      "CREATE TABLE IF NOT EXISTS schema_version (
        id INTEGER PRIMARY KEY,
        version INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )"
    );

    // Get current version
    const versionRow = await db.get("SELECT * FROM schema_version ORDER BY id DESC LIMIT 1");
    currentSchemaVersion = versionRow ? versionRow.version : 1;

    // Run migrations
    await runMigrations();

    return true;
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    throw error;
  }
}

// Run migrations
async function runMigrations() {
  try {
    const migrationFiles = fs.readdirSync(migrationsDir).filter(file => 
      file.endsWith('.sql') && !file.includes('schema.sql')
    );

    // Sort migrations by version number
    const sortedMigrations = migrationFiles.sort((a, b) => {
      return parseInt(a.replace(/[^0-9]/g, '')) - parseInt(b.replace(/[^0-9]/g, ''));
    });

    for (const file of sortedMigrations) {
      const version = parseInt(file.replace(/[^0-9]/g, ''));
      if (version > currentSchemaVersion) {
        console.log(`Running migration ${version}`);
        await db.run(fs.readFileSync(path.join(migrationsDir, file), 'utf-8'));
        await db.run(
          "INSERT INTO schema_version (version) VALUES (?)",
          [version]
        );
        currentSchemaVersion = version;
      }
    }
  } catch (error) {
    console.error("Migration failed:", error.message);
    throw error;
  }
}

// Close database connection
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

// Get database connection
function getDb() {
  return db;
}

// Get current schema version
function getCurrentSchemaVersion() {
  return currentSchemaVersion;
}

// Export API
module.exports = {
  initDatabase,
  runMigrations,
  closeDatabase,
  getDb,
  getCurrentSchemaVersion
};