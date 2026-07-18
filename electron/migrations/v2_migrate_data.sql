// Migration v2: Migrate JSON data to SQLite
-- Transfers existing lowdb JSON data to new SQLite structure

-- Skip if migration already ran
SELECT COUNT(*) FROM schema_version WHERE version = 2 LIMIT 1; -- If this returns 0, run the migration

-- Migrate items
INSERT INTO items (id, name, type, metadata)
SELECT id, name, type, metadata FROM lowdb.items;

-- Migrate files
INSERT INTO files (id, item_id, stored_path, original_path, mime_type, size)
SELECT id, item_id, stored_path, original_path, mime_type, size FROM lowdb.files;

-- Migrate tags
INSERT INTO tags (id, name)
SELECT id, name FROM lowdb.tags;

-- Migrate relationships
INSERT INTO relationships (id, from_id, to_id, relationship)
SELECT id, from_id, to_id, relationship FROM lowdb.relationships;