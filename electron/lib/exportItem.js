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

    const srcAbs = file.is_linked ? file.stored_path : path.join(projectPath, file.stored_path);
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
 * Export export function
 * 
 * @exports {function} exportItem - Export an item to a portable bundle
 */
module.exports = { exportItem };
