/**
 * File Management Module
 *
 * Handles file import, version management, and storage within the project vault.
 * Supports three import modes: copy (default), move, and link (no copy).
 *
 * @module files
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

/**
 * Mapping of file sections to asset subfolder names
 * Determines where files are stored within the Assets folder structure.
 *
 * @constant {Object.<string, string>}
 */
const SECTION_TO_ASSET_SUBFOLDER = {
  Images: "Images",
  Audio: "Audio",
  Models: "Models",
  Animations: "Animations",
  Scripts: "Scripts",
};

/**
 * Mapping of item categories to asset folder names
 * Determines which Assets subfolder an item's files go into.
 *
 * @constant {Object.<string, string>}
 */
const CATEGORY_TO_ASSET_FOLDER = {
  Character: "Characters",
  Creature: "Creatures",
  Vehicle: "Vehicles",
  Location: "Environments",
  Building: "Environments",
  Prop: "Props",
  Weapon: "Weapons",
  Material: "Materials",
  Faction: "Characters",
  Quest: "Items",
  Item: "Items",
  Animation: "Animations",
  Script: "Scripts",
};

/**
 * Sanitize a filename by removing invalid filesystem characters
 *
 * @param {string} name - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeName(name) {
  return name.replace(/[<>:"/\\|?*]+/g, "_");
}

/**
 * Get the asset directory path for a specific item
 * Creates a folder named: SanitizedName_ItemID
 *
 * @param {string} projectPath - Path to project root
 * @param {Object} item - Item object with category and id
 * @returns {string} Full path to item's asset directory
 */
function getItemAssetDir(projectPath, item) {
  const categoryFolder = CATEGORY_TO_ASSET_FOLDER[item.category] || "Props";
  const itemFolder = sanitizeName(item.name) + "_" + item.id.slice(0, 8);
  return path.join(projectPath, "Assets", categoryFolder, itemFolder);
}

/**
 * Ensure a directory exists, creating it if necessary
 *
 * @param {string} p - Directory path
 */
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

/**
 * Generate an MD5 hash of a file (first 10 characters)
 * Used for file identification and deduplication.
 *
 * @param {string} filePath - Path to file
 * @returns {string} MD5 hash (first 10 chars)
 */
function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("md5").update(buf).digest("hex").slice(0, 10);
}

/**
 * Import a file into the project vault
 * Copies (or moves/links) the file into the correct Assets subfolder,
 * records metadata in the database, and handles versioning.
 *
 * @param {Database} db - SQLite database connection
 * @param {string} projectPath - Path to project root
 * @param {Object} item - Item object with category and id
 * @param {string} section - File section (Images, Audio, Models, etc.)
 * @param {string} sourcePath - Path to source file
 * @param {string} [mode='copy'] - Import mode: 'copy', 'move', or 'link'
 * @returns {Object} File record with metadata
 * @throws {Error} If source file not found
 */
function importFile(db, projectPath, item, section, sourcePath, mode = "copy") {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  const originalName = path.basename(sourcePath);
  const slotKey = originalName.toLowerCase();
  const ext = path.extname(originalName);
  const stat = fs.statSync(sourcePath);

  // Determine next version number for this slot
  const existing = db
    .prepare(
      "SELECT MAX(version) as maxv FROM files WHERE item_id = ? AND section = ? AND slot_key = ?",
    )
    .get(item.id, section, slotKey);
  const nextVersion = (existing && existing.maxv ? existing.maxv : 0) + 1;

  let storedPath; // relative to projectPath
  let isLinked = 0;

  if (mode === "link") {
    // Store the absolute external path directly - no copying
    storedPath = sourcePath;
    isLinked = 1;
  } else {
    const sectionFolder = SECTION_TO_ASSET_SUBFOLDER[section] || section;
    const itemDir = getItemAssetDir(projectPath, item);
    const destDir = path.join(itemDir, sectionFolder);
    ensureDir(destDir);

    const versionedName =
      nextVersion > 1
        ? `${path.basename(originalName, ext)}_v${nextVersion}${ext}`
        : originalName;
    const destPath = path.join(destDir, versionedName);

    fs.copyFileSync(sourcePath, destPath);
    if (mode === "move") {
      try {
        fs.unlinkSync(sourcePath);
      } catch (e) {
        // non-fatal if source cannot be removed (e.g. permissions)
      }
    }

    storedPath = path.relative(projectPath, destPath);
  }

  // Mark previous versions of this slot as not-current
  db.prepare(
    "UPDATE files SET is_current = 0 WHERE item_id = ? AND section = ? AND slot_key = ?",
  ).run(item.id, section, slotKey);

  const id = uuidv4();
  const now = new Date().toISOString();
  const metadata = extractBasicMetadata(section, ext);

  db.prepare(
    `INSERT INTO files
      (id, item_id, section, original_name, stored_path, mime_type, size_bytes, is_linked, version, is_current, slot_key, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
  ).run(
    id,
    item.id,
    section,
    originalName,
    storedPath,
    mimeFromExt(ext),
    stat.size,
    isLinked,
    nextVersion,
    slotKey,
    JSON.stringify(metadata),
    now,
  );

  return {
    id,
    item_id: item.id,
    section,
    original_name: originalName,
    stored_path: storedPath,
    mime_type: mimeFromExt(ext),
    size_bytes: stat.size,
    is_linked: isLinked,
    version: nextVersion,
    is_current: 1,
    slot_key: slotKey,
    metadata,
    created_at: now,
  };
}

/**
 * Extract basic metadata based on file section and extension
 * Returns a metadata object with section-specific fields.
 *
 * @param {string} section - File section
 * @param {string} ext - File extension (with dot)
 * @returns {Object} Metadata object
 */
function extractBasicMetadata(section, ext) {
  const e = ext.toLowerCase();
  if (section === "Models") {
    return {
      format: e.replace(".", "").toUpperCase(),
      polyCount: null,
      materials: [],
      textures: [],
      rig: null,
    };
  }
  if (section === "Audio") {
    return { format: e.replace(".", "").toUpperCase(), duration: null };
  }
  if (section === "Animations") {
    return { format: e.replace(".", "").toUpperCase(), frameCount: null };
  }
  return {};
}

/**
 * Get MIME type for a file extension
 *
 * @param {string} ext - File extension (with dot)
 * @returns {string} MIME type
 */
function mimeFromExt(ext) {
  const map = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".glb": "model/gltf-binary",
    ".gltf": "model/gltf+json",
    ".fbx": "application/octet-stream",
    ".obj": "text/plain",
    ".stl": "application/octet-stream",
    ".blend": "application/octet-stream",
    ".gd": "text/plain",
    ".cs": "text/plain",
    ".py": "text/plain",
    ".json": "application/json",
    ".txt": "text/plain",
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}

/**
 * Restore an older file version by marking it as current
 * Does not delete newer versions - they remain available.
 *
 * @param {Database} db - SQLite database connection
 * @param {string} fileId - File UUID to restore
 * @returns {Object} The restored file record
 * @throws {Error} If file not found
 */
function restoreVersion(db, fileId) {
  const file = db.prepare("SELECT * FROM files WHERE id = ?").get(fileId);
  if (!file) throw new Error("File version not found");
  db.prepare(
    "UPDATE files SET is_current = 0 WHERE item_id = ? AND section = ? AND slot_key = ?",
  ).run(file.item_id, file.section, file.slot_key);
  db.prepare("UPDATE files SET is_current = 1 WHERE id = ?").run(fileId);
  return file;
}

/**
 * Delete a file record and optionally the physical file
 *
 * @param {Database} db - SQLite database connection
 * @param {string} projectPath - Path to project root
 * @param {string} fileId - File UUID
 * @param {boolean} [deleteFromDisk=true] - Whether to delete physical file
 */
function deleteFileRecord(db, projectPath, fileId, deleteFromDisk = true) {
  const file = db.prepare("SELECT * FROM files WHERE id = ?").get(fileId);
  if (!file) return;
  if (deleteFromDisk && !file.is_linked) {
    const abs = resolveStoredPath(projectPath, file.stored_path);
    try {
      if (abs && fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch (e) {
      /* ignore */
    }
  }
  db.prepare("DELETE FROM files WHERE id = ?").run(fileId);
}

/**
 * Resolve a stored path to an absolute filesystem path.
 * If the path is already absolute (linked files), it is returned directly.
 * Otherwise, it is resolved relative to the project root.
 *
 * @param {string} projectPath - Path to the project root
 * @param {string} storedPath - Stored path from the database
 * @returns {string|null} Absolute filesystem path or null
 */
function resolveStoredPath(projectPath, storedPath) {
  if (!storedPath) return null;
  if (path.isAbsolute(storedPath)) return path.normalize(storedPath);
  const projectRoot = path.resolve(projectPath);
  const resolved = path.normalize(path.resolve(projectRoot, storedPath));
  const projectPrefix = projectRoot.endsWith(path.sep)
    ? projectRoot
    : `${projectRoot}${path.sep}`;
  if (resolved === projectRoot || resolved.startsWith(projectPrefix)) {
    return resolved;
  }
  return null;
}

/**
 * Export file management functions
 *
 * @exports {function} importFile - Import a file into the vault
 * @exports {function} restoreVersion - Restore a previous file version
 * @exports {function} deleteFileRecord - Delete a file record
 * @exports {function} getItemAssetDir - Get asset directory for an item
 * @exports {function} sanitizeName - Sanitize a filename
 * @exports {function} hashFile - Generate file hash
 * @exports {function} resolveStoredPath - Resolve relative stored paths
 */
module.exports = {
  importFile,
  restoreVersion,
  deleteFileRecord,
  getItemAssetDir,
  sanitizeName,
  hashFile,
  resolveStoredPath,
};
