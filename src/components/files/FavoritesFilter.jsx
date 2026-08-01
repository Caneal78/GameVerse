/**
 * Favorites Filter Component
 * 
 * Toggle button for filtering by favorited files.
 * 
 * @component FavoritesFilter
 */

import React from "react";

export default function FavoritesFilter({ isActive, onToggle, count = 0 }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        padding: "6px 12px",
        background: isActive ? "var(--accent-primary)" : "var(--bg-tertiary)",
        color: isActive ? "white" : "var(--text-primary)",
        border: "1px solid var(--border-color)",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "13px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        transition: "all 0.2s ease",
      }}
      title={isActive ? "Show all files" : "Show only favorites"}
    >
      <span>{isActive ? "★" : "☆"}</span>
      <span>Favorites</span>
      {count > 0 && (
        <span
          style={{
            background: isActive ? "rgba(255,255,255,0.2)" : "var(--bg-secondary)",
            padding: "2px 6px",
            borderRadius: "8px",
            fontSize: "11px",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
