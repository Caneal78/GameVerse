/**
 * Vault Management Module
 *
 * Handles creation and opening of GameVerse project vaults.
 * A vault is a self-contained folder with a database and asset subfolders.
 *
 * @module vault
 */

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { DEFAULT_TEMPLATES } = require("./schema");
const { init: initSQLite, migrateFromJSON } = require("./db");
const { runMigrations } = require("./migrations");

/**
 * Standard folder structure for a GameVerse project vault
 * These folders are created automatically when a new project is created.
 *
 * @constant {string[]}
 */
const VAULT_FOLDERS = [
  "Assets/Characters",
  "Assets/Creatures",
  "Assets/Vehicles",
  "Assets/Environments",
  "Assets/Props",
  "Assets/Weapons",
  "Assets/Materials",
  "Assets/Audio",
  "Assets/Animations",
  "Assets/Scripts",
  "Items",
  "Thumbnails",
  "Exports",
  "Backups",
  "WorldBible/Characters",
  "WorldBible/Creatures",
  "WorldBible/Locations",
  "WorldBible/Factions",
  "WorldBible/History",
  "WorldBible/Lore",
];

/**
 * Sanitize a project/folder name into a safe filesystem folder name
 * Removes invalid characters and replaces spaces with underscores.
 *
 * @param {string} name - The raw project name from user input
 * @returns {string} A sanitized name safe for filesystem use
 */
function sanitizeFolderName(name) {
  return name
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "_")
    .replace(/\s+/g, "_");
}

/**
 * Create a brand-new GameVerse project vault
 * Creates the folder structure, initializes the database with schema,
 * and inserts default templates.
 *
 * @param {string} parentDir - The parent directory where the project will be created
 * @param {string} projectName - The name of the project (will be sanitized)
 * @returns {{projectPath: string, dbPath: string, projectName: string}} Project metadata
 * @throws {Error} If a folder with the same name already exists
 */
function createProject(parentDir, projectName) {
  const folderName = sanitizeFolderName(projectName);
  const projectPath = path.join(parentDir, folderName);

  if (fs.existsSync(projectPath)) {
    throw new Error(
      `A folder named "${folderName}" already exists at this location.`,
    );
  }

  fs.mkdirSync(projectPath, { recursive: true });
  for (const folder of VAULT_FOLDERS) {
    fs.mkdirSync(path.join(projectPath, folder), { recursive: true });
  }

  // Initialize SQLite database
  const db = initSQLite(projectPath);
  const dbPath = path.join(projectPath, "GameVerse.db");

  const now = new Date().toISOString();
  // Initialize meta data
  const insertMeta = db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
  insertMeta.run('project_name', projectName);
  insertMeta.run('created_at', now);
  insertMeta.run('gameverse_version', '1.0.0');

  // Initialize templates
  const insertTemplate = db.prepare('INSERT OR REPLACE INTO templates (id, category, fields_json) VALUES (?, ?, ?)');
  for (const tpl of DEFAULT_TEMPLATES) {
    insertTemplate.run(uuidv4(), tpl.category, JSON.stringify(tpl.fields));
  }

  // Close the database connection after initialization
  db.close();

  return { projectPath, dbPath, projectName };
}

/**
 * Open an existing project vault
 * Accepts either the project folder path or a direct path to GameVerse.db.
 * Ensures all required subfolders exist (self-healing for older vaults).
 *
 * @param {string} targetPath - Path to project folder or GameVerse.db file
 * @returns {{projectPath: string, dbPath: string, projectName: string, db: Database}} Project metadata and database connection
 * @throws {Error} If GameVerse.db is not found at the target location
 */
function openProject(targetPath) {
  let projectPath = targetPath;

  // Determine project folder
  if (!fs.statSync(targetPath).isDirectory()) {
    projectPath = path.dirname(targetPath);
  }

  // Path to SQLite database
  const dbPath = path.join(projectPath, "GameVerse.db");
  const jsonPath = path.join(projectPath, "GameVerse.db.json");

  // If SQLite DB doesn't exist but JSON does, migrate it
  if (!fs.existsSync(dbPath) && fs.existsSync(jsonPath)) {
    // Initialize SQLite DB first
    const tempDb = initSQLite(projectPath);
    // Run migration from JSON
    migrateFromJSON(projectPath, jsonPath);
    tempDb.close();
  }

  // Ensure DB exists
  if (!fs.existsSync(dbPath)) {
    throw new Error(`GameVerse.db not found at ${dbPath}`);
  }

  // Ensure all expected subfolders exist (self-heal older/partial vaults)
  for (const folder of VAULT_FOLDERS) {
    const full = path.join(projectPath, folder);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  }

  // Initialize SQLite database
  const db = initSQLite(projectPath);

  // Run any pending database migrations
  try {
    const migrationResult = runMigrations(db);
    console.log('[Vault] Migration result:', migrationResult);
  } catch (e) {
    console.error('[Vault] Migration failed:', e);
    // Don't fail project opening if migrations fail, but log the error
  }

  // Get project name from meta table
  let projectName = path.basename(projectPath);
  try {
    const meta = db.prepare('SELECT value FROM meta WHERE key = ?').get('project_name');
    if (meta && meta.value) {
      projectName = meta.value;
    }
  } catch (e) {
    // meta table may not exist in a very old vault; ignore
  }

  return { projectPath, dbPath, projectName, db };
}

/**
 * Export vault management functions
 *
 * @exports {function} createProject - Create a new GameVerse project vault
 * @exports {function} openProject - Open an existing project vault
 * @exports {function} sanitizeFolderName - Sanitize a name for filesystem use
 * @exports {string[]} VAULT_FOLDERS - Standard folder structure for vaults
 */
module.exports = {
  createProject,
  openProject,
  sanitizeFolderName,
  VAULT_FOLDERS,
};
