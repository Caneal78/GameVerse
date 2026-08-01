/**
 * Sort Menu Component
 * 
 * Dropdown menu for sorting files by various criteria.
 * 
 * @component SortMenu
 */

import React, { useState, useRef, useEffect } from "react";

const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "date-asc", label: "Date (Oldest)" },
  { value: "date-desc", label: "Date (Newest)" },
  { value: "size-asc", label: "Size (Smallest)" },
  { value: "size-desc", label: "Size (Largest)" },
  { value: "type-asc", label: "Type (A-Z)" },
  { value: "type-desc", label: "Type (Z-A)" },
];

export default function SortMenu({ currentSort, onSortChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const currentLabel = SORT_OPTIONS.find(opt => opt.value === currentSort)?.label || "Sort";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "8px 16px",
          background: "var(--bg-tertiary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-color)",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: "500",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span>Sort: {currentLabel}</span>
        <span style={{ fontSize: "10px" }}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "4px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "4px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            zIndex: 1000,
            minWidth: "180px",
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSortChange(option.value);
                setIsOpen(false);
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: currentSort === option.value ? "var(--accent-primary)" : "transparent",
                color: currentSort === option.value ? "white" : "var(--text-primary)",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "13px",
              }}
              onMouseEnter={(e) => {
                if (currentSort !== option.value) {
                  e.currentTarget.style.background = "var(--bg-tertiary)";
                }
              }}
              onMouseLeave={(e) => {
                if (currentSort !== option.value) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
