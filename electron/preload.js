/**
 * GameVerse Preload Script
 *
 * Exposes a safe API to the renderer process via contextBridge.
 * All IPC communication goes through this API surface.
 *
 * @module preload
 */

const { contextBridge, ipcRenderer, webUtils } = require("electron");

/**
 * Get the filesystem path from a File object
 * Used for drag-and-drop file imports.
 *
 * @param {File} file - File object from drag & drop
 * @returns {string|null} Filesystem path or null
 */
  contextBridge.exposeInMainWorld("gvGetPathForFile", (file) => {
    // Use Electron's webUtils to securely obtain the absolute path
    const path = file && webUtils.getPathForFile(file);
    return path || null;
  });

/**
 * Main GameVerse API exposed to renderer process
 * Provides access to all backend functionality via IPC.
 *
 * @namespace window.gameverse
 */
contextBridge.exposeInMainWorld("gameverse", {
  project: {
    new: (projectName) => ipcRenderer.invoke("project:new", { projectName }),
    load: () => ipcRenderer.invoke("project:load"),
    current: () => ipcRenderer.invoke("project:current"),
    close: () => ipcRenderer.invoke("project:close"),
    reveal: () => ipcRenderer.invoke("project:reveal"),
  },
  items: {
    list: (filters) => ipcRenderer.invoke("items:list", filters),
    get: (id) => ipcRenderer.invoke("items:get", id),
    create: (payload) => ipcRenderer.invoke("items:create", payload),
    update: (id, updates) =>
      ipcRenderer.invoke("items:update", { id, updates }),
    delete: (id) => ipcRenderer.invoke("items:delete", id),
  },
  tags: {
    list: () => ipcRenderer.invoke("tags:list"),
    addToItem: (itemId, tagName) =>
      ipcRenderer.invoke("tags:addToItem", { itemId, tagName }),
    removeFromItem: (itemId, tagId) =>
      ipcRenderer.invoke("tags:removeFromItem", { itemId, tagId }),
  },
  notes: {
    add: (itemId, note) => ipcRenderer.invoke("notes:add", { itemId, note }),
    update: (noteId, updates) =>
      ipcRenderer.invoke("notes:update", { noteId, updates }),
    delete: (noteId) => ipcRenderer.invoke("notes:delete", noteId),
  },
  links: {
    create: (itemAId, itemBId, relationship) =>
      ipcRenderer.invoke("links:create", { itemAId, itemBId, relationship }),
    delete: (linkId) => ipcRenderer.invoke("links:delete", linkId),
  },
  files: {
    importDialog: (itemId, section, mode) =>
      ipcRenderer.invoke("files:importDialog", { itemId, section, mode }),
    importPaths: (itemId, section, paths, mode) =>
      ipcRenderer.invoke("files:importPaths", { itemId, section, paths, mode }),
    restoreVersion: (fileId) =>
      ipcRenderer.invoke("files:restoreVersion", fileId),
    delete: (fileId) => ipcRenderer.invoke("files:delete", fileId),
    setThumbnail: (itemId) =>
      ipcRenderer.invoke("files:setThumbnail", { itemId }),
    resolvePath: (storedPath) =>
      ipcRenderer.invoke("files:resolvePath", storedPath),
    readAsArrayBuffer: (filePath) =>
      ipcRenderer.invoke("files:readAsArrayBuffer", filePath),
  },
  search: {
    query: (q) => ipcRenderer.invoke("search:query", q),
  },
  collections: {
    list: () => ipcRenderer.invoke("collections:list"),
    get: (id) => ipcRenderer.invoke("collections:get", id),
    create: (name, description) =>
      ipcRenderer.invoke("collections:create", { name, description }),
    addItem: (collectionId, itemId) =>
      ipcRenderer.invoke("collections:addItem", { collectionId, itemId }),
    removeItem: (collectionId, itemId) =>
      ipcRenderer.invoke("collections:removeItem", { collectionId, itemId }),
    delete: (id) => ipcRenderer.invoke("collections:delete", id),
  },
  templates: {
    list: () => ipcRenderer.invoke("templates:list"),
    upsert: (category, fields) =>
      ipcRenderer.invoke("templates:upsert", { category, fields }),
  },
  worldBible: {
    list: (category) => ipcRenderer.invoke("worldbible:list", category),
    create: (payload) => ipcRenderer.invoke("worldbible:create", payload),
    update: (id, updates) =>
      ipcRenderer.invoke("worldbible:update", { id, updates }),
    delete: (id) => ipcRenderer.invoke("worldbible:delete", id),
  },
  exportItem: {
    run: (itemId) => ipcRenderer.invoke("export:item", itemId),
    runWithProgress: (itemId, onProgress) => {
      // Remove old listener if exists
      const listener = (event, data) => {
        if (data.itemId === itemId) {
          onProgress(data.current, data.total);
        }
      };
      ipcRenderer.on("export:progress", listener);
      
      // Call the export
      const promise = ipcRenderer.invoke("export:itemWithProgress", itemId);
      
      // Clean up listener after completion
      promise.finally(() => {
        ipcRenderer.removeListener("export:progress", listener);
      });
      
      return promise;
    },
    reveal: (exportPath) => ipcRenderer.invoke("export:reveal", exportPath),
  },
  blender: {
    openItem: (itemId) => ipcRenderer.invoke("blender:openItem", itemId),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    selectBlenderPath: () => ipcRenderer.invoke("settings:selectBlenderPath"),
  },
  backup: {
    create: () => ipcRenderer.invoke("backup:create"),
    list: () => ipcRenderer.invoke("backup:list"),
  },
  maintenance: {
    rebuildSearchIndex: () => ipcRenderer.invoke("maintenance:rebuildSearchIndex"),
    getStats: () => ipcRenderer.invoke("maintenance:getStats"),
    clearCache: () => ipcRenderer.invoke("maintenance:clearCache"),
  },
  assets: {
    import: ({ name, type, sourcePath }) => ipcRenderer.invoke('assets:import', { name, type, sourcePath })
  },
});
