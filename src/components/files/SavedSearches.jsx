/**
 * Saved Searches Component
 * 
 * Dropdown menu for managing saved search configurations.
 * 
 * @component SavedSearches
 */

import React, { useState, useRef, useEffect } from "react";

export default function SavedSearches({ savedSearches, currentFilters, currentSort, onLoadSearch, onSaveSearch, onDeleteSearch }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [searchName, setSearchName] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowSaveForm(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSave = async () => {
    if (!searchName.trim()) return;

    const filters = {
      searchQuery: currentFilters.searchQuery,
      showFavoritesOnly: currentFilters.showFavoritesOnly,
      tags: currentFilters.tags,
    };

    await onSaveSearch(searchName.trim(), filters, currentSort);
    setSearchName("");
    setShowSaveForm(false);
  };

  const handleLoad = (search) => {
    const filters = JSON.parse(search.filters_json);
    const sortConfig = JSON.parse(search.sort_config_json);
    onLoadSearch(filters, sortConfig);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
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
        <span>💾 Saved Searches</span>
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
            minWidth: "250px",
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          {!showSaveForm ? (
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
                Saved Searches
              </div>

              {savedSearches.length === 0 ? (
                <div
                  style={{
                    padding: "12px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    textAlign: "center",
                  }}
                >
                  No saved searches yet
                </div>
              ) : (
                savedSearches.map((search) => (
                  <div
                    key={search.id}
                    style={{
                      padding: "8px 12px",
                      borderBottom: "1px solid var(--border-color)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleLoad(search)}
                      style={{
                        flex: 1,
                        background: "transparent",
                        color: "var(--text-primary)",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "13px",
                        padding: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg-tertiary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {search.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSearch(search.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "16px",
                        padding: "0 4px",
                      }}
                      title="Delete saved search"
                    >
                      ×
                    </button>
                  </div>
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
                  onClick={() => setShowSaveForm(true)}
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
                  + Save Current Search
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
                  Save current search as
                </div>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Search name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSave();
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
                  }}
                />
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
                    setShowSaveForm(false);
                    setSearchName("");
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
                  onClick={handleSave}
                  disabled={!searchName.trim()}
                  style={{
                    padding: "6px 12px",
                    background: "var(--accent-primary)",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: searchName.trim() ? "pointer" : "not-allowed",
                    opacity: searchName.trim() ? 1 : 0.5,
                    fontSize: "12px",
                  }}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
