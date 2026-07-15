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
const { getDB } = require("../../src/data/lowdb");
const { v4: uuidv4 } = require("uuid");
const { DEFAULT_TEMPLATES } = require("./schema");

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

  const dbPath = path.join(projectPath, "GameVerse.db.json");
  const db = getDB(projectPath);

  const now = new Date().toISOString();
  // Initialize meta data
  db.data.meta = {
    project_name: projectName,
    created_at: now,
    gameverse_version: "1.0.0",
  };

  // Initialize templates
  db.data.templates = [];
  for (const tpl of DEFAULT_TEMPLATES) {
    db.data.templates.push({
      id: uuidv4(),
      category: tpl.category,
      fields_json: JSON.stringify(tpl.fields),
    });
  }
  db.write();
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

  // Path to lowdb JSON file (for compatibility with existing code)
  const dbPath = path.join(projectPath, "GameVerse.db.json");

  // Ensure DB exists (or will be created on first access)
  if (!fs.existsSync(dbPath)) {
    // If missing, create an empty DB file via getDB which will initialise defaults
    getDB(projectPath);
  }
  // Ensure all expected subfolders exist (self-heal older/partial vaults)
  for (const folder of VAULT_FOLDERS) {
    const full = path.join(projectPath, folder);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  }

  const db = getDB(projectPath);
  // lowdb does not need pragma

  let projectName = path.basename(projectPath);
  try {
    if (db.data && db.data.meta && db.data.meta.project_name) {
      projectName = db.data.meta.project_name;
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
