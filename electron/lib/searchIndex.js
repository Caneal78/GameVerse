/**
 * Search Index Module
 * 
 * Manages the full-text search index for items.
 * Rebuilds search index rows when items are modified.
 * 
 * @module searchIndex
 */

/**
 * Rebuild the search_index FTS5 row for a single item
 * Pulls together name, tags, notes, field values, and file names
 * so a single search box can find "Swamp" across creatures,
 * environments, textures, and lore.
 * 
 * @param {Database} db - SQLite database connection
 * @param {string} itemId - Item UUID to reindex
 */
function reindexItem(db, itemId) {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  if (!item) {
    db.prepare('DELETE FROM search_index WHERE item_id = ?').run(itemId);
    return;
  }

  const tags = db
    .prepare(
      `SELECT t.name FROM tags t
       JOIN item_tags it ON it.tag_id = t.id
       WHERE it.item_id = ?`
    )
    .all(itemId)
    .map((r) => r.name)
    .join(' ');

  const notes = db
    .prepare('SELECT title, body FROM notes WHERE item_id = ?')
    .all(itemId)
    .map((r) => `${r.title} ${r.body}`)
    .join(' ');

  const fields = db
    .prepare('SELECT field_key, field_value FROM item_fields WHERE item_id = ?')
    .all(itemId)
    .map((r) => `${r.field_key} ${r.field_value}`)
    .join(' ');

  const files = db
    .prepare('SELECT original_name FROM files WHERE item_id = ?')
    .all(itemId)
    .map((r) => r.original_name)
    .join(' ');

  db.prepare('DELETE FROM search_index WHERE item_id = ?').run(itemId);
  db.prepare(
    `INSERT INTO search_index (item_id, name, category, tags, notes, fields, files)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(itemId, item.name, item.category, tags, notes, fields, files);
}

/**
 * Perform a full-text search across all items
 * Searches item names, tags, notes, fields, and file names.
 * 
 * @param {Database} db - SQLite database connection
 * @param {string} query - Search query string
 * @param {number} [limit=100] - Maximum results to return
 * @returns {Object[]} Array of matching items with basic info
 */
function search(db, query, limit = 100) {
  if (!query || !query.trim()) return [];
  // Sanitize query for FTS5 MATCH syntax - wrap each token with * for prefix search
  const tokens = query
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/["*]/g, ''))
    .filter(Boolean)
    .map((t) => `${t}*`);
  const matchQuery = tokens.join(' ');

  const rows = db
    .prepare(
      `SELECT si.item_id, i.name, i.category, i.status
       FROM search_index si
       JOIN items i ON i.id = si.item_id
       WHERE search_index MATCH ?
       ORDER BY rank
       LIMIT ?`
    )
    .all(matchQuery, limit);

  return rows;
}

/**
 * Export search index functions
 * 
 * @exports {function} reindexItem - Rebuild search index for an item
 * @exports {function} search - Perform full-text search
 */
module.exports = { reindexItem, search };
