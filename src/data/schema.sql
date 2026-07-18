// Initial schema for GameVerse database

-- Tables:
-- items
-- files
-- notes
-- tags
-- relationships

-- Example schema for items table:
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  metadata TEXT
);

-- Example schema for files table:
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  stored_path TEXT,
  original_path TEXT,
  mime_type TEXT,
  size INTEGER
);

-- Example schema for relationships table:
CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  from_id TEXT,
  to_id TEXT,
  relationship TEXT
);