/**
 * Batch Toolbar Component
 * 
 * Toolbar that appears when files are selected for batch operations.
 * 
 * @component BatchToolbar
 */

import React from "react";
import TagPicker from "./TagPicker.jsx";

export default function BatchToolbar({ 
  selectedCount, 
  onClearSelection,
  onBatchDelete,
  onBatchAddTag,
  onBatchAddToFavorites,
  onBatchRemoveFromFavorites,
  availableTags
}) {
  if (selectedCount === 0) return null;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        padding: "12px 16px",
        background: "var(--accent-primary)",
        color: "white",
        borderRadius: "8px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 500 }}>
        {selectedCount} file{selectedCount !== 1 ? "s" : ""} selected
      </div>
      
      <div style={{ flex: 1, display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onBatchAddToFavorites}
          style={{
            padding: "6px 12px",
            background: "rgba(255, 255, 255, 0.2)",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
          }}
          title="Add to favorites"
        >
          ★ Add to Favorites
        </button>
        
        <button
          type="button"
          onClick={onBatchRemoveFromFavorites}
          style={{
            padding: "6px 12px",
            background: "rgba(255, 255, 255, 0.2)",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
          }}
          title="Remove from favorites"
        >
          ☆ Remove from Favorites
        </button>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <TagPicker
            availableTags={availableTags}
            selectedTags={[]}
            onTagAdd={onBatchAddTag}
            onTagRemove={() => {}}
            onCreateTag={async (name, color) => {
              const newTag = await window.gameverse.assetTags.create(name, color);
              return newTag;
            }}
          />
        </div>
        
        <button
          type="button"
          onClick={onBatchDelete}
          style={{
            padding: "6px 12px",
            background: "rgba(239, 68, 68, 0.8)",
            color: "white",
            border: "1px solid rgba(239, 68, 68, 1)",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "13px",
          }}
          title="Delete selected files"
        >
          🗑 Delete
        </button>
      </div>
      
      <button
        type="button"
        onClick={onClearSelection}
        style={{
          padding: "6px 12px",
          background: "rgba(255, 255, 255, 0.2)",
          color: "white",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "13px",
        }}
      >
        Clear Selection
      </button>
    </div>
  );
}
