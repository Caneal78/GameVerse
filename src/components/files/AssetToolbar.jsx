/**
 * Asset Toolbar Component
 * 
 * Toolbar with import buttons, view toggle, search, sort, and thumbnail scaling.
 * 
 * @component AssetToolbar
 */

import React from "react";
import SearchBar from "./SearchBar.jsx";
import SortMenu from "./SortMenu.jsx";
import ThumbnailSlider from "./ThumbnailSlider.jsx";
import FavoritesFilter from "./FavoritesFilter.jsx";
import SavedSearches from "./SavedSearches.jsx";

export default function AssetToolbar({
  section,
  importing,
  viewMode,
  onViewModeChange,
  onImportCopy,
  onImportLink,
  onImportDrag,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  thumbnailSize,
  onThumbnailSizeChange,
  showFavoritesOnly,
  onFavoritesToggle,
  favoritesCount,
  savedSearches,
  currentFilters,
  currentSort,
  onLoadSearch,
  onSaveSearch,
  onDeleteSearch
}) {
  return (
    <div
      className={`dropzone ${isDragOver ? "drag-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver && onDragOver();
      }}
      onDragLeave={() => onDragLeave && onDragLeave()}
      onDrop={onDrop}
      style={{
        padding: "16px",
        marginBottom: "16px",
        background: "var(--bg-secondary)",
        borderRadius: "8px",
        border: "2px dashed var(--border-color)",
        transition: "all 0.2s ease",
      }}
    >
      <div style={{ marginBottom: "12px", color: "var(--text-muted)", fontSize: "14px" }}>
        Drag & drop {section.toLowerCase()} files here, or use the buttons below.
      </div>

      <div style={{ display: "flex", gap: "12px", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={onImportCopy}
            disabled={importing}
            style={{
              padding: "8px 16px",
              background: "var(--accent-primary)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: importing ? "not-allowed" : "pointer",
              opacity: importing ? 0.6 : 1,
              fontSize: "13px",
              fontWeight: "500"
            }}
          >
            {importing ? "Importing..." : "Import (Copy)"}
          </button>
          <button
            type="button"
            onClick={onImportLink}
            disabled={importing}
            style={{
              padding: "8px 16px",
              background: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              cursor: importing ? "not-allowed" : "pointer",
              opacity: importing ? 0.6 : 1,
              fontSize: "13px",
              fontWeight: "500"
            }}
          >
            {importing ? "Importing..." : "Import (Link)"}
          </button>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <SearchBar value={searchQuery || ""} onChange={onSearchChange} />
          <SortMenu currentSort={sortOption || "name-asc"} onSortChange={onSortChange} />
          <FavoritesFilter
            isActive={showFavoritesOnly}
            onToggle={onFavoritesToggle}
            count={favoritesCount || 0}
          />
          <SavedSearches
            savedSearches={savedSearches || []}
            currentFilters={currentFilters || {}}
            currentSort={currentSort || "name-asc"}
            onLoadSearch={onLoadSearch}
            onSaveSearch={onSaveSearch}
            onDeleteSearch={onDeleteSearch}
          />
          {viewMode === "grid" && (
            <ThumbnailSlider size={thumbnailSize || 150} onSizeChange={onThumbnailSizeChange} />
          )}
        </div>

        <div style={{ display: "flex", gap: "4px", background: "var(--bg-tertiary)", borderRadius: "4px", padding: "2px" }}>
          <button
            type="button"
            onClick={() => onViewModeChange && onViewModeChange("grid")}
            style={{
              padding: "6px 12px",
              background: viewMode === "grid" ? "var(--accent-primary)" : "transparent",
              color: viewMode === "grid" ? "white" : "var(--text-primary)",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
              fontSize: "13px",
            }}
            title="Grid View"
          >
            ⊞
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange && onViewModeChange("list")}
            style={{
              padding: "6px 12px",
              background: viewMode === "list" ? "var(--accent-primary)" : "transparent",
              color: viewMode === "list" ? "white" : "var(--text-primary)",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
              fontSize: "13px",
            }}
            title="List View"
          >
            ☰
          </button>
        </div>
      </div>
    </div>
  );
}
