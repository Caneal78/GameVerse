/**
 * Files Tab Component
 *
 * Tab for managing item files (images, audio, models, animations, scripts).
 * Supports drag & drop import, version management, and preview.
 *
 * @component FilesTab
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useToast } from "../../context/ToastContext.jsx";
import { toGvfileUrl } from "../../utils/gvfileUrl.js";
import ImageViewer from "../ImageViewer.jsx";
import GlbViewer from "../GlbViewer.jsx";
import ThreeModelViewer from "../viewers/ThreeModelViewer.jsx";
import FbxAnimationViewer from "../viewers/FbxAnimationViewer.jsx";
import GlbAnimationViewer from "../viewers/GlbAnimationViewer.jsx";
import AssetGrid from "../files/AssetGrid.jsx";
import AssetList from "../files/AssetList.jsx";
import AssetToolbar from "../files/AssetToolbar.jsx";
import TagBadge from "../files/TagBadge.jsx";
import TagPicker from "../files/TagPicker.jsx";
import FavoritesFilter from "../files/FavoritesFilter.jsx";
import BatchToolbar from "../files/BatchToolbar.jsx";
import SavedSearches from "../files/SavedSearches.jsx";

/**
 * FilesTab component props
 * 
 * @typedef {Object} FilesTabProps
 * @property {string} itemId - Item ID
 * @property {function} [onFileSelect] - Callback when a file is selected
 */
/**
 * Supported 3D model file extensions
 * @type {string[]}
 */
const MODEL_EXTS = [".glb", ".gltf", ".fbx", ".obj", ".stl", ".blend"];
/**
 * Supported animation file extensions
 * @type {string[]}
 */
const ANIMATION_EXTS = [".glb", ".gltf", ".fbx", ".dae", ".anim", ".bvh"];

/**
 * Supported image file extensions
 * @type {string[]}
 */
const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

/**
 * Supported audio file extensions
 * @type {string[]}
 */
const AUDIO_EXTS = [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".wma"];

/**
 * Get file extension from filename
 *
 * @param {string} name - Filename
 * @returns {string} File extension with dot
 */
function extOf(name) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

/**
 * Files tab props
 *
 * @typedef {Object} FilesTabProps
 * @property {Object} item - Item data
 * @property {string} section - File section (Images, Audio, Models, etc.)
 * @property {function} onChange - Callback when files are updated
 */

/**
 * Files tab component
 *
 * @param {FilesTabProps} props - Component props
 * @returns {React.ReactNode} Rendered tab
 */
export default function FilesTab({ item, section, onChange, onFileSelect }) {
  const { showToast } = useToast();
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [resolvedPaths, setResolvedPaths] = useState({});
  const [selectedReferenceImageId, setSelectedReferenceImageId] =
    useState(null);
  // HDRI toggle for model previews (Free tier off, Pro tier can enable)
  const [useHDRI, setUseHDRI] = useState(false);
  // View mode: 'grid' or 'list'
  const [viewMode, setViewMode] = useState("grid");
  // Search and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("name-asc");
  const [thumbnailSize, setThumbnailSize] = useState(150);
  // Tags and favorites state
  const [availableTags, setAvailableTags] = useState([]);
  const [fileTags, setFileTags] = useState({});
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteFileIds, setFavoriteFileIds] = useState(new Set());
  // Batch operations state
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());
  // Saved searches state
  const [savedSearches, setSavedSearches] = useState([]);

  const handleFileClick = useCallback((file) => {
    if (onFileSelect) {
      onFileSelect(file.id);
    }
  }, [onFileSelect]);

  const handlePreview = useCallback((file) => {
    setPreviewFile(file);
  }, []);

  const [animationState, setAnimationState] = useState("playing");
  const [availableAnimations, setAvailableAnimations] = useState([]);
  const [selectedAnimationName, setSelectedAnimationName] = useState(null);
  const [animationResetKey, setAnimationResetKey] = useState(0);
  const [fbxPlayTime, setFbxPlayTime] = useState(0);
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const modelViewerRef = useRef(null);

  const files = useMemo(
    () => item.files.filter((f) => f.section === section && f.is_current),
    [item.files, section],
  );

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    let result = [...files];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.original_name.toLowerCase().includes(query)
      );
    }

    // Filter by favorites
    if (showFavoritesOnly) {
      result = result.filter(f => favoriteFileIds.has(f.id));
    }

    // Sort by selected option
    const [sortField, sortOrder] = sortOption.split('-');
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.original_name.localeCompare(b.original_name);
          break;
        case 'date':
          comparison = new Date(a.created_at) - new Date(b.created_at);
          break;
        case 'size':
          comparison = (a.file_size || 0) - (b.file_size || 0);
          break;
        case 'type':
          comparison = extOf(a.original_name).localeCompare(extOf(b.original_name));
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [files, searchQuery, sortOption, showFavoritesOnly, favoriteFileIds]);

  const imageFiles = useMemo(
    () => item.files.filter((f) => f.section === "Images" && f.is_current),
    [item.files],
  );
  const modelFiles = useMemo(
    () => item.files.filter((f) => f.section === "Models" && f.is_current),
    [item.files],
  );
  const olderVersions = useMemo(
    () => item.files.filter((f) => f.section === section && !f.is_current),
    [item.files, section],
  );

  useEffect(() => {
    let cancelled = false;
    async function resolveAll() {
      const map = {};
      const allFiles = [
        ...files,
        ...imageFiles,
        ...(section === "Animations" ? modelFiles : []),
      ];
      const seen = new Set();
      for (const f of allFiles) {
        if (seen.has(f.id)) continue;
        seen.add(f.id);
        const resolved = f.is_linked
          ? f.stored_path
          : await window.gameverse.files.resolvePath(f.stored_path);
        map[f.id] = resolved ? resolved.replace(/\\/g, "/") : null;
      }
      if (!cancelled) setResolvedPaths(map);
    }
    resolveAll();
    return () => {
      cancelled = true;
    };
  }, [files, imageFiles, modelFiles, section]);

  useEffect(() => {
    if (!selectedReferenceImageId && imageFiles.length > 0) {
      setSelectedReferenceImageId(imageFiles[0].id);
    }
  }, [imageFiles, selectedReferenceImageId]);

  useEffect(() => {
    if (modelFiles.length === 0) {
      setSelectedModelId(null);
      return;
    }
    if (!selectedModelId || !modelFiles.some((m) => m.id === selectedModelId)) {
      setSelectedModelId(modelFiles[0].id);
    }
  }, [modelFiles, selectedModelId]);

  useEffect(() => {
    if (!previewFile) return;
    setAnimationState("playing");
    setAvailableAnimations([]);
    setSelectedAnimationName(null);
    setAnimationResetKey((k) => k + 1);
    setFbxPlayTime(0);
  }, [previewFile]);

  useEffect(() => {
    const viewer = modelViewerRef.current;
    if (!viewer) return undefined;

    const handleModelLoad = () => {
      const names = Array.from(viewer.availableAnimations || []);
      setAvailableAnimations(names);
      if (!selectedAnimationName && names.length > 0) {
        setSelectedAnimationName(names[0]);
      }
    };

    viewer.addEventListener("load", handleModelLoad);
    return () => viewer.removeEventListener("load", handleModelLoad);
  }, [previewFile, selectedAnimationName]);

  useEffect(() => {
    if (!selectedAnimationName && availableAnimations.length > 0) {
      setSelectedAnimationName(availableAnimations[0]);
    }
  }, [availableAnimations, selectedAnimationName]);

  // Load available tags on mount
  useEffect(() => {
    async function loadTags() {
      try {
        const tags = await window.gameverse.assetTags.list();
        setAvailableTags(tags);
      } catch (err) {
        console.error("Failed to load tags:", err);
      }
    }
    loadTags();
  }, []);

  // Load favorites on mount
  useEffect(() => {
    async function loadFavorites() {
      try {
        const favorites = await window.gameverse.favorites.list();
        const favIds = new Set(favorites.map(f => f.file_id));
        setFavoriteFileIds(favIds);
      } catch (err) {
        console.error("Failed to load favorites:", err);
      }
    }
    loadFavorites();
  }, []);

  // Load tags for current files
  useEffect(() => {
    async function loadFileTags() {
      const tagsMap = {};
      for (const file of files) {
        try {
          const fileTags = await window.gameverse.assetTags.getForFile(file.id);
          tagsMap[file.id] = fileTags;
        } catch (err) {
          console.error(`Failed to load tags for file ${file.id}:`, err);
          tagsMap[file.id] = [];
        }
      }
      setFileTags(tagsMap);
    }
    if (files.length > 0) {
      loadFileTags();
    }
  }, [files]);

  // Load saved searches on mount
  useEffect(() => {
    async function loadSavedSearches() {
      try {
        const searches = await window.gameverse.savedSearches.list();
        setSavedSearches(searches);
      } catch (err) {
        console.error("Failed to load saved searches:", err);
      }
    }
    loadSavedSearches();
  }, []);

  function playAnimation() {
    const viewer = modelViewerRef.current;
    if (viewer) {
      viewer.play();
    }
    setAnimationState("playing");
  }

  function pauseAnimation() {
    const viewer = modelViewerRef.current;
    if (viewer) {
      viewer.pause();
    }
    setAnimationState("paused");
  }

  function stopAnimation() {
    const viewer = modelViewerRef.current;
    if (viewer) {
      viewer.pause();
      viewer.currentTime = 0;
    }
    setAnimationState("stopped");
    setFbxPlayTime(0);
  }

  function resetAnimation() {
    const viewer = modelViewerRef.current;
    if (viewer) {
      viewer.currentTime = 0;
      if (animationState === "playing") {
        viewer.play();
      } else {
        viewer.pause();
      }
    }
    setAnimationResetKey((k) => k + 1);
  }

  async function handleImportDialog(mode = "copy") {
    setImporting(true);
    try {
      const res = await window.gameverse.files.importDialog(
        item.id,
        section,
        mode,
      );
      if (!res.canceled) {
        showToast(`Imported ${res.files.length} file(s).`, "success");
        onChange && onChange();
      }
    } catch (e) {
      showToast(e.message || "Import failed", "error");
    } finally {
      setImporting(false);
    }
  }

  async function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    const paths = droppedFiles
      .map((f) => window.gvGetPathForFile(f))
      .filter(Boolean);

    if (paths.length === 0) {
      showToast("Could not resolve dropped file paths.", "error");
      return;
    }

    setImporting(true);
    try {
      const imported = await window.gameverse.files.importPaths(
        item.id,
        section,
        paths,
        "copy",
      );
      showToast(`Imported ${imported.length} file(s).`, "success");
      onChange && onChange();
    } catch (err) {
      showToast(err.message || "Import failed", "error");
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(fileId) {
    if (!confirm("Delete this file? This cannot be undone.")) return;
    try {
      await window.gameverse.files.delete(fileId);
      onChange && onChange();
    } catch (err) {
      showToast(err.message || "Delete failed", "error");
    }
  }

  async function handleRestore(fileId) {
    try {
      await window.gameverse.files.restoreVersion(fileId);
      showToast("Version restored.", "success");
      onChange && onChange();
    } catch (err) {
      showToast(err.message || "Restore failed", "error");
    }
  }

  // Tag handlers
  async function handleCreateTag(name, color) {
    try {
      const newTag = await window.gameverse.assetTags.create(name, color);
      setAvailableTags(prev => [...prev, newTag]);
      return newTag;
    } catch (err) {
      showToast(err.message || "Failed to create tag", "error");
      return null;
    }
  }

  async function handleAddTagToFile(fileId, tagId) {
    try {
      await window.gameverse.assetTags.addToFile(fileId, tagId);
      // Reload tags for this file
      const updatedTags = await window.gameverse.assetTags.getForFile(fileId);
      setFileTags(prev => ({ ...prev, [fileId]: updatedTags }));
    } catch (err) {
      showToast(err.message || "Failed to add tag", "error");
    }
  }

  async function handleRemoveTagFromFile(fileId, tagId) {
    try {
      await window.gameverse.assetTags.removeFromFile(fileId, tagId);
      // Reload tags for this file
      const updatedTags = await window.gameverse.assetTags.getForFile(fileId);
      setFileTags(prev => ({ ...prev, [fileId]: updatedTags }));
    } catch (err) {
      showToast(err.message || "Failed to remove tag", "error");
    }
  }

  // Favorites handlers
  async function handleToggleFavorite(fileId) {
    try {
      if (favoriteFileIds.has(fileId)) {
        await window.gameverse.favorites.remove(fileId);
        setFavoriteFileIds(prev => {
          const next = new Set(prev);
          next.delete(fileId);
          return next;
        });
        showToast("Removed from favorites", "success");
      } else {
        await window.gameverse.favorites.add(fileId);
        setFavoriteFileIds(prev => new Set(prev).add(fileId));
        showToast("Added to favorites", "success");
      }
    } catch (err) {
      showToast(err.message || "Failed to toggle favorite", "error");
    }
  }

  // Batch operation handlers
  function handleToggleFileSelection(fileId) {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }

  function handleClearSelection() {
    setSelectedFileIds(new Set());
  }

  async function handleBatchDelete() {
    if (!confirm(`Delete ${selectedFileIds.size} file(s)? This cannot be undone.`)) return;

    try {
      for (const fileId of selectedFileIds) {
        await window.gameverse.files.delete(fileId);
      }
      showToast(`Deleted ${selectedFileIds.size} file(s)`, "success");
      setSelectedFileIds(new Set());
      onChange && onChange();
    } catch (err) {
      showToast(err.message || "Batch delete failed", "error");
    }
  }

  async function handleBatchAddToFavorites() {
    try {
      for (const fileId of selectedFileIds) {
        if (!favoriteFileIds.has(fileId)) {
          await window.gameverse.favorites.add(fileId);
        }
      }
      setFavoriteFileIds(prev => new Set([...prev, ...selectedFileIds]));
      showToast(`Added ${selectedFileIds.size} file(s) to favorites`, "success");
    } catch (err) {
      showToast(err.message || "Batch add to favorites failed", "error");
    }
  }

  async function handleBatchRemoveFromFavorites() {
    try {
      for (const fileId of selectedFileIds) {
        if (favoriteFileIds.has(fileId)) {
          await window.gameverse.favorites.remove(fileId);
        }
      }
      setFavoriteFileIds(prev => {
        const next = new Set(prev);
        selectedFileIds.forEach(id => next.delete(id));
        return next;
      });
      showToast(`Removed ${selectedFileIds.size} file(s) from favorites`, "success");
    } catch (err) {
      showToast(err.message || "Batch remove from favorites failed", "error");
    }
  }

  async function handleBatchAddTag(tagId) {
    try {
      for (const fileId of selectedFileIds) {
        await window.gameverse.assetTags.addToFile(fileId, tagId);
      }
      // Reload tags for all selected files
      const tagsMap = { ...fileTags };
      for (const fileId of selectedFileIds) {
        tagsMap[fileId] = await window.gameverse.assetTags.getForFile(fileId);
      }
      setFileTags(tagsMap);
      showToast(`Added tag to ${selectedFileIds.size} file(s)`, "success");
    } catch (err) {
      showToast(err.message || "Batch add tag failed", "error");
    }
  }

  // Saved search handlers
  async function handleSaveSearch(name, filters, sortConfig) {
    try {
      await window.gameverse.savedSearches.create(name, filters, sortConfig);
      const searches = await window.gameverse.savedSearches.list();
      setSavedSearches(searches);
      showToast("Search saved", "success");
    } catch (err) {
      showToast(err.message || "Failed to save search", "error");
    }
  }

  async function handleDeleteSearch(searchId) {
    if (!confirm("Delete this saved search?")) return;
    try {
      await window.gameverse.savedSearches.delete(searchId);
      const searches = await window.gameverse.savedSearches.list();
      setSavedSearches(searches);
      showToast("Search deleted", "success");
    } catch (err) {
      showToast(err.message || "Failed to delete search", "error");
    }
  }

  function handleLoadSearch(filters, sortConfig) {
    setSearchQuery(filters.searchQuery || "");
    setShowFavoritesOnly(filters.showFavoritesOnly || false);
    setSortOption(sortConfig || "name-asc");
  }

  function renderSelectedReferenceImagePanel() {
    const selectedImage = imageFiles.find((img) => img.id === selectedReferenceImageId);
    const selectedSrc = selectedImage && resolvedPaths[selectedImage.id]
      ? toGvfileUrl(resolvedPaths[selectedImage.id])
      : null;

    return (
      <div className="preview-image-panel">
        <div className="preview-image-main">
          {selectedSrc ? (
            <img
              src={selectedSrc}
              alt={selectedImage.original_name}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <div className="empty-state">No reference image available.</div>
          )}
        </div>
        <div className="preview-image-list">
          {imageFiles.map((image) => {
            const imageSrc = resolvedPaths[image.id]
              ? toGvfileUrl(resolvedPaths[image.id])
              : null;
            return (
              <button
                key={image.id}
                type="button"
                className="preview-image-thumb"
                onClick={() => setSelectedReferenceImageId(image.id)}
              >
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={image.original_name}
                    onError={(e) => {
                      console.error('Reference thumbnail error:', image.original_name);
                      e.target.style.display = 'none';
                    }}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span>{image.original_name.slice(0, 2).toUpperCase()}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderSelectedModelPanel() {
    const selectedModel =
      modelFiles.find((model) => model.id === selectedModelId) || modelFiles[0];
    if (!selectedModel) {
      return (
        <div className="preview-model">
          <div className="empty-state" style={{ margin: "auto" }}>
            Add a 3D model in the Models tab to preview it here.
          </div>
        </div>
      );
    }

    const modelSrc = resolvedPaths[selectedModel.id]
      ? toGvfileUrl(resolvedPaths[selectedModel.id])
      : null;
    if (!modelSrc) {
      return (
        <div className="preview-model">
          <div className="empty-state" style={{ margin: "auto" }}>
            Selected model could not be resolved.
          </div>
        </div>
      );
    }

    return renderModelPreview(modelSrc, extOf(selectedModel.original_name));
  }

  function handleChooseReferenceModel(modelId) {
    setSelectedModelId(modelId);
    setShowModelPicker(false);
  }

  function renderModelPreview(src, ext, useHDRI) {
    console.log('[FilesTab] renderModelPreview called:', { src, ext, useHDRI });

    if (ext === ".glb" || ext === ".gltf") {
      console.log('[FilesTab] Rendering GlbViewer with src:', src);
      return (
        <div className="preview-model">
          <GlbViewer src={src} onClose={() => setPreviewFile(null)} />
        </div>
      );
    }

    if (ext === ".fbx") {
      return (
        <div className="preview-model">
          <div className="empty-state" style={{ margin: "auto" }}>
            FBX model preview is not rendered inline yet. Use Reveal to open it
            externally.
          </div>
        </div>
      );
    }

    return (
      <div className="preview-model">
        <div className="empty-state" style={{ margin: "auto" }}>
          No inline model preview available for this file type.
        </div>
      </div>
    );
  }

  function renderAnimationPreview(src, ext, useHDRI) {
    if (ext === ".glb" || ext === ".gltf") {
      return (
        <div className="preview-model">
          <GlbViewer src={src} onClose={() => setPreviewFile(null)} />
        </div>
      );
    }

    if (ext === ".fbx") {
      return (
        <div className="preview-model">
          <div className="empty-state" style={{ margin: "auto" }}>
            FBX animation preview is not supported yet. Use Reveal to open it externally.
          </div>
        </div>
      );
    }

    return (
      <div className="preview-model">
        <div className="empty-state" style={{ margin: "auto" }}>
          No inline animation preview available for this file type ({ext || "unknown"}).
        </div>
      </div>
    );
  }

  return (
    <div>
      <AssetToolbar
        section={section}
        importing={importing}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onImportCopy={() => handleImportDialog("copy")}
        onImportLink={() => handleImportDialog("link")}
        onImportDrag={handleDrop}
        isDragOver={dragOver}
        onDragOver={() => setDragOver(true)}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortOption={sortOption}
        onSortChange={setSortOption}
        thumbnailSize={thumbnailSize}
        onThumbnailSizeChange={setThumbnailSize}
        showFavoritesOnly={showFavoritesOnly}
        onFavoritesToggle={() => setShowFavoritesOnly(prev => !prev)}
        favoritesCount={files.filter(f => favoriteFileIds.has(f.id)).length}
        savedSearches={savedSearches}
        currentFilters={{ searchQuery, showFavoritesOnly }}
        currentSort={sortOption}
        onLoadSearch={handleLoadSearch}
        onSaveSearch={handleSaveSearch}
        onDeleteSearch={handleDeleteSearch}
      />

      <BatchToolbar
        selectedCount={selectedFileIds.size}
        onClearSelection={handleClearSelection}
        onBatchDelete={handleBatchDelete}
        onBatchAddTag={handleBatchAddTag}
        onBatchAddToFavorites={handleBatchAddToFavorites}
        onBatchRemoveFromFavorites={handleBatchRemoveFromFavorites}
        availableTags={availableTags}
      />

      {filteredAndSortedFiles.length === 0 ? (
        <div className="empty-state">
          <div>
            {files.length === 0
              ? `No ${section.toLowerCase()} yet.`
              : `No files match "${searchQuery}".`}
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <AssetGrid
          files={filteredAndSortedFiles}
          resolvedPaths={resolvedPaths}
          section={section}
          onFileClick={handleFileClick}
          onPreview={handlePreview}
          thumbnailSize={thumbnailSize}
          fileTags={fileTags}
          favoriteFileIds={favoriteFileIds}
          onToggleFavorite={handleToggleFavorite}
          selectedFileIds={selectedFileIds}
          onToggleSelection={handleToggleFileSelection}
        />
      ) : (
        <AssetList
          files={filteredAndSortedFiles}
          section={section}
          onFileClick={handleFileClick}
          onPreview={handlePreview}
        />
      )}

      {olderVersions.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 26 }}>
            Older Versions
          </div>
          {olderVersions.map((file) => (
            <div className="list-row" key={file.id}>
              <div>
                <strong>{file.original_name}</strong>{" "}
                <span className="pill">v{file.version}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-sm"
                  onClick={() => handleRestore(file.id)}
                >
                  Restore This Version
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(file.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {previewFile && (
        <div className="modal-overlay" onClick={() => setPreviewFile(null)}>
          <div
            className="modal"
            style={{ width: "90vw", height: "82vh", maxWidth: 1200 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{previewFile.original_name}</h3>
              <button className="icon-btn" onClick={() => setPreviewFile(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ flex: 1, padding: 0, height: '100%', overflow: 'hidden' }}>
              {(() => {
                const ext = extOf(previewFile.original_name);
                const src = toGvfileUrl(resolvedPaths[previewFile.id]);
                console.log('[FilesTab] Modal preview for:', previewFile.original_name, 'ext:', ext, 'section:', section, 'src:', src);
                if (IMAGE_EXTS.includes(ext)) {
                  return (
                    <ImageViewer
                      src={src}
                      alt={previewFile.original_name}
                      onClose={() => setPreviewFile(null)}
                    />
                  );
                }
                if (AUDIO_EXTS.includes(ext)) {
                  return (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      padding: '40px',
                      background: '#222'
                    }}>
                      <div style={{ marginBottom: '20px', color: '#fff', fontSize: '18px' }}>
                        {previewFile.original_name}
                      </div>
                      <audio
                        controls
                        style={{ width: '100%', maxWidth: '600px' }}
                        src={src}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  );
                }
                if (section === "Models") {
                  console.log('[FilesTab] Rendering model preview in modal, ext:', ext, 'src:', src);
                  if (ext === ".glb" || ext === ".gltf") {
                    return (
                      <div className="preview-split" style={{ display: 'flex', flexDirection: 'row', height: '100%', gap: '10px' }}>
                        <div style={{ flex: 2, height: '100%', minHeight: '400px' }}>
                          <GlbViewer src={src} onClose={() => setPreviewFile(null)} />
                        </div>
                        <div style={{ flex: 1, height: '100%', minWidth: '300px' }}>
                          {renderSelectedReferenceImagePanel()}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="preview-split">
                      {renderModelPreview(src, ext, useHDRI)}
                      {renderSelectedReferenceImagePanel()}
                    </div>
                  );
                }
                if (section === "Animations") {
                  return (
                    <div className="preview-split">
                      {renderAnimationPreview(src, ext, useHDRI)}
                      {renderSelectedModelPanel()}
                    </div>
                  );
                }
                return (
                  <div className="empty-state">
                    No inline preview available for this file type (
                    {ext || "unknown"}). Use Reveal in Finder/Explorer to open
                    externally.
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {showModelPicker && (
        <div className="modal-overlay" onClick={() => setShowModelPicker(false)}>
          <div
            className="modal"
            style={{ width: 720, maxWidth: "92vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Select Reference Model</h3>
              <button
                className="icon-btn"
                onClick={() => setShowModelPicker(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ display: "grid", gap: 10 }}>
              {modelFiles.length === 0 ? (
                <div className="empty-state">
                  No model files found yet. Add a GLB, GLTF, FBX, OBJ, or STL
                  in the Models tab first.
                </div>
              ) : (
                modelFiles.map((model) => {
                  const active = model.id === selectedModelId;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      className="list-row"
                      onClick={() => handleChooseReferenceModel(model.id)}
                      style={{
                        width: "100%",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <div>
                        <strong>{model.original_name}</strong>
                        <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                          {model.section} · v{model.version}
                        </div>
                      </div>
                      <span className="pill">{active ? "Selected" : "Use"}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function sectionIcon(section) {
  const map = {
    Models: "🧊",
    Animations: "🏃",
    Scripts: "📜",
    Audio: "🔊",
    Images: "🖼️",
  };
  return map[section] || "📄";
}
