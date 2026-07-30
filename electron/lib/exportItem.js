/**
 * Export Module
 * 
 * Exports items and their associated files into a clean, portable folder bundle
 * ready for handoff to Blender, Godot, Unity, Unreal, or collaborators.
 * 
 * @module exportItem
 */

const fs = require('fs');
const path = require('path');
const { sanitizeName } = require('./files');

/**
 * Export a single item into a clean, portable folder bundle
 * Creates Exports/<Item>_Export/ with subfolders for Models, Textures,
 * Animations, Audio, Scripts, Images, and Documentation.
 * 
 * @param {Database} db - SQLite database connection
 * @param {string} projectPath - Path to project root
 * @param {string} itemId - Item UUID to export
 * @returns {{exportRoot: string, fileCount: number}} Export metadata
 * @throws {Error} If item not found
 */
function exportItem(db, projectPath, itemId) {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  if (!item) throw new Error('Item not found');

  const exportName = `${sanitizeName(item.name)}_Export`;
  const exportRoot = path.join(projectPath, 'Exports', exportName);

  const subfolders = {
    Models: path.join(exportRoot, 'Models'),
    Textures: path.join(exportRoot, 'Textures'),
    Animations: path.join(exportRoot, 'Animations'),
    Audio: path.join(exportRoot, 'Audio'),
    Scripts: path.join(exportRoot, 'Scripts'),
    Images: path.join(exportRoot, 'Images'),
    Documentation: path.join(exportRoot, 'Documentation')
  };
  for (const folder of Object.values(subfolders)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  const files = db
    .prepare('SELECT * FROM files WHERE item_id = ? AND is_current = 1')
    .all(itemId);

  let copiedCount = 0;
  for (const file of files) {
    let destFolder;
    if (file.section === 'Models') destFolder = subfolders.Models;
    else if (file.section === 'Audio') destFolder = subfolders.Audio;
    else if (file.section === 'Animations') destFolder = subfolders.Animations;
    else if (file.section === 'Scripts') destFolder = subfolders.Scripts;
    else if (file.section === 'Images') destFolder = subfolders.Images;
    else destFolder = subfolders.Textures;

    // Normalize path separators for cross-platform compatibility
    const normalizedStoredPath = file.stored_path.replace(/\\/g, path.sep);
    const srcAbs = file.is_linked ? file.stored_path : path.join(projectPath, normalizedStoredPath);
    
    if (fs.existsSync(srcAbs)) {
      const destAbs = path.join(destFolder, path.basename(srcAbs));
      fs.copyFileSync(srcAbs, destAbs);
      copiedCount += 1;
    }
  }

  // Documentation: item info + all notebook entries + tags + fields
  const fields = db
    .prepare('SELECT field_key, field_value FROM item_fields WHERE item_id = ?')
    .all(itemId);
  const notes = db
    .prepare('SELECT title, note_type, body FROM notes WHERE item_id = ? ORDER BY created_at')
    .all(itemId);
  const tags = db
    .prepare(
      `SELECT t.name FROM tags t JOIN item_tags it ON it.tag_id = t.id WHERE it.item_id = ?`
    )
    .all(itemId)
    .map((r) => r.name);

  let doc = `# ${item.name}\n\n`;
  doc += `Category: ${item.category}\nStatus: ${item.status}\n`;
  doc += `Tags: ${tags.join(', ') || 'None'}\n\n`;
  if (item.summary) doc += `## Summary\n${item.summary}\n\n`;
  if (fields.length) {
    doc += `## Fields\n`;
    for (const f of fields) doc += `- **${f.field_key}**: ${f.field_value}\n`;
    doc += '\n';
  }
  if (notes.length) {
    doc += `## Notebook\n`;
    for (const n of notes) {
      doc += `### ${n.title} (${n.note_type})\n${n.body}\n\n`;
    }
  }
  fs.writeFileSync(path.join(subfolders.Documentation, `${sanitizeName(item.name)}.md`), doc, 'utf-8');

  return { exportRoot, fileCount: copiedCount };
}

/**
 * Export a single item with progress callback support
 * Same as exportItem but calls onProgress callback for each file copied.
 * 
 * @param {Database} db - SQLite database connection
 * @param {string} projectPath - Path to project root
 * @param {string} itemId - Item UUID to export
 * @param {function} onProgress - Callback function(current, total)
 * @returns {{exportRoot: string, fileCount: number}} Export metadata
 * @throws {Error} If item not found
 */
function exportItemWithProgress(db, projectPath, itemId, onProgress) {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  if (!item) throw new Error('Item not found');

  const exportName = `${sanitizeName(item.name)}_Export`;
  const exportRoot = path.join(projectPath, 'Exports', exportName);

  const subfolders = {
    Models: path.join(exportRoot, 'Models'),
    Textures: path.join(exportRoot, 'Textures'),
    Animations: path.join(exportRoot, 'Animations'),
    Audio: path.join(exportRoot, 'Audio'),
    Scripts: path.join(exportRoot, 'Scripts'),
    Images: path.join(exportRoot, 'Images'),
    Documentation: path.join(exportRoot, 'Documentation')
  };
  for (const folder of Object.values(subfolders)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  const files = db
    .prepare('SELECT * FROM files WHERE item_id = ? AND is_current = 1')
    .all(itemId);

  let copiedCount = 0;
  const totalFiles = files.length;
  
  for (const file of files) {
    let destFolder;
    if (file.section === 'Models') destFolder = subfolders.Models;
    else if (file.section === 'Audio') destFolder = subfolders.Audio;
    else if (file.section === 'Animations') destFolder = subfolders.Animations;
    else if (file.section === 'Scripts') destFolder = subfolders.Scripts;
    else if (file.section === 'Images') destFolder = subfolders.Images;
    else destFolder = subfolders.Textures;

    // Normalize path separators for cross-platform compatibility
    const normalizedStoredPath = file.stored_path.replace(/\\/g, path.sep);
    const srcAbs = file.is_linked ? file.stored_path : path.join(projectPath, normalizedStoredPath);
    
    if (fs.existsSync(srcAbs)) {
      const destAbs = path.join(destFolder, path.basename(srcAbs));
      fs.copyFileSync(srcAbs, destAbs);
      copiedCount += 1;
      
      // Call progress callback
      if (onProgress) {
        onProgress(copiedCount, totalFiles);
      }
    }
  }

  // Documentation: item info + all notebook entries + tags + fields
  const fields = db
    .prepare('SELECT field_key, field_value FROM item_fields WHERE item_id = ?')
    .all(itemId);
  const notes = db
    .prepare('SELECT title, note_type, body FROM notes WHERE item_id = ? ORDER BY created_at')
    .all(itemId);
  const tags = db
    .prepare(
      `SELECT t.name FROM tags t JOIN item_tags it ON it.tag_id = t.id WHERE it.item_id = ?`
    )
    .all(itemId)
    .map((r) => r.name);

  let doc = `# ${item.name}\n\n`;
  doc += `Category: ${item.category}\nStatus: ${item.status}\n`;
  doc += `Tags: ${tags.join(', ') || 'None'}\n\n`;
  if (item.summary) doc += `## Summary\n${item.summary}\n\n`;
  if (fields.length) {
    doc += `## Fields\n`;
    for (const f of fields) doc += `- **${f.field_key}**: ${f.field_value}\n`;
    doc += '\n';
  }
  if (notes.length) {
    doc += `## Notebook\n`;
    for (const n of notes) {
      doc += `### ${n.title} (${n.note_type})\n${n.body}\n\n`;
    }
  }
  fs.writeFileSync(path.join(subfolders.Documentation, `${sanitizeName(item.name)}.md`), doc, 'utf-8');

  return { exportRoot, fileCount: copiedCount };
}

/**
 * Export a collection as a complete asset pack
 * Creates Exports/<Collection>_AssetPack/ with all items, files, and marketplace metadata
 * 
 * @param {Database} db - SQLite database connection
 * @param {string} projectPath - Path to project root
 * @param {string} collectionId - Collection UUID to export
 * @param {function} onProgress - Callback function(current, total, message)
 * @returns {{exportRoot: string, itemCount: number, fileCount: number}} Export metadata
 * @throws {Error} If collection not found
 */
function exportCollection(db, projectPath, collectionId, onProgress) {
  const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(collectionId);
  if (!collection) throw new Error('Collection not found');

  const exportName = `${sanitizeName(collection.name)}_AssetPack`;
  const exportRoot = path.join(projectPath, 'Exports', exportName);

  // Create main folder structure
  const subfolders = {
    Models: path.join(exportRoot, 'Assets', 'Models'),
    Textures: path.join(exportRoot, 'Assets', 'Textures'),
    Animations: path.join(exportRoot, 'Assets', 'Animations'),
    Audio: path.join(exportRoot, 'Assets', 'Audio'),
    Scripts: path.join(exportRoot, 'Assets', 'Scripts'),
    Images: path.join(exportRoot, 'Assets', 'Images'),
    Documentation: path.join(exportRoot, 'Documentation')
  };
  for (const folder of Object.values(subfolders)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  // Get all items in the collection
  const collectionItems = db
    .prepare(`
      SELECT i.* FROM items i
      JOIN collection_items ci ON ci.item_id = i.id
      WHERE ci.collection_id = ?
      ORDER BY i.name
    `)
    .all(collectionId);

  if (onProgress) onProgress(0, collectionItems.length, 'Starting collection export...');

  let totalFileCount = 0;
  const manifestItems = [];

  for (let i = 0; i < collectionItems.length; i++) {
    const item = collectionItems[i];
    if (onProgress) onProgress(i, collectionItems.length, `Exporting ${item.name}...`);

    // Get item files
    const files = db
      .prepare('SELECT * FROM files WHERE item_id = ? AND is_current = 1')
      .all(item.id);

    // Copy files to appropriate folders
    const itemFiles = [];
    for (const file of files) {
      let destFolder;
      if (file.section === 'Models') destFolder = subfolders.Models;
      else if (file.section === 'Audio') destFolder = subfolders.Audio;
      else if (file.section === 'Animations') destFolder = subfolders.Animations;
      else if (file.section === 'Scripts') destFolder = subfolders.Scripts;
      else if (file.section === 'Images') destFolder = subfolders.Images;
      else destFolder = subfolders.Textures;

      const normalizedStoredPath = file.stored_path.replace(/\\/g, path.sep);
      const srcAbs = file.is_linked ? file.stored_path : path.join(projectPath, normalizedStoredPath);
      
      if (fs.existsSync(srcAbs)) {
        // Create item-specific subfolder to avoid filename conflicts
        const itemSubfolder = path.join(destFolder, sanitizeName(item.name));
        fs.mkdirSync(itemSubfolder, { recursive: true });
        
        const destAbs = path.join(itemSubfolder, path.basename(srcAbs));
        fs.copyFileSync(srcAbs, destAbs);
        totalFileCount += 1;
        
        itemFiles.push({
          filename: path.basename(srcAbs),
          relativePath: path.relative(exportRoot, destAbs),
          section: file.section,
          size: file.size_bytes,
          mimeType: file.mime_type
        });
      }
    }

    // Get item metadata
    const fields = db
      .prepare('SELECT field_key, field_value FROM item_fields WHERE item_id = ?')
      .all(item.id);
    const notes = db
      .prepare('SELECT title, note_type, body FROM notes WHERE item_id = ? ORDER BY created_at')
      .all(item.id);
    const tags = db
      .prepare(`SELECT t.name FROM tags t JOIN item_tags it ON it.tag_id = t.id WHERE it.item_id = ?`)
      .all(item.id)
      .map((r) => r.name);

    // Create item documentation
    let doc = `# ${item.name}\n\n`;
    doc += `Category: ${item.category}\nStatus: ${item.status}\n`;
    doc += `Tags: ${tags.join(', ') || 'None'}\n\n`;
    if (item.summary) doc += `## Summary\n${item.summary}\n\n`;
    if (fields.length) {
      doc += `## Fields\n`;
      for (const f of fields) doc += `- **${f.field_key}**: ${f.field_value}\n`;
      doc += '\n';
    }
    if (notes.length) {
      doc += `## Notebook\n`;
      for (const n of notes) {
        doc += `### ${n.title} (${n.note_type})\n${n.body}\n\n`;
      }
    }
    fs.writeFileSync(path.join(subfolders.Documentation, `${sanitizeName(item.name)}.md`), doc, 'utf-8');

    // Add to manifest
    manifestItems.push({
      id: item.id,
      name: item.name,
      category: item.category,
      status: item.status,
      summary: item.summary,
      tags: tags,
      fields: fields.reduce((acc, f) => ({ ...acc, [f.field_key]: f.field_value }), {}),
      files: itemFiles,
      noteCount: notes.length
    });
  }

  // Create marketplace manifest
  const manifest = {
    packName: collection.name,
    packDescription: collection.description || '',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    itemCount: collectionItems.length,
    totalFileCount: totalFileCount,
    categories: [...new Set(collectionItems.map(i => i.category))],
    items: manifestItems
  };

  fs.writeFileSync(
    path.join(exportRoot, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  // Create README for the asset pack
  let readme = `# ${collection.name} - Asset Pack\n\n`;
  readme += `${collection.description || 'No description provided.'}\n\n`;
  readme += `## Contents\n\n`;
  readme += `- **Items**: ${collectionItems.length}\n`;
  readme += `- **Files**: ${totalFileCount}\n`;
  readme += `- **Categories**: ${manifest.categories.join(', ')}\n\n`;
  readme += `## Categories\n\n`;
  for (const category of manifest.categories) {
    const itemsInCategory = manifestItems.filter(i => i.category === category);
    readme += `### ${category}\n`;
    for (const item of itemsInCategory) {
      readme += `- ${item.name} (${item.files.length} files)\n`;
    }
    readme += '\n';
  }
  readme += `## Usage\n\n`;
  readme += `This asset pack includes all files and documentation needed for each item.\n`;
  readme += `See the Documentation folder for detailed information about each item.\n`;
  readme += `See manifest.json for structured metadata suitable for marketplace integration.\n`;
  
  fs.writeFileSync(path.join(exportRoot, 'README.md'), readme, 'utf-8');

  if (onProgress) onProgress(collectionItems.length, collectionItems.length, 'Export complete!');

  return { exportRoot, itemCount: collectionItems.length, fileCount: totalFileCount };
}

/**
 * Export export function
 * 
 * @exports {function} exportItem - Export an item to a portable bundle
 * @exports {function} exportItemWithProgress - Export with progress callback
 * @exports {function} exportCollection - Export a collection as an asset pack
 */
module.exports = { exportItem, exportItemWithProgress, exportCollection };
