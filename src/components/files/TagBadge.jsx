/**
 * Tag Badge Component
 * 
 * Displays a single tag with color and remove button.
 * 
 * @component TagBadge
 */

import React, { memo } from "react";

function TagBadgeComponent({ tag, onRemove, removable = false }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        background: getTagColor(tag.color),
        color: "white",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: 500,
        cursor: removable ? "default" : "pointer",
        transition: "opacity 0.2s ease",
      }}
    >
      <span>{tag.name}</span>
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove && onRemove(tag.id);
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: "14px",
            lineHeight: 1,
            padding: 0,
            display: "flex",
            alignItems: "center",
            opacity: 0.8,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = 1;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = 0.8;
          }}
          title="Remove tag"
        >
          ×
        </button>
      )}
    </div>
  );
}

function getTagColor(colorName) {
  const colorMap = {
    blue: "#3b82f6",
    green: "#10b981",
    orange: "#f97316",
    purple: "#8b5cf6",
    red: "#ef4444",
    gray: "#6b7280",
    yellow: "#eab308",
    pink: "#ec4899",
    cyan: "#06b6d4",
    indigo: "#6366f1",
  };
  return colorMap[colorName] || colorName || "#6b7280";
}

const TagBadge = memo(TagBadgeComponent);

export default TagBadge;
