/**
 * Tag Picker Component
 * 
 * Dropdown for selecting existing tags or creating new ones.
 * 
 * @component TagPicker
 */

import React, { useState, useRef, useEffect } from "react";
import TagBadge from "./TagBadge.jsx";

const TAG_COLORS = [
  { name: "blue", value: "#3b82f6" },
  { name: "green", value: "#10b981" },
  { name: "orange", value: "#f97316" },
  { name: "purple", value: "#8b5cf6" },
  { name: "red", value: "#ef4444" },
  { name: "gray", value: "#6b7280" },
  { name: "yellow", value: "#eab308" },
  { name: "pink", value: "#ec4899" },
  { name: "cyan", value: "#06b6d4" },
  { name: "indigo", value: "#6366f1" },
];

export default function TagPicker({ availableTags, selectedTags, onTagAdd, onTagRemove, onCreateTag }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const newTag = await onCreateTag(newTagName.trim(), selectedColor);
    if (newTag) {
      onTagAdd(newTag.id);
      setNewTagName("");
      setShowCreateForm(false);
    }
  };

  const unselectedTags = availableTags.filter(tag => !selectedTags.some(st => st.id === tag.id));

  return (
    <div ref={pickerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "6px 12px",
          background: "var(--bg-tertiary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-color)",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span>+ Add Tag</span>
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
            minWidth: "220px",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {!showCreateForm ? (
            <>
              <div
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--border-color)",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                }}
              >
                Select a tag
              </div>

              {unselectedTags.length === 0 ? (
                <div
                  style={{
                    padding: "12px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    textAlign: "center",
                  }}
                >
                  No more tags available
                </div>
              ) : (
                unselectedTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      onTagAdd(tag.id);
                      setIsOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "transparent",
                      color: "var(--text-primary)",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--bg-tertiary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: getTagColor(tag.color),
                      }}
                    />
                    {tag.name}
                  </button>
                ))
              )}

              <div
                style={{
                  padding: "8px 12px",
                  borderTop: "1px solid var(--border-color)",
                  marginTop: "4px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  style={{
                    width: "100%",
                    padding: "6px 12px",
                    background: "var(--accent-primary)",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "500"
                  }}
                >
                  + Create New Tag
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  padding: "12px",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                  Create new tag
                </div>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Tag name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTag();
                    }
                  }}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    outline: "none",
                    marginBottom: "8px",
                  }}
                />
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>
                  Color:
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setSelectedColor(color.name)}
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: color.value,
                        border: selectedColor === color.name ? "2px solid white" : "2px solid transparent",
                        cursor: "pointer",
                        padding: 0,
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div
                style={{
                  padding: "8px 12px",
                  display: "flex",
                  gap: "8px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTagName("");
                  }}
                  style={{
                    padding: "6px 12px",
                    background: "var(--bg-tertiary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  style={{
                    padding: "6px 12px",
                    background: "var(--accent-primary)",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: newTagName.trim() ? "pointer" : "not-allowed",
                    opacity: newTagName.trim() ? 1 : 0.5,
                    fontSize: "12px",
                  }}
                >
                  Create
                </button>
              </div>
            </>
          )}
        </div>
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
