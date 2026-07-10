/**
 * GameVerse Database Schema
 * 
 * Core philosophy: "Everything is an Item."
 * Category-specific template fields are stored in item_fields (key/value)
 * so new categories/templates never require a schema migration.
 * 
 * @module schema
 * @description Defines the complete SQLite database schema for GameVerse,
 * including tables for items, tags, notes, files, links, collections,
 * world bible pages, templates, backups, and full-text search.
 */

/**
 * SQL schema definition for GameVerse database
 * Includes all tables, indexes, and virtual tables needed for the application.
 * Uses WAL mode for better concurrency and foreign keys for data integrity.
 */
const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,        -- Character, Creature, Vehicle, Location, Faction, Quest, Weapon, Prop, Material, Animation, Script, Item, Building, ...
  status TEXT DEFAULT 'Concept', -- Concept / WIP / Final
  summary TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);

-- Arbitrary template fields per item (Age, Habitat, Manufacturer, etc.)
CREATE TABLE IF NOT EXISTS item_fields (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_value TEXT DEFAULT '',
  field_order INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_item_fields_item ON item_fields(item_id);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS item_tags (
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

-- Notebook entries (biographies, lore, instructions, prompts, dialogue, etc.)
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  note_type TEXT DEFAULT 'General', -- Biography / Lore / Design / Modeling / Animation / Dialogue / Quest / AI Prompt / Negative Prompt / General
  body TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_item ON notes(item_id);

-- Files: images, audio, models, animations, scripts - all tracked here
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  section TEXT NOT NULL,        -- Images / Audio / Models / Animations / Scripts
  original_name TEXT NOT NULL,
  stored_path TEXT NOT NULL,    -- relative path inside project vault
  mime_type TEXT,
  size_bytes INTEGER,
  is_linked INTEGER DEFAULT 0,  -- 1 = external reference only (Link Files mode), 0 = copied in
  version INTEGER DEFAULT 1,
  is_current INTEGER DEFAULT 1, -- 1 = latest version for this "slot"
  slot_key TEXT,                -- groups versions of "the same" file (e.g. original_name normalized)
  metadata TEXT DEFAULT '{}',   -- JSON: poly count, materials, textures, rig info, duration, etc.
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_files_item ON files(item_id);
CREATE INDEX IF NOT EXISTS idx_files_section ON files(section);

-- Thumbnails (one primary thumbnail per item, shown in grid browser)
CREATE TABLE IF NOT EXISTS thumbnails (
  item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  stored_path TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Links between items (generic, bidirectional, optional relationship label)
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  item_a TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  item_b TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'Connected', -- Connected / Companion Of / Located In / Owned By / Enemy Of / etc.
  created_at TEXT NOT NULL,
  UNIQUE(item_a, item_b, relationship)
);
CREATE INDEX IF NOT EXISTS idx_links_a ON links(item_a);
CREATE INDEX IF NOT EXISTS idx_links_b ON links(item_b);

-- Collections (custom curated groups of items)
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collection_items (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  PRIMARY KEY (collection_id, item_id)
);

-- World Bible pages (Characters, Creatures, Locations, Factions, History, Lore, Technology, Weapons, Vehicles, Quests)
-- World Bible pages can optionally link to an Item for a "full" entry.
CREATE TABLE IF NOT EXISTS world_bible_pages (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,   -- Characters / Creatures / Locations / Factions / History / Lore / Technology / Weapons / Vehicles / Quests
  title TEXT NOT NULL,
  linked_item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
  body TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wb_category ON world_bible_pages(category);

-- Templates (field definitions per category, editable by user)
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  category TEXT UNIQUE NOT NULL,
  fields_json TEXT NOT NULL   -- JSON array of {key, label, type}
);

-- Backups log
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  size_bytes INTEGER
);

-- === Full Text Search (FTS5) ===
-- Virtual table indexing item name/summary/tags/notes for fast global search
-- item_id and category are UNINDEXED because we join with the items table for those
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  item_id UNINDEXED,
  name,
  category UNINDEXED,
  tags,
  notes,
  fields,
  files
);
`;

/**
 * Default template definitions for each item category
 * These templates define the custom fields available for each category type.
 * Users can customize these templates through the Settings page.
 * 
 * @type {Array<{category: string, fields: Array<{key: string, label: string, type: string}>}>}
 */
const DEFAULT_TEMPLATES = [
  {
    category: 'Character',
    fields: [
      { key: 'age', label: 'Age', type: 'text' },
      { key: 'personality', label: 'Personality', type: 'textarea' },
      { key: 'biography', label: 'Biography', type: 'textarea' },
      { key: 'appearance', label: 'Appearance', type: 'textarea' },
      { key: 'clothing', label: 'Clothing', type: 'textarea' },
      { key: 'weapons', label: 'Weapons', type: 'text' },
      { key: 'abilities', label: 'Abilities', type: 'textarea' },
      { key: 'relationships', label: 'Relationships', type: 'textarea' },
      { key: 'voice_notes', label: 'Voice Notes', type: 'textarea' }
    ]
  },
  {
    category: 'Creature',
    fields: [
      { key: 'species', label: 'Species', type: 'text' },
      { key: 'habitat', label: 'Habitat', type: 'text' },
      { key: 'behavior', label: 'Behavior', type: 'textarea' },
      { key: 'diet', label: 'Diet', type: 'text' },
      { key: 'threat_level', label: 'Threat Level', type: 'text' },
      { key: 'attacks', label: 'Attacks', type: 'textarea' },
      { key: 'weaknesses', label: 'Weaknesses', type: 'textarea' },
      { key: 'lore', label: 'Lore', type: 'textarea' }
    ]
  },
  {
    category: 'Vehicle',
    fields: [
      { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
      { key: 'purpose', label: 'Purpose', type: 'text' },
      { key: 'engine', label: 'Engine', type: 'text' },
      { key: 'features', label: 'Features', type: 'textarea' },
      { key: 'modifications', label: 'Modifications', type: 'textarea' }
    ]
  },
  {
    category: 'Location',
    fields: [
      { key: 'history', label: 'History', type: 'textarea' },
      { key: 'population', label: 'Population', type: 'text' },
      { key: 'events', label: 'Events', type: 'textarea' },
      { key: 'resources', label: 'Resources', type: 'textarea' },
      { key: 'connected_characters', label: 'Connected Characters', type: 'textarea' }
    ]
  },
  {
    category: 'Weapon',
    fields: [
      { key: 'weapon_type', label: 'Weapon Type', type: 'text' },
      { key: 'damage', label: 'Damage', type: 'text' },
      { key: 'range', label: 'Range', type: 'text' },
      { key: 'lore', label: 'Lore', type: 'textarea' }
    ]
  },
  {
    category: 'Faction',
    fields: [
      { key: 'leader', label: 'Leader', type: 'text' },
      { key: 'goals', label: 'Goals', type: 'textarea' },
      { key: 'territory', label: 'Territory', type: 'text' },
      { key: 'history', label: 'History', type: 'textarea' }
    ]
  },
  {
    category: 'Quest',
    fields: [
      { key: 'objective', label: 'Objective', type: 'textarea' },
      { key: 'giver', label: 'Quest Giver', type: 'text' },
      { key: 'reward', label: 'Reward', type: 'text' },
      { key: 'stages', label: 'Stages', type: 'textarea' }
    ]
  },
  {
    category: 'Material',
    fields: [
      { key: 'material_type', label: 'Material Type', type: 'text' },
      { key: 'properties', label: 'Properties', type: 'textarea' }
    ]
  },
  {
    category: 'Prop',
    fields: [
      { key: 'usage', label: 'Usage', type: 'textarea' },
      { key: 'interactable', label: 'Interactable', type: 'text' }
    ]
  },
  {
    category: 'Building',
    fields: [
      { key: 'purpose', label: 'Purpose', type: 'text' },
      { key: 'occupants', label: 'Occupants', type: 'textarea' }
    ]
  },
  {
    category: 'Animation',
    fields: [
      { key: 'anim_type', label: 'Animation Type', type: 'text' },
      { key: 'frame_count', label: 'Frame Count', type: 'text' },
      { key: 'target_rig', label: 'Target Rig', type: 'text' }
    ]
  },
  {
    category: 'Script',
    fields: [
      { key: 'language', label: 'Language', type: 'text' },
      { key: 'purpose', label: 'Purpose', type: 'textarea' }
    ]
  },
  {
    category: 'Item',
    fields: [
      { key: 'item_type', label: 'Item Type', type: 'text' },
      { key: 'rarity', label: 'Rarity', type: 'text' },
      { key: 'effect', label: 'Effect', type: 'textarea' }
    ]
  }
];

/**
 * Export schema constants for use in other modules
 * 
 * @exports {string} SCHEMA_SQL - The complete SQL schema definition
 * @exports {Array} DEFAULT_TEMPLATES - Default template definitions for each category
 */
module.exports = { SCHEMA_SQL, DEFAULT_TEMPLATES };
