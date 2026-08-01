/**
 * Search Bar Component
 * 
 * Search input for filtering files by name.
 * 
 * @component SearchBar
 */

import React, { useState } from "react";

export default function SearchBar({ value, onChange, placeholder = "Search files..." }) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        background: "var(--bg-tertiary)",
        borderRadius: "4px",
        border: focused ? "1px solid var(--accent-primary)" : "1px solid var(--border-color)",
        transition: "border-color 0.2s ease",
        flex: 1,
        maxWidth: "400px",
      }}
    >
      <span style={{ fontSize: "16px", color: "var(--text-muted)" }}>🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--text-primary)",
          fontSize: "13px",
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: "16px",
            padding: "0",
            display: "flex",
            alignItems: "center",
          }}
          title="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}
