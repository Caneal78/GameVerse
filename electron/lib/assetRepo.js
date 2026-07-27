// electron/lib/assetRepo.js

/**
 * Asset Repository Module
 * Handles importing assets (images, 3D models) into the project and storing metadata.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
// Use poppygl for GLB thumbnail generation if available.
let poppygl;
try {
  poppygl = require('poppygl');
} catch (_) {
  poppygl = null;
}

/**
 * Import an asset into the vault.
 *
 * @param {object} db - Better‑sqlite3 Database instance.
 * @param {string} projectPath - Absolute path to the project root.
 * @param {object} opts - Options.
 * @param {string} opts.name - Asset display name.
 * @param {string} opts.type - "image" or "model".
 * @param {string} opts.sourcePath - Absolute path to the source file.
 * @returns {object} Inserted asset record.
 */
function importAsset(db, projectPath, { name, type, sourcePath }) {
  // ------------------------------------------------------------
  // 1️⃣ Validation & Setup
  // ------------------------------------------------------------
  // Ensure source exists and type is supported.
  const allowedTypes = ['image', 'model', 'audio', 'video'];
  if (!allowedTypes.includes(type)) {
    return { success: false, error: { code: 'INVALID_TYPE', message: `Unsupported asset type: ${type}` } };
  }
  if (!fs.existsSync(sourcePath)) {
    return { success: false, error: { code: 'SOURCE_NOT_FOUND', message: `Source asset file does not exist: ${sourcePath}` } };
  }

  // Ensure a dedicated assets folder exists inside the project vault.
  const assetsDir = path.join(projectPath, 'resources', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // ------------------------------------------------------------
  // 2️⃣ Asset Storage (copy into vault)
  // ------------------------------------------------------------
  const ext = path.extname(sourcePath).toLowerCase();
  const assetId = uuidv4();
  const destFileName = `${assetId}${ext}`;
  const destPath = path.join(assetsDir, destFileName);
  fs.copyFileSync(sourcePath, destPath);

  // ------------------------------------------------------------
  // 3️⃣ Thumbnail Generation (model & image)
  // ------------------------------------------------------------
  let thumbnailPath = null;
  if (type === 'model' && poppygl && ext === '.glb') {
    // Model thumbnail via poppygl (if available).
    try {
      const thumbDir = path.join(assetsDir, 'thumbnails');
      if (!fs.existsSync(thumbDir)) {
        fs.mkdirSync(thumbDir, { recursive: true });
      }
      const thumbFile = path.join(thumbDir, `${assetId}.png`);
      const buffer = poppygl.renderGLTFToPNGBufferFromGLBFile(sourcePath, {
        width: 256,
        height: 256,
        background: [0, 0, 0, 0],
      });
      fs.writeFileSync(thumbFile, buffer);
      thumbnailPath = path.relative(projectPath, thumbFile).replace(/\\\\/g, '/');
    } catch (e) {
      console.warn('GLB thumbnail generation failed:', e.message);
    }
  } else if (type === 'image') {
    // Simple image thumbnail – copy the original for now (future: resize).
    try {
      const thumbDir = path.join(assetsDir, 'thumbnails');
      if (!fs.existsSync(thumbDir)) {
        fs.mkdirSync(thumbDir, { recursive: true });
      }
      const thumbFile = path.join(thumbDir, `${assetId}.png`);
      fs.copyFileSync(sourcePath, thumbFile);
      thumbnailPath = path.relative(projectPath, thumbFile).replace(/\\\\/g, '/');
    } catch (e) {
      console.warn('Image thumbnail copy failed:', e.message);
    }
  }

  // ------------------------------------------------------------
  // 4️⃣ Metadata Extraction (placeholder – extensible)
  // ------------------------------------------------------------
  // Metadata Extraction (placeholder – extensible)
  const metadata = extractMetadata(type, sourcePath);

  // ------------------------------------------------------------
  // 5️⃣ Persist Asset & Linked Item in a single transaction
  // ------------------------------------------------------------
  const relPath = path.relative(projectPath, destPath).replace(/\\\\/g, '/');
  const now = new Date().toISOString();

    const tx = db.transaction(() => {
      // → Asset table entry
      const assetStmt = db.prepare(`INSERT INTO assets (id, name, type, path, thumbnail_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`);
      assetStmt.run(assetId, name, type, relPath, thumbnailPath, now);

      // → Item entry – category specific (Image/Model)
      const itemCategory = type.charAt(0).toUpperCase() + type.slice(1);
      const itemStmt = db.prepare(`INSERT INTO items (id, name, category, summary, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)`);
      itemStmt.run(assetId, name, itemCategory, `Imported ${type}`, now, now);

      // → Store metadata
      const fieldsStmt = db.prepare(`INSERT INTO item_fields (id, item_id, field_key, field_value, field_order)
        VALUES (?, ?, ?, ?, ?)`);
      const fieldId = uuidv4();
      fieldsStmt.run(fieldId, assetId, 'metadata', JSON.stringify(metadata), 0);

      // → Add a tag based on type (e.g., "Image" or "Model")
      const tagStmt = db.prepare(`INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)`);
      const linkTagStmt = db.prepare(`INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)`);
      const tagId = uuidv4();
      const tagName = itemCategory; // same as category
      tagStmt.run(tagId, tagName);
      linkTagStmt.run(assetId, tagId);

      // → Create link between asset and item (Represents)
      const linkStmt = db.prepare(`INSERT INTO links (id, item_a, item_b, relationship, created_at) VALUES (?, ?, ?, ?, ?)`);
      const linkId = uuidv4();
      linkStmt.run(linkId, assetId, assetId, 'Represents', now);
    });
    tx();

    // Return the full Item descriptor
    return {
      id: assetId,
      name,
      type,
      path: relPath,
      thumbnail_path: thumbnailPath,
      created_at: now,
      metadata,
    };
}

/**
 * Extract metadata for supported asset types.
 * Currently returns a placeholder object; future implementation can use
 * `sharp` for images and `gltf-pipeline` for GLB models.
 *
 * @param {string} type - Asset type ('image' | 'model' | ...).
 * @param {string} sourcePath - Absolute path to the source file.
 * @returns {object} Metadata object.
 */
function extractMetadata(type, sourcePath) {
  try {
    if (type === 'model') {
      // Optional: use gltf-pipeline if installed.
      let gltfPipeline;
      try { gltfPipeline = require('gltf-pipeline'); } catch (_) { return { placeholder: 'model-metadata' }; }
      const data = fs.readFileSync(sourcePath);
      const result = gltfPipeline.processGLB(data);
      return { placeholder: 'model-metadata', byteLength: result.glb.length };
    }
    if (type === 'image') {
      let sharp;
      try { sharp = require('sharp'); } catch (_) { return { placeholder: 'image-metadata' }; }
      // For simplicity, we use sync metadata extraction via sharp.
      const meta = sharp(sourcePath).metadata();
      return { placeholder: 'image-metadata', meta };
    }
  } catch (e) {
    console.warn('Metadata extraction failed:', e.message);
    return { placeholder: `${type}-metadata` };
  }
  return {};
}


// ---------------------------------------------------------------------------
// Helper: Retrieve raw asset record (used internally by UI & other modules).
// ---------------------------------------------------------------------------
function getAsset(db, id) {
  return db.prepare('SELECT * FROM assets WHERE id = ?').get(id) || null;
}

const { deleteItem } = require('./itemRepo');

// ---------------------------------------------------------------------------
// Helper: Delete asset and clean up file system artifacts.
// ---------------------------------------------------------------------------
function deleteAsset(db, projectPath, id) {
  const asset = getAsset(db, id);
  if (!asset) return false;

  // Remove the primary file.
  const absPath = path.join(projectPath, asset.path);
  if (fs.existsSync(absPath)) fs.unlinkSync(absPath);

  // Remove generated thumbnail, if any.
  if (asset.thumbnail_path) {
    const thumbAbs = path.join(projectPath, asset.thumbnail_path);
    if (fs.existsSync(thumbAbs)) fs.unlinkSync(thumbAbs);
  }

  // Delete the DB entry for the asset and the linked Item in a transaction.
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM assets WHERE id = ?').run(id);
    // Cascade delete the linked Item (and its fields, notes, links) via foreign keys.
    deleteItem(db, id);
  });
  tx();

  return true;
}

module.exports = { importAsset, getAsset, deleteAsset };
