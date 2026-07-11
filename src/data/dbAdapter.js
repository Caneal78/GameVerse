// src/data/dbAdapter.js
// Thin wrapper around lowdb to allow future DB replacement.
// All repository code should import from this module instead of directly using lowdb.

const path = require('path');
const { getDB } = require('./lowdb');

// Singleton per project path – caches the DB instance.
let dbInstance = null;

/**
 * Initialise (or retrieve) the database for the given project folder.
 * @param {string} projectPath Absolute path to the GameVerse vault.
 * @returns {object} API exposing CRUD helpers used throughout the app.
 */
function init(projectPath) {
  if (!dbInstance) {
    dbInstance = getDB(projectPath);
  }
  return dbInstance;
}

/**
 * Example helper: fetch all relationships.
 * Returns an array of { sourceId, targetId, type } objects.
 */
function getAllRelationships() {
  if (!dbInstance) throw new Error('DB not initialised');
  return dbInstance.data.relationships || [];
}

/**
 * Insert a new relationship record.
 * @param {object} rel { sourceId, targetId, type }
 */
function addRelationship(rel) {
  if (!dbInstance) throw new Error('DB not initialised');
  dbInstance.data.relationships.push(rel);
  dbInstance.write();
  return rel;
}

module.exports = { init, getAllRelationships, addRelationship };
