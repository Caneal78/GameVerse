/**
 * Item Repository Module
 *
 * Handles all database operations for items, tags, notes, links,
 * collections, templates, and world bible pages.
 *
 * @module itemRepo
 */

const { v4: uuidv4 } = require("uuid");
const { reindexItem } = require("./searchIndex");

/**
 * Get current timestamp in ISO format
 * @returns {string} Current timestamp
 */
function now() {
  return new Date().toISOString();
}

/**
 * Create a new item in the database
 *
 * @param {Database} db - SQLite database connection
 * @param {Object} payload - Item data
 * @param {string} payload.name - Item name
 * @param {string} payload.category - Item category (Character, Creature, etc.)
 * @param {string} [payload.status='Concept'] - Item status
 * @param {string} [payload.summary] - Item summary
 * @param {string[]} [payload.tags] - Array of tag names
 * @param {Object} [payload.fields] - Key-value pairs for template fields
 * @returns {Object} The created item with all related data
 */
function createItem(db, { name, category, status, summary, tags, fields }) {
  const id = uuidv4();
  const ts = now();
  db.prepare(
    `INSERT INTO items (id, name, category, status, summary, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, name, category, status || "Concept", summary || "", ts, ts);

  if (Array.isArray(tags)) {
    for (const tagName of tags) addTagToItem(db, id, tagName);
  }

  if (fields && typeof fields === "object") {
    let order = 0;
    for (const [key, value] of Object.entries(fields)) {
      db.prepare(
        `INSERT INTO item_fields (id, item_id, field_key, field_value, field_order)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(uuidv4(), id, key, value == null ? "" : String(value), order++);
    }
  }

  reindexItem(db, id);
  return getItem(db, id);
}

/**
 * Update an existing item
 *
 * @param {Database} db - SQLite database connection
 * @param {string} id - Item UUID
 * @param {Object} updates - Fields to update
 * @param {string} [updates.name] - New name
 * @param {string} [updates.category] - New category
 * @param {string} [updates.status] - New status
 * @param {string} [updates.summary] - New summary
 * @param {Object} [updates.fields] - Template fields to update
 * @returns {Object} The updated item with all related data
 * @throws {Error} If item not found
 */
function updateItem(db, id, updates) {
  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id);
  if (!item) throw new Error("Item not found");

  const name = updates.name !== undefined ? updates.name : item.name;
  const category =
    updates.category !== undefined ? updates.category : item.category;
  const status = updates.status !== undefined ? updates.status : item.status;
  const summary =
    updates.summary !== undefined ? updates.summary : item.summary;

  db.prepare(
    `UPDATE items SET name = ?, category = ?, status = ?, summary = ?, updated_at = ? WHERE id = ?`,
  ).run(name, category, status, summary, now(), id);

  if (updates.fields && typeof updates.fields === "object") {
    for (const [key, value] of Object.entries(updates.fields)) {
      const existing = db
        .prepare(
          "SELECT id FROM item_fields WHERE item_id = ? AND field_key = ?",
        )
        .get(id, key);
      if (existing) {
        db.prepare("UPDATE item_fields SET field_value = ? WHERE id = ?").run(
          value == null ? "" : String(value),
          existing.id,
        );
      } else {
        db.prepare(
          `INSERT INTO item_fields (id, item_id, field_key, field_value, field_order)
           VALUES (?, ?, ?, ?, ?)`,
        ).run(uuidv4(), id, key, value == null ? "" : String(value), 0);
      }
    }
  }

  reindexItem(db, id);
  return getItem(db, id);
}

/**
 * Delete an item from the database
 * Cascade deletes will remove associated tags, notes, files, and links.
 *
 * @param {Database} db - SQLite database connection
 * @param {string} id - Item UUID
 */
function deleteItem(db, id) {
  db.prepare("DELETE FROM items WHERE id = ?").run(id);
}

/**
 * Get a single item with all related data
 *
 * @param {Database} db - SQLite database connection
 * @param {string} id - Item UUID
 * @returns {Object|null} Item object with fields, tags, notes, files, thumbnail, and links, or null if not found
 */
function getItem(db, id) {
  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id);
  if (!item) return null;

  const fields = db
    .prepare(
      "SELECT field_key, field_value FROM item_fields WHERE item_id = ? ORDER BY field_order",
    )
    .all(id);
  const tags = db
    .prepare(
      `SELECT t.id, t.name FROM tags t JOIN item_tags it ON it.tag_id = t.id WHERE it.item_id = ?`,
    )
    .all(id);
  const notes = db
    .prepare("SELECT * FROM notes WHERE item_id = ? ORDER BY created_at")
    .all(id);
  const files = db
    .prepare(
      "SELECT * FROM files WHERE item_id = ? ORDER BY section, slot_key, version DESC",
    )
    .all(id);
  const thumbnail = db
    .prepare("SELECT * FROM thumbnails WHERE item_id = ?")
    .get(id);
  const links = db
    .prepare(
      `SELECT l.id, l.relationship,
              CASE WHEN l.item_a = ? THEN l.item_b ELSE l.item_a END as linked_item_id
       FROM links l WHERE l.item_a = ? OR l.item_b = ?`,
    )
    .all(id, id, id)
    .map((row) => {
      const linkedItem = db
        .prepare("SELECT id, name, category, status FROM items WHERE id = ?")
        .get(row.linked_item_id);
      return {
        link_id: row.id,
        relationship: row.relationship,
        item: linkedItem,
      };
    })
    .filter((l) => l.item);

  return { ...item, fields, tags, notes, files, thumbnail, links };
}

/**
 * List items with optional filtering
 *
 * @param {Database} db - SQLite database connection
 * @param {Object} [filters={}] - Filter options
 * @param {string} [filters.category] - Filter by category
 * @param {string} [filters.status] - Filter by status
 * @param {string} [filters.tag] - Filter by tag name
 * @param {string} [filters.search] - Search in item name
 * @returns {Object[]} Array of items with tags and thumbnails
 */
function listItems(db, { category, status, tag, search } = {}) {
  let sql = `SELECT DISTINCT i.* FROM items i`;
  const clauses = [];
  const params = [];

  if (tag) {
    sql += ` JOIN item_tags it ON it.item_id = i.id JOIN tags t ON t.id = it.tag_id`;
    clauses.push("t.name = ?");
    params.push(tag);
  }
  if (category) {
    clauses.push("i.category = ?");
    params.push(category);
  }
  if (status) {
    clauses.push("i.status = ?");
    params.push(status);
  }
  if (search) {
    clauses.push("i.name LIKE ?");
    params.push(`%${search}%`);
  }
  if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
  sql += " ORDER BY i.updated_at DESC";

  const items = db.prepare(sql).all(...params);

  // Attach tags + thumbnail for grid display
  return items.map((item) => {
    const tags = db
      .prepare(
        `SELECT t.id, t.name FROM tags t JOIN item_tags it ON it.tag_id = t.id WHERE it.item_id = ?`,
      )
      .all(item.id);
    const thumbnail = db
      .prepare("SELECT * FROM thumbnails WHERE item_id = ?")
      .get(item.id);
    return { ...item, tags, thumbnail };
  });
}

/**
 * Add a tag to an item (creates tag if it doesn't exist)
 *
 * @param {Database} db - SQLite database connection
 * @param {string} itemId - Item UUID
 * @param {string} tagName - Tag name to add
 * @returns {Object} The tag object with id and name
 */
function addTagToItem(db, itemId, tagName) {
  const clean = tagName.trim();
  if (!clean) return;
  let tag = db.prepare("SELECT * FROM tags WHERE name = ?").get(clean);
  if (!tag) {
    const id = uuidv4();
    db.prepare("INSERT INTO tags (id, name) VALUES (?, ?)").run(id, clean);
    tag = { id, name: clean };
  }
  db.prepare(
    "INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)",
  ).run(itemId, tag.id);
  reindexItem(db, itemId);
  return tag;
}

/**
 * Remove a tag from an item
 *
 * @param {Database} db - SQLite database connection
 * @param {string} itemId - Item UUID
 * @param {string} tagId - Tag UUID
 */
function removeTagFromItem(db, itemId, tagId) {
  db.prepare("DELETE FROM item_tags WHERE item_id = ? AND tag_id = ?").run(
    itemId,
    tagId,
  );
  reindexItem(db, itemId);
}

/**
 * List all tags with usage counts
 *
 * @param {Database} db - SQLite database connection
 * @returns {Object[]} Array of tags with id, name, and usage_count
 */
function listAllTags(db) {
  return db
    .prepare(
      `SELECT t.id, t.name, COUNT(it.item_id) as usage_count
       FROM tags t LEFT JOIN item_tags it ON it.tag_id = t.id
       GROUP BY t.id ORDER BY t.name`,
    )
    .all();
}

/**
 * Add a notebook entry to an item
 *
 * @param {Database} db - SQLite database connection
 * @param {string} itemId - Item UUID
 * @param {Object} note - Note data
 * @param {string} [note.title='Untitled'] - Note title
 * @param {string} [note.note_type='General'] - Note type (Biography, Lore, etc.)
 * @param {string} [note.body] - Note content
 * @returns {Object} The created note
 */
function addNote(db, itemId, { title, note_type, body }) {
  const id = uuidv4();
  const ts = now();
  db.prepare(
    `INSERT INTO notes (id, item_id, title, note_type, body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    itemId,
    title || "Untitled",
    note_type || "General",
    body || "",
    ts,
    ts,
  );
  reindexItem(db, itemId);
  return db.prepare("SELECT * FROM notes WHERE id = ?").get(id);
}

/**
 * Update an existing note
 *
 * @param {Database} db - SQLite database connection
 * @param {string} noteId - Note UUID
 * @param {Object} updates - Fields to update
 * @param {string} [updates.title] - New title
 * @param {string} [updates.note_type] - New note type
 * @param {string} [updates.body] - New content
 * @returns {Object} The updated note
 * @throws {Error} If note not found
 */
function updateNote(db, noteId, { title, note_type, body }) {
  const note = db.prepare("SELECT * FROM notes WHERE id = ?").get(noteId);
  if (!note) throw new Error("Note not found");
  db.prepare(
    `UPDATE notes SET title = ?, note_type = ?, body = ?, updated_at = ? WHERE id = ?`,
  ).run(
    title !== undefined ? title : note.title,
    note_type !== undefined ? note_type : note.note_type,
    body !== undefined ? body : note.body,
    now(),
    noteId,
  );
  reindexItem(db, note.item_id);
  return db.prepare("SELECT * FROM notes WHERE id = ?").get(noteId);
}

/**
 * Delete a note
 *
 * @param {Database} db - SQLite database connection
 * @param {string} noteId - Note UUID
 */
function deleteNote(db, noteId) {
  const note = db.prepare("SELECT * FROM notes WHERE id = ?").get(noteId);
  if (!note) return;
  db.prepare("DELETE FROM notes WHERE id = ?").run(noteId);
  reindexItem(db, note.item_id);
}

/**
 * Create a bidirectional link between two items
 *
 * @param {Database} db - SQLite database connection
 * @param {string} itemAId - First item UUID
 * @param {string} itemBId - Second item UUID
 * @param {string} [relationship='Connected'] - Relationship label
 * @throws {Error} If trying to link an item to itself
 */
function linkItems(db, itemAId, itemBId, relationship = "Connected") {
  if (itemAId === itemBId) throw new Error("Cannot link an item to itself");
  const id = uuidv4();
  try {
    db.prepare(
      `INSERT INTO links (id, item_a, item_b, relationship, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run(id, itemAId, itemBId, relationship, now());
  } catch (e) {
    // likely UNIQUE constraint - link already exists, ignore
  }
}

/**
 * Remove a link between items
 *
 * @param {Database} db - SQLite database connection
 * @param {string} linkId - Link UUID
 */
function unlinkItems(db, linkId) {
  db.prepare("DELETE FROM links WHERE id = ?").run(linkId);
}

/**
 * Set the thumbnail image for an item
 *
 * @param {Database} db - SQLite database connection
 * @param {string} itemId - Item UUID
 * @param {string} storedPath - Relative path to thumbnail image
 */
function setThumbnail(db, itemId, storedPath) {
  const existing = db
    .prepare("SELECT item_id FROM thumbnails WHERE item_id = ?")
    .get(itemId);
  if (existing) {
    db.prepare(
      "UPDATE thumbnails SET stored_path = ?, updated_at = ? WHERE item_id = ?",
    ).run(storedPath, now(), itemId);
  } else {
    db.prepare(
      "INSERT INTO thumbnails (item_id, stored_path, updated_at) VALUES (?, ?, ?)",
    ).run(itemId, storedPath, now());
  }
}

/**
 * Create a new collection
 *
 * @param {Database} db - SQLite database connection
 * @param {string} name - Collection name
 * @param {string} [description] - Collection description
 * @returns {Object} The created collection
 */
function createCollection(db, name, description) {
  const id = uuidv4();
  db.prepare(
    "INSERT INTO collections (id, name, description, created_at) VALUES (?, ?, ?, ?)",
  ).run(id, name, description || "", now());
  return db.prepare("SELECT * FROM collections WHERE id = ?").get(id);
}

/**
 * Add an item to a collection (idempotent)
 *
 * @param {Database} db - SQLite database connection
 * @param {string} collectionId - Collection UUID
 * @param {string} itemId - Item UUID
 */
function addItemToCollection(db, collectionId, itemId) {
  db.prepare(
    "INSERT OR IGNORE INTO collection_items (collection_id, item_id) VALUES (?, ?)",
  ).run(collectionId, itemId);
}

/**
 * Remove an item from a collection
 *
 * @param {Database} db - SQLite database connection
 * @param {string} collectionId - Collection UUID
 * @param {string} itemId - Item UUID
 */
function removeItemFromCollection(db, collectionId, itemId) {
  db.prepare(
    "DELETE FROM collection_items WHERE collection_id = ? AND item_id = ?",
  ).run(collectionId, itemId);
}

/**
 * List all collections
 *
 * @param {Database} db - SQLite database connection
 * @returns {Object[]} Array of collections
 */
function listCollections(db) {
  return db.prepare("SELECT * FROM collections ORDER BY created_at DESC").all();
}

/**
 * Get a single collection with its items
 *
 * @param {Database} db - SQLite database connection
 * @param {string} collectionId - Collection UUID
 * @returns {Object|null} Collection with items array, or null if not found
 */
function getCollection(db, collectionId) {
  const collection = db
    .prepare("SELECT * FROM collections WHERE id = ?")
    .get(collectionId);
  if (!collection) return null;
  const items = db
    .prepare(
      `SELECT i.* FROM items i
       JOIN collection_items ci ON ci.item_id = i.id
       WHERE ci.collection_id = ?`,
    )
    .all(collectionId);
  return { ...collection, items };
}

/**
 * Delete a collection (items are not deleted)
 *
 * @param {Database} db - SQLite database connection
 * @param {string} collectionId - Collection UUID
 */
function deleteCollection(db, collectionId) {
  db.prepare("DELETE FROM collections WHERE id = ?").run(collectionId);
}

/**
 * List all item templates
 *
 * @param {Database} db - SQLite database connection
 * @returns {Object[]} Array of templates with parsed fields
 */
function listTemplates(db) {
  return db
    .prepare("SELECT * FROM templates")
    .all()
    .map((t) => ({
      ...t,
      fields: JSON.parse(t.fields_json),
    }));
}

/**
 * Create or update a template for a category
 *
 * @param {Database} db - SQLite database connection
 * @param {string} category - Category name
 * @param {Array} fields - Array of field definitions
 */
function upsertTemplate(db, category, fields) {
  const existing = db
    .prepare("SELECT * FROM templates WHERE category = ?")
    .get(category);
  if (existing) {
    db.prepare("UPDATE templates SET fields_json = ? WHERE category = ?").run(
      JSON.stringify(fields),
      category,
    );
  } else {
    db.prepare(
      "INSERT INTO templates (id, category, fields_json) VALUES (?, ?, ?)",
    ).run(uuidv4(), category, JSON.stringify(fields));
  }
}

// === World Bible pages ===

/**
 * Create a new world bible page
 *
 * @param {Database} db - SQLite database connection
 * @param {Object} payload - Page data
 * @param {string} payload.category - Page category (Characters, Locations, etc.)
 * @param {string} payload.title - Page title
 * @param {string} [payload.linked_item_id] - Optional linked item UUID
 * @param {string} [payload.body] - Page content
 * @returns {Object} The created page
 */
function createWorldBiblePage(db, { category, title, linked_item_id, body }) {
  const id = uuidv4();
  const ts = now();
  db.prepare(
    `INSERT INTO world_bible_pages (id, category, title, linked_item_id, body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, category, title, linked_item_id || null, body || "", ts, ts);
  return db.prepare("SELECT * FROM world_bible_pages WHERE id = ?").get(id);
}

/**
 * Update a world bible page
 *
 * @param {Database} db - SQLite database connection
 * @param {string} id - Page UUID
 * @param {Object} updates - Fields to update
 * @param {string} [updates.title] - New title
 * @param {string} [updates.body] - New content
 * @param {string} [updates.linked_item_id] - New linked item UUID
 * @returns {Object} The updated page
 * @throws {Error} If page not found
 */
function updateWorldBiblePage(db, id, { title, body, linked_item_id }) {
  const page = db
    .prepare("SELECT * FROM world_bible_pages WHERE id = ?")
    .get(id);
  if (!page) throw new Error("Page not found");
  db.prepare(
    `UPDATE world_bible_pages SET title = ?, body = ?, linked_item_id = ?, updated_at = ? WHERE id = ?`,
  ).run(
    title !== undefined ? title : page.title,
    body !== undefined ? body : page.body,
    linked_item_id !== undefined ? linked_item_id : page.linked_item_id,
    now(),
    id,
  );
  return db.prepare("SELECT * FROM world_bible_pages WHERE id = ?").get(id);
}

/**
 * Delete a world bible page
 *
 * @param {Database} db - SQLite database connection
 * @param {string} id - Page UUID
 */
function deleteWorldBiblePage(db, id) {
  db.prepare("DELETE FROM world_bible_pages WHERE id = ?").run(id);
}

/**
 * List world bible pages, optionally filtered by category
 *
 * @param {Database} db - SQLite database connection
 * @param {string} [category] - Optional category filter
 * @returns {Object[]} Array of world bible pages
 */
function listWorldBiblePages(db, category) {
  if (category) {
    return db
      .prepare(
        "SELECT * FROM world_bible_pages WHERE category = ? ORDER BY updated_at DESC",
      )
      .all(category);
  }
  return db
    .prepare("SELECT * FROM world_bible_pages ORDER BY updated_at DESC")
    .all();
}

/**
 * Export all item repository functions
 *
 * @exports {function} createItem - Create a new item
 * @exports {function} updateItem - Update an existing item
 * @exports {function} deleteItem - Delete an item
 * @exports {function} getItem - Get a single item with all data
 * @exports {function} listItems - List items with filters
 * @exports {function} addTagToItem - Add a tag to an item
 * @exports {function} removeTagFromItem - Remove a tag from an item
 * @exports {function} listAllTags - List all tags with usage counts
 * @exports {function} addNote - Add a notebook entry
 * @exports {function} updateNote - Update a notebook entry
 * @exports {function} deleteNote - Delete a notebook entry
 * @exports {function} linkItems - Link two items
 * @exports {function} unlinkItems - Remove a link
 * @exports {function} setThumbnail - Set item thumbnail
 * @exports {function} createCollection - Create a collection
 * @exports {function} addItemToCollection - Add item to collection
 * @exports {function} removeItemFromCollection - Remove item from collection
 * @exports {function} listCollections - List all collections
 * @exports {function} getCollection - Get collection with items
 * @exports {function} deleteCollection - Delete a collection
 * @exports {function} listTemplates - List all templates
 * @exports {function} upsertTemplate - Create/update template
 * @exports {function} createWorldBiblePage - Create world bible page
 * @exports {function} updateWorldBiblePage - Update world bible page
 * @exports {function} deleteWorldBiblePage - Delete world bible page
 * @exports {function} listWorldBiblePages - List world bible pages
 */
module.exports = {
  createItem,
  updateItem,
  deleteItem,
  getItem,
  listItems,
  addTagToItem,
  removeTagFromItem,
  listAllTags,
  addNote,
  updateNote,
  deleteNote,
  linkItems,
  unlinkItems,
  setThumbnail,
  createCollection,
  addItemToCollection,
  removeItemFromCollection,
  listCollections,
  getCollection,
  deleteCollection,
  listTemplates,
  upsertTemplate,
  createWorldBiblePage,
  updateWorldBiblePage,
  deleteWorldBiblePage,
  listWorldBiblePages,
};
