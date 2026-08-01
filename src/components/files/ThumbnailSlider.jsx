/**
 * Thumbnail Slider Component
 * 
 * Slider control for adjusting thumbnail/card sizes in grid view.
 * 
 * @component ThumbnailSlider
 */

import React from "react";

export default function ThumbnailSlider({ size, onSizeChange }) {
  const SIZES = [
    { value: 100, label: "Small" },
    { value: 150, label: "Medium" },
    { value: 200, label: "Large" },
    { value: 250, label: "Extra Large" },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "8px 16px",
        background: "var(--bg-tertiary)",
        borderRadius: "4px",
        border: "1px solid var(--border-color)",
      }}
    >
      <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: "500" }}>
        Size:
      </span>
      <input
        type="range"
        min="100"
        max="250"
        step="50"
        value={size}
        onChange={(e) => onSizeChange(parseInt(e.target.value, 10))}
        style={{
          flex: 1,
          cursor: "pointer",
          accentColor: "var(--accent-primary)",
        }}
      />
      <span style={{ fontSize: "12px", color: "var(--text-muted)", minWidth: "60px" }}>
        {SIZES.find(s => s.value === size)?.label || "Medium"}
      </span>
    </div>
  );
}
