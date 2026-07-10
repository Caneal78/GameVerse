/**
 * Backup Module
 * 
 * Creates compressed backups of the entire project vault.
 * Excludes the Backups folder itself to avoid recursive growth.
 * 
 * @module backup
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a compressed backup of the entire project vault
 * Zips the database, assets, world bible, and thumbnails into
 * Backups/GameVerse_Backup_<timestamp>.zip. Excludes the Backups
 * folder itself to avoid recursive growth.
 * 
 * @param {Database} db - SQLite database connection
 * @param {string} projectPath - Path to project root
 * @returns {Promise<{backupPath: string, size: number}>} Backup metadata
 */
function createBackup(db, projectPath) {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `GameVerse_Backup_${timestamp}.zip`;
    const backupsDir = path.join(projectPath, 'Backups');
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
    const backupPath = path.join(backupsDir, backupFileName);

    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const size = archive.pointer();
      try {
        db.prepare(
          'INSERT INTO backups (id, file_path, created_at, size_bytes) VALUES (?, ?, ?, ?)'
        ).run(uuidv4(), path.relative(projectPath, backupPath), new Date().toISOString(), size);
      } catch (e) {
        /* non-fatal */
      }
      resolve({ backupPath, size });
    });
    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    const entries = fs.readdirSync(projectPath);
    for (const entry of entries) {
      if (entry === 'Backups') continue;
      const full = path.join(projectPath, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        archive.directory(full, entry);
      } else {
        archive.file(full, { name: entry });
      }
    }

    archive.finalize();
  });
}

/**
 * Export backup function
 * 
 * @exports {function} createBackup - Create a compressed backup
 */
module.exports = { createBackup };
