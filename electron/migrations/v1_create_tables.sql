// Migration v1: Create base schema
-- Creates all fundamental tables for GameVerse

-- Schema version table
CREATE TABLE IF NOT EXISTS schema_version (
  id INTEGER PRIMARY KEY,
  version INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  metadata TEXT
);

-- Files table
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  stored_path TEXT,
  original_path TEXT,
  mime_type TEXT,
  size INTEGER
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Relationships table
CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  from_id TEXT,
  to_id TEXT,
  relationship TEXT
);

-- Insert initial schema version
INSERT OR IGNORE INTO schema_version (version) VALUES (1);