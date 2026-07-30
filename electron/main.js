/**
 * Electron main process handling window management, IPC communication,
 * project lifecycle, and file system operations.
 *
 * @module main
 */

const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  protocol,
} = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawnSync, spawn } = require("child_process");

const vault = require("./lib/vault");
const itemRepo = require("./lib/itemRepo");
const assetRepo = require('./lib/assetRepo');

// IPC Handler: Import an asset (image or GLB model)
ipcMain.handle('assets:import', async (event, { name, type, sourcePath }) => {
  const { db, projectPath } = requireProject();
  return assetRepo.importAsset(db, projectPath, { name, type, sourcePath });
});

const filesLib = require("./lib/files");
const { search } = require("./lib/searchIndex");
const { exportItem, exportItemWithProgress, exportCollection } = require("./lib/exportItem");
const { createBackup } = require("./lib/backup");

/**
 * Main application window instance
 * @type {BrowserWindow}
 */
let mainWindow;

/**
 * Currently loaded project metadata
 * @type {{projectPath: string, dbPath: string, projectName: string, db: Database}|null}
 */
let currentProject = null;

/**
 * Application-level persisted settings
 * @type {{blenderPath: string|null}}
 */
let appSettings = {
  blenderPath: null,
};

function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadAppSettings() {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, "utf-8");
      const parsed = JSON.parse(raw);
      appSettings = {
        blenderPath: parsed.blenderPath || null,
      };
    }
  } catch (error) {
    console.warn("Unable to load app settings:", error.message);
  }
}

function saveAppSettings() {
  try {
    const settingsPath = getSettingsPath();
    fs.writeFileSync(
      settingsPath,
      JSON.stringify(appSettings, null, 2),
      "utf-8",
    );
  } catch (error) {
    console.warn("Unable to save app settings:", error.message);
  }
}

/**
 * Development mode flag
 * @type {boolean}
 */
const isDev = process.env.NODE_ENV === "development";
const devPort = Number(process.env.DEV_PORT || 5173);
const devHost = process.env.DEV_HOST || "127.0.0.1";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "gvfile",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

/**
 * Create and configure the main application window
 */
function waitForServer(host, port, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function check() {
      const req = http.request(
        { host, port, method: "HEAD", timeout: 2000 },
        (res) => {
          res.destroy();
          resolve();
        },
      );

      req.on("error", () => {
        if (Date.now() - start > timeout) {
          reject(
            new Error(`Server did not become available on ${host}:${port}`),
          );
        } else {
          setTimeout(check, 250);
        }
      });

      req.on("timeout", () => {
        req.destroy();
        if (Date.now() - start > timeout) {
          reject(
            new Error(`Server did not become available on ${host}:${port}`),
          );
        } else {
          setTimeout(check, 250);
        }
      });

      req.end();
    }

    check();
  });
}

function isAllowedNavigation(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol === "data:") return true;
    if (parsed.protocol === "file:") return true;
    if (parsed.protocol === "gvfile:") return true;
    if (
      isDev &&
      parsed.protocol === "http:" &&
      parsed.hostname === devHost &&
      Number(parsed.port || 80) === devPort
    ) {
      return true;
    }
  } catch (error) {
    return false;
  }
  return false;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: "#14151a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    if (!isAllowedNavigation(navigationUrl)) {
      event.preventDefault();
    }
  });

  if (isDev) {
    try {
      await waitForServer(devHost, devPort, 15000);
      await mainWindow.loadURL(`http://${devHost}:${devPort}`);
    } catch (err) {
      console.error("Failed to load dev server:", err.message);
      mainWindow.loadURL(
        "data:text/html;charset=utf-8," +
          encodeURIComponent(
            "<h2>Failed to load Vite dev server.</h2><p>Check the terminal and restart the application.</p>",
          ),
      );
    }
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  loadAppSettings();

  // Custom protocol to safely serve local vault files (images/audio/models) to the renderer
  protocol.registerFileProtocol("gvfile", (request, callback) => {
    try {
      const originalUrl = request.url;
      console.log('[gvfile] Request received:', originalUrl);
      let filePath = originalUrl.replace(/^gvfile:(?:\/\/\/|\/\/|\/)?/, "");
      filePath = decodeURIComponent(filePath || "");
      console.log('[gvfile] Extracted filePath:', filePath);

      if (/^\\+/.test(filePath)) {
        filePath = filePath.replace(/^\\+/, "\\\\");
      }

      if (/^[A-Za-z][\\/]/.test(filePath) && !/^[A-Za-z]:/.test(filePath)) {
        filePath = `${filePath[0]}:${filePath.slice(1)}`;
      }

      if (/^[\\/][A-Za-z]:/.test(filePath)) {
        filePath = filePath.slice(1);
      }

      filePath = filePath.replace(/\\/g, path.sep).replace(/\//g, path.sep);
      let normalizedPath = path.normalize(filePath);

      if (!fs.existsSync(normalizedPath)) {
        const alternate = path.resolve(filePath);
        if (fs.existsSync(alternate)) {
          normalizedPath = alternate;
        }
      }

      if (!fs.existsSync(normalizedPath)) {
        console.error("[gvfile] File not found:", {
          originalUrl,
          filePath,
          normalizedPath,
        });
        return callback({ error: -6 });
      }

      console.log('[gvfile] File exists, checking permissions:', normalizedPath);

      if (!isAllowedGvfilePath(normalizedPath)) {
        console.error(
          "[gvfile] Path denied - outside vault:",
          normalizedPath,
        );
        return callback({ error: -6 });
      }

      console.log('[gvfile] Path allowed, serving file:', normalizedPath);
      return callback({ path: normalizedPath });
    } catch (e) {
      console.error("gvfile protocol error:", e);
      return callback({ error: -6 });
    }
  });

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (currentProject && currentProject.db) currentProject.db.close();
  if (process.platform !== "darwin") app.quit();
});

/**
 * Ensure a project is currently loaded
 * Throws an error if no project is open.
 *
 * @returns {{projectPath: string, dbPath: string, projectName: string, db: Database}} Current project
 * @throws {Error} If no project is loaded
 */
function requireProject() {
  if (!currentProject) throw new Error("No project is currently open.");
  return currentProject;
}

/**
 * Restrict gvfile:// access to the open vault and registered linked files.
 *
 * @param {string} normalizedPath - Resolved absolute filesystem path
 * @returns {boolean}
 */
function isAllowedGvfilePath(normalizedPath) {
  console.log('[gvfile] isAllowedGvfilePath called:', { normalizedPath, currentProject });
  
  if (!currentProject) {
    console.log('[gvfile] No current project, denying access');
    return false;
  }

  const resolved = path.resolve(normalizedPath);
  const vaultRoot = path.resolve(currentProject.projectPath);
  
  // Normalize paths to handle Windows path separators and case consistently
  const normalizedResolved = resolved.replace(/\\/g, '/').toLowerCase();
  const normalizedVaultRoot = vaultRoot.replace(/\\/g, '/').toLowerCase();
  
  console.log('[gvfile] Path comparison:', { 
    resolved, 
    vaultRoot, 
    normalizedResolved, 
    normalizedVaultRoot,
    sep: path.sep 
  });

  // Check if path is within vault using normalized paths
  if (normalizedResolved === normalizedVaultRoot || 
      normalizedResolved.startsWith(normalizedVaultRoot + '/')) {
    console.log('[gvfile] Path is within vault, allowing access');
    return true;
  }

  console.log('[gvfile] Path is not within vault, checking linked paths');

  const linkedPaths = currentProject.db
    .prepare("SELECT stored_path FROM files WHERE is_linked = 1")
    .all();

  for (const { stored_path } of linkedPaths) {
    try {
      const normalizedLinked = path.resolve(stored_path).replace(/\\/g, '/').toLowerCase();
      if (normalizedLinked === normalizedResolved) {
        console.log('[gvfile] Path is linked file, allowing access');
        return true;
      }
    } catch {
      // Ignore malformed linked paths
    }
  }

  console.log('[gvfile] Path denied - not in vault or linked paths');
  return false;
}

// ---------- Project lifecycle ----------

/**
 * IPC Handler: Create a new project
 * Prompts user for location, creates vault structure, and opens the project.
 *
 * @param {IpcMainInvokeEvent} event - IPC event
 * @param {Object} params - Parameters
 * @param {string} params.projectName - Name for the new project
 * @returns {Promise<{canceled: boolean, projectPath?: string, projectName?: string}>}
 */
ipcMain.handle("project:new", async (event, { projectName }) => {
  console.log('[Electron] project:new called with:', projectName);
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose a location for your new GameVerse project",
    properties: ["openDirectory", "createDirectory"],
  });
  console.log('[Electron] Dialog result:', result);
  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  const parentDir = result.filePaths[0];
  console.log('[Electron] Parent directory:', parentDir);
  
  try {
    console.log('[Electron] Creating project...');
    const created = vault.createProject(parentDir, projectName);
    console.log('[Electron] Project created:', created);
    console.log('[Electron] Opening project...');
    const opened = vault.openProject(created.projectPath);
    console.log('[Electron] Project opened:', opened);
    currentProject = opened;
    console.log('[Electron] Returning success');
    return {
      canceled: false,
      projectPath: opened.projectPath,
      projectName: opened.projectName,
    };
  } catch (error) {
    console.error("[Electron] Project creation failed:", error);
    throw new Error(`Failed to create project: ${error.message}`);
  }
});

/**
 * IPC Handler: Load an existing project
 * Prompts user to select a project folder and opens it.
 *
 * @returns {Promise<{canceled: boolean, projectPath?: string, projectName?: string}>}
 */
ipcMain.handle("project:load", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select a GameVerse project folder",
    properties: ["openDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  const opened = vault.openProject(result.filePaths[0]);
  currentProject = opened;
  return {
    canceled: false,
    projectPath: opened.projectPath,
    projectName: opened.projectName,
  };
});

/**
 * IPC Handler: Get current project info
 * Returns metadata about the currently loaded project.
 *
 * @returns {{projectPath: string, projectName: string}|null}
 */
ipcMain.handle("project:current", () => {
  if (!currentProject) return null;
  return {
    projectPath: currentProject.projectPath,
    projectName: currentProject.projectName,
  };
});

/**
 * IPC Handler: Close the current project
 * Closes the database connection and clears project state.
 *
 * @returns {boolean} True if closed successfully
 */
ipcMain.handle("project:close", () => {
  if (currentProject && currentProject.db) currentProject.db.close();
  currentProject = null;
  return true;
});

/**
 * IPC Handler: Reveal project folder in file manager
 * Opens the project folder in the system's file explorer.
 */
ipcMain.handle("project:reveal", () => {
  const { projectPath } = requireProject();
  shell.openPath(projectPath);
});

// ---------- Items ----------

/**
 * IPC Handler: List items with optional filters
 *
 * @param {Object} [filters] - Filter options
 * @returns {Object[]} Array of items
 */
ipcMain.handle("items:list", (event, filters) => {
  const { db } = requireProject();
  return itemRepo.listItems(db, filters || {});
});

/**
 * IPC Handler: Get a single item with all data
 *
 * @param {string} id - Item UUID
 * @returns {Object} Item object
 */
ipcMain.handle("items:get", (event, id) => {
  const { db } = requireProject();
  return itemRepo.getItem(db, id);
});

/**
 * IPC Handler: Create a new item
 *
 * @param {Object} payload - Item data
 * @returns {Object} Created item
 */
ipcMain.handle("items:create", (event, payload) => {
  // Validate payload
  if (!payload || typeof payload.name !== "string" || !payload.name.trim()) {
    throw new Error("Invalid payload: name is required");
  }
  const { db } = requireProject();
  console.log("items:create payload:", payload);
  const result = itemRepo.createItem(db, payload);
  console.log("items:create result:", result);
  return result;
});

/**
 * IPC Handler: Update an existing item
 *
 * @param {Object} params - Update parameters
 * @param {string} params.id - Item UUID
 * @param {Object} params.updates - Fields to update
 * @returns {Object} Updated item
 */
ipcMain.handle("items:update", (event, { id, updates }) => {
  const { db } = requireProject();
  return itemRepo.updateItem(db, id, updates);
});

/**
 * IPC Handler: Delete an item
 *
 * @param {string} id - Item UUID
 * @returns {boolean} True if deleted
 */
ipcMain.handle("items:delete", (event, id) => {
  const { db } = requireProject();
  itemRepo.deleteItem(db, id);
  return true;
});

// ---------- Tags ----------

/**
 * IPC Handler: List all tags with usage counts
 *
 * @returns {Object[]} Array of tags
 */
ipcMain.handle("tags:list", () => {
  const { db } = requireProject();
  return itemRepo.listAllTags(db);
});

/**
 * IPC Handler: Add a tag to an item
 *
 * @param {Object} params - Parameters
 * @param {string} params.itemId - Item UUID
 * @param {string} params.tagName - Tag name to add
 * @returns {Object} The tag object
 */
ipcMain.handle("tags:addToItem", (event, { itemId, tagName }) => {
  const { db } = requireProject();
  return itemRepo.addTagToItem(db, itemId, tagName);
});

/**
 * IPC Handler: Remove a tag from an item
 *
 * @param {Object} params - Parameters
 * @param {string} params.itemId - Item UUID
 * @param {string} params.tagId - Tag UUID
 * @returns {boolean} True if removed
 */
ipcMain.handle("tags:removeFromItem", (event, { itemId, tagId }) => {
  const { db } = requireProject();
  itemRepo.removeTagFromItem(db, itemId, tagId);
  return true;
});

// ---------- Notes ----------

/**
 * IPC Handler: Add a notebook entry to an item
 *
 * @param {Object} params - Parameters
 * @param {string} params.itemId - Item UUID
 * @param {Object} params.note - Note data
 * @returns {Object} The created note
 */
ipcMain.handle("notes:add", (event, { itemId, note }) => {
  const { db } = requireProject();
  return itemRepo.addNote(db, itemId, note);
});

/**
 * IPC Handler: Update a notebook entry
 *
 * @param {Object} params - Parameters
 * @param {string} params.noteId - Note UUID
 * @param {Object} params.updates - Fields to update
 * @returns {Object} The updated note
 */
ipcMain.handle("notes:update", (event, { noteId, updates }) => {
  const { db } = requireProject();
  return itemRepo.updateNote(db, noteId, updates);
});

/**
 * IPC Handler: Delete a notebook entry
 *
 * @param {string} noteId - Note UUID
 * @returns {boolean} True if deleted
 */
ipcMain.handle("notes:delete", (event, noteId) => {
  const { db } = requireProject();
  itemRepo.deleteNote(db, noteId);
  return true;
});

// ---------- Links ----------

/**
 * IPC Handler: Create a link between two items
 *
 * @param {Object} params - Parameters
 * @param {string} params.itemAId - First item UUID
 * @param {string} params.itemBId - Second item UUID
 * @param {string} [params.relationship='Connected'] - Relationship label
 * @returns {boolean} True if linked
 */
ipcMain.handle("links:create", (event, { itemAId, itemBId, relationship }) => {
  const { db } = requireProject();
  itemRepo.linkItems(db, itemAId, itemBId, relationship);
  return true;
});

/**
 * IPC Handler: Remove a link between items
 *
 * @param {string} linkId - Link UUID
 * @returns {boolean} True if removed
 */
ipcMain.handle("links:delete", (event, linkId) => {
  const { db } = requireProject();
  itemRepo.unlinkItems(db, linkId);
  return true;
});

// ---------- Files / Import ----------

/**
 * IPC Handler: Import files via file dialog
 * Prompts user to select files and imports them into the vault.
 *
 * @param {Object} params - Parameters
 * @param {string} params.itemId - Item UUID
 * @param {string} params.section - File section (Images, Audio, etc.)
 * @param {string} [params.mode='copy'] - Import mode
 * @returns {Promise<{canceled: boolean, files: Object[]}>}
 */
ipcMain.handle(
  "files:importDialog",
  async (event, { itemId, section, mode }) => {
    const { db, projectPath } = requireProject();
    const item = db.prepare("SELECT * FROM items WHERE id = ?").get(itemId);
    if (!item) throw new Error("Item not found");

    console.log('[Electron] files:importDialog called:', { itemId, section, mode, item });

    const result = await dialog.showOpenDialog(mainWindow, {
      title: `Import ${section}`,
      properties: ["openFile", "multiSelections"],
    });
    if (result.canceled) return { canceled: true, files: [] };

    console.log('[Electron] Files selected:', result.filePaths);

    const imported = [];
    for (const sourcePath of result.filePaths) {
      console.log('[Electron] Importing file:', sourcePath);
      const rec = filesLib.importFile(
        db,
        projectPath,
        item,
        section,
        sourcePath,
        mode || "copy",
      );
      console.log('[Electron] File imported:', rec);
      imported.push(rec);
    }
    console.log('[Electron] Total files imported:', imported.length);
    return { canceled: false, files: imported };
  },
);

/**
 * IPC Handler: Import files from given paths
 * Imports files from specific file paths (e.g., from drag & drop).
 *
 * @param {Object} params - Parameters
 * @param {string} params.itemId - Item UUID
 * @param {string} params.section - File section
 * @param {string[]} params.paths - File paths to import
 * @param {string} [params.mode='copy'] - Import mode
 * @returns {Object[]} Array of imported file records
 */
ipcMain.handle(
  "files:importPaths",
  (event, { itemId, section, paths, mode }) => {
    const { db, projectPath } = requireProject();
    const item = db.prepare("SELECT * FROM items WHERE id = ?").get(itemId);
    if (!item) throw new Error("Item not found");

    const imported = [];
    for (const sourcePath of paths) {
      const rec = filesLib.importFile(
        db,
        projectPath,
        item,
        section,
        sourcePath,
        mode || "copy",
      );
      imported.push(rec);
    }
    return imported;
  },
);

/**
 * IPC Handler: Restore a previous file version
 *
 * @param {string} fileId - File UUID to restore
 * @returns {Object} The restored file record
 */
ipcMain.handle("files:restoreVersion", (event, fileId) => {
  const { db } = requireProject();
  return filesLib.restoreVersion(db, fileId);
});

/**
 * IPC Handler: Delete a file
 *
 * @param {string} fileId - File UUID
 * @returns {boolean} True if deleted
 */
ipcMain.handle("files:delete", (event, fileId) => {
  const { db, projectPath } = requireProject();
  filesLib.deleteFileRecord(db, projectPath, fileId, true);
  return true;
});

/**
 * IPC Handler: Set item thumbnail image
 * Prompts user to select an image file.
 *
 * @param {Object} params - Parameters
 * @param {string} params.itemId - Item UUID
 * @returns {Promise<{canceled: boolean, stored_path?: string}>}
 */
ipcMain.handle("files:setThumbnail", async (event, { itemId }) => {
  const { db, projectPath } = requireProject();
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose thumbnail image",
    properties: ["openFile"],
    filters: [
      { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] },
    ],
  });
  if (result.canceled) return { canceled: true };

  const thumbDir = path.join(projectPath, "Thumbnails");
  if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
  const ext = path.extname(result.filePaths[0]);
  const destName = `${itemId}${ext}`;
  const destPath = path.join(thumbDir, destName);
  fs.copyFileSync(result.filePaths[0], destPath);

  const relPath = path.join("Thumbnails", destName);
  itemRepo.setThumbnail(db, itemId, relPath);
  return { canceled: false, stored_path: relPath };
});

/**
 * IPC Handler: Resolve a stored path to absolute path
 * Converts relative vault paths to absolute filesystem paths.
 *
 * @param {string} storedPath - Relative path in vault
 * @returns {string} Absolute filesystem path
 */
ipcMain.handle("files:resolvePath", (event, storedPath) => {
  const { projectPath } = requireProject();
  console.log('[Electron] files:resolvePath called:', { storedPath, projectPath });
  const resolved = filesLib.resolveStoredPath(projectPath, storedPath);
  console.log('[Electron] Resolved path:', resolved);
  return resolved;
});

ipcMain.handle("files:readAsArrayBuffer", async (event, filePath) => {
  console.log('[Electron] files:readAsArrayBuffer called:', filePath);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const buffer = fs.readFileSync(filePath);
  console.log('[Electron] File read, size:', buffer.length);
  
  // Convert to ArrayBuffer (need to copy the underlying data)
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; i++) {
    view[i] = buffer[i];
  }
  
  return arrayBuffer;
});

// ---------- Search ----------

/**
 * IPC Handler: Perform full-text search
 * Searches across item names, tags, notes, fields, and files.
 *
 * @param {string} query - Search query string
 * @returns {Object[]} Array of matching items
 */
ipcMain.handle("search:query", (event, query) => {
  const { db } = requireProject();
  return search(db, query);
});

// ---------- Collections ----------

/**
 * IPC Handler: List all collections
 *
 * @returns {Object[]} Array of collections
 */
ipcMain.handle("collections:list", () => {
  const { db } = requireProject();
  return itemRepo.listCollections(db);
});

/**
 * IPC Handler: Get a collection with its items
 *
 * @param {string} id - Collection UUID
 * @returns {Object} Collection with items array
 */
ipcMain.handle("collections:get", (event, id) => {
  const { db } = requireProject();
  return itemRepo.getCollection(db, id);
});

/**
 * IPC Handler: Create a new collection
 *
 * @param {Object} params - Parameters
 * @param {string} params.name - Collection name
 * @param {string} [params.description] - Collection description
 * @returns {Object} The created collection
 */
ipcMain.handle("collections:create", (event, { name, description }) => {
  const { db } = requireProject();
  return itemRepo.createCollection(db, name, description);
});

/**
 * IPC Handler: Add an item to a collection
 *
 * @param {Object} params - Parameters
 * @param {string} params.collectionId - Collection UUID
 * @param {string} params.itemId - Item UUID
 * @returns {boolean} True if added
 */
ipcMain.handle("collections:addItem", (event, { collectionId, itemId }) => {
  const { db } = requireProject();
  itemRepo.addItemToCollection(db, collectionId, itemId);
  return true;
});

/**
 * IPC Handler: Remove an item from a collection
 *
 * @param {Object} params - Parameters
 * @param {string} params.collectionId - Collection UUID
 * @param {string} params.itemId - Item UUID
 * @returns {boolean} True if removed
 */
ipcMain.handle("collections:removeItem", (event, { collectionId, itemId }) => {
  const { db } = requireProject();
  itemRepo.removeItemFromCollection(db, collectionId, itemId);
  return true;
});

/**
 * IPC Handler: Delete a collection
 *
 * @param {string} id - Collection UUID
 * @returns {boolean} True if deleted
 */
ipcMain.handle("collections:delete", (event, id) => {
  const { db } = requireProject();
  itemRepo.deleteCollection(db, id);
  return true;
});

// ---------- Templates ----------

/**
 * IPC Handler: List all item templates
 *
 * @returns {Object[]} Array of templates with parsed fields
 */
ipcMain.handle("templates:list", () => {
  const { db } = requireProject();
  return itemRepo.listTemplates(db);
});

/**
 * IPC Handler: Create or update a template
 *
 * @param {Object} params - Parameters
 * @param {string} params.category - Category name
 * @param {Array} params.fields - Field definitions
 * @returns {boolean} True if saved
 */
ipcMain.handle("templates:upsert", (event, { category, fields }) => {
  const { db } = requireProject();
  itemRepo.upsertTemplate(db, category, fields);
  return true;
});

// ---------- World Bible ----------

/**
 * IPC Handler: List world bible pages
 *
 * @param {string} [category] - Optional category filter
 * @returns {Object[]} Array of world bible pages
 */
ipcMain.handle("worldbible:list", (event, category) => {
  const { db } = requireProject();
  return itemRepo.listWorldBiblePages(db, category);
});

/**
 * IPC Handler: Create a world bible page
 *
 * @param {Object} payload - Page data
 * @param {string} payload.category - Page category
 * @param {string} payload.title - Page title
 * @param {string} [payload.linked_item_id] - Optional linked item
 * @param {string} [payload.body] - Page content
 * @returns {Object} The created page
 */
ipcMain.handle("worldbible:create", (event, payload) => {
  const { db } = requireProject();
  return itemRepo.createWorldBiblePage(db, payload);
});

/**
 * IPC Handler: Update a world bible page
 *
 * @param {Object} params - Parameters
 * @param {string} params.id - Page UUID
 * @param {Object} params.updates - Fields to update
 * @returns {Object} The updated page
 */
ipcMain.handle("worldbible:update", (event, { id, updates }) => {
  const { db } = requireProject();
  return itemRepo.updateWorldBiblePage(db, id, updates);
});

/**
 * IPC Handler: Delete a world bible page
 *
 * @param {string} id - Page UUID
 * @returns {boolean} True if deleted
 */
ipcMain.handle("worldbible:delete", (event, id) => {
  const { db } = requireProject();
  itemRepo.deleteWorldBiblePage(db, id);
  return true;
});

// ---------- Export ----------

/**
 * IPC Handler: Export an item to a portable bundle
 * Creates a folder with all files and documentation.
 *
 * @param {string} itemId - Item UUID to export
 * @returns {{fileCount: number}} Export metadata
 */
ipcMain.handle("export:item", (event, itemId) => {
  const { db, projectPath } = requireProject();
  return exportItem(db, projectPath, itemId);
});

/**
 * IPC Handler: Export an item with progress tracking
 * Sends progress events to renderer during export.
 *
 * @param {IpcMainInvokeEvent} event - IPC event
 * @param {string} itemId - Item UUID to export
 * @returns {{fileCount: number}} Export metadata
 */
ipcMain.handle("export:itemWithProgress", (event, itemId) => {
  const { db, projectPath } = requireProject();
  
  return exportItemWithProgress(db, projectPath, itemId, (current, total) => {
    event.sender.send("export:progress", { current, total, itemId });
  });
});

/**
 * IPC Handler: Export a collection as an asset pack
 * Creates a complete asset pack with all items, files, and marketplace metadata.
 *
 * @param {IpcMainInvokeEvent} event - IPC event
 * @param {string} collectionId - Collection UUID to export
 * @returns {{itemCount: number, fileCount: number}} Export metadata
 */
ipcMain.handle("export:collection", (event, collectionId) => {
  const { db, projectPath } = requireProject();
  
  return exportCollection(db, projectPath, collectionId, (current, total, message) => {
    event.sender.send("export:progress", { current, total, message, collectionId });
  });
});

/**
 * IPC Handler: Reveal export folder in file manager
 *
 * @param {string} exportPath - Path to export folder
 */
ipcMain.handle("export:reveal", (event, exportPath) => {
  shell.openPath(exportPath);
});

ipcMain.handle("settings:get", () => {
  return { blenderPath: appSettings.blenderPath };
});

ipcMain.handle("settings:selectBlenderPath", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select Blender executable",
    properties: ["openFile"],
    filters: [
      {
        name: "Blender Executable",
        extensions: process.platform === "win32" ? ["exe"] : ["*"],
      },
    ],
  });
  if (result.canceled || !result.filePaths || !result.filePaths[0]) {
    return { canceled: true };
  }
  appSettings.blenderPath = result.filePaths[0];
  saveAppSettings();
  return { canceled: false, blenderPath: appSettings.blenderPath };
});

function findModelFile(dir) {
  if (!fs.existsSync(dir)) return null;
  const stack = [dir];
  const allowedExt = new Set([
    ".blend",
    ".glb",
    ".gltf",
    ".fbx",
    ".obj",
    ".dae",
    ".usdc",
    ".usd",
    ".usda",
  ]);

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (allowedExt.has(path.extname(entry.name).toLowerCase()))
        return fullPath;
    }
  }
  return null;
}

function findBlenderExecutable() {
  const candidates = [];
  if (appSettings.blenderPath) candidates.push(appSettings.blenderPath);
  if (process.env.BLENDER_PATH) candidates.push(process.env.BLENDER_PATH);
  if (process.platform === "win32") {
    candidates.push("blender.exe");
    candidates.push("blender");
  } else if (process.platform === "darwin") {
    candidates.push("/Applications/Blender.app/Contents/MacOS/Blender");
    candidates.push("blender");
  } else {
    candidates.push("blender");
  }

  for (const candidate of candidates) {
    try {
      const result = spawnSync(candidate, ["--version"], { stdio: "ignore" });
      if (result.status === 0 || result.pid) {
        return candidate;
      }
    } catch (error) {
      continue;
    }
  }
  return null;
}

ipcMain.handle("blender:openItem", async (event, itemId) => {
  const { db, projectPath } = requireProject();
  const exportResult = exportItem(db, projectPath, itemId);
  const modelFile = findModelFile(path.join(exportResult.exportRoot, "Models"));
  if (!modelFile) {
    throw new Error(
      "No exportable 3D model file was found in the exported bundle.",
    );
  }
  const blenderExec = findBlenderExecutable();
  if (!blenderExec) {
    throw new Error(
      "Blender executable not found. Install Blender and ensure it is on PATH, or set BLENDER_PATH.",
    );
  }
  const proc = spawn(blenderExec, [modelFile], {
    detached: true,
    stdio: "ignore",
  });
  proc.unref();
  return { launched: true, blender: blenderExec, modelFile };
});

// ---------- Backup ----------

/**
 * IPC Handler: Create a compressed backup
 * Zips the entire project vault.
 *
 * @returns {Promise<{size: number}>} Backup metadata
 */
ipcMain.handle("backup:create", async () => {
  const { db, projectPath } = requireProject();
  return createBackup(db, projectPath);
});

/**
 * IPC Handler: List all backups
 *
 * @returns {Object[]} Array of backup records
 */
ipcMain.handle("backup:list", () => {
  const { db } = requireProject();
  return db.prepare("SELECT * FROM backups ORDER BY created_at DESC").all();
});

// ---------- Database Maintenance ----------

/**
 * IPC Handler: Rebuild the full-text search index
 * Re-indexes all items, tags, notes, fields, and files.
 *
 * @returns {Object} Result with count of reindexed items
 */
ipcMain.handle("maintenance:rebuildSearchIndex", async () => {
  const { db } = requireProject();
  const { reindexAll } = require("./lib/searchIndex");
  const count = await reindexAll(db);
  return { reindexed: count };
});

/**
 * IPC Handler: Get database statistics
 * Returns counts of various entities in the database.
 *
 * @returns {Object} Database statistics
 */
ipcMain.handle("maintenance:getStats", () => {
  const { db } = requireProject();
  const stats = {
    items: db.prepare("SELECT COUNT(*) as count FROM items").get().count,
    tags: db.prepare("SELECT COUNT(*) as count FROM tags").get().count,
    notes: db.prepare("SELECT COUNT(*) as count FROM notes").get().count,
    files: db.prepare("SELECT COUNT(*) as count FROM files").get().count,
    links: db.prepare("SELECT COUNT(*) as count FROM links").get().count,
    collections: db.prepare("SELECT COUNT(*) as count FROM collections").get().count,
    worldBiblePages: db.prepare("SELECT COUNT(*) as count FROM world_bible_pages").get().count,
    backups: db.prepare("SELECT COUNT(*) as count FROM backups").get().count,
    dbSize: 0,
  };
  
  // Get database file size
  try {
    const fs = require("fs");
    const dbPath = db.prepare("PRAGMA database_list").all()[0].file;
    if (dbPath && fs.existsSync(dbPath)) {
      stats.dbSize = fs.statSync(dbPath).size;
    }
  } catch (e) {
    console.warn("Could not get database size:", e.message);
  }
  
  return stats;
});

/**
 * IPC Handler: Clear application cache
 * Clears any cached data (thumbnails, temp files, etc.)
 *
 * @returns {Object} Result with cleared items count
 */
ipcMain.handle("maintenance:clearCache", async () => {
  const { projectPath } = requireProject();
  const fs = require("fs");
  const path = require("path");
  
  let cleared = 0;
  
  // Clear temp directory if it exists
  const tempDir = path.join(projectPath, "Temp");
  if (fs.existsSync(tempDir)) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      cleared++;
    } catch (e) {
      console.warn("Could not clear Temp directory:", e.message);
    }
  }
  
  return { cleared };
});
