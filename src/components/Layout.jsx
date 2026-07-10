/**
 * Layout Component
 * 
 * Main application layout with sidebar navigation and main content area.
 * Provides category filtering, search, and project management actions.
 * 
 * @component Layout
 */

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/layout.css';

const CATEGORIES = [
  'Character', 'Creature', 'Vehicle', 'Location', 'Building', 'Prop',
  'Weapon', 'Material', 'Faction', 'Quest', 'Animation', 'Script', 'Item'
];

/**
 * Layout component props
 * 
 * @typedef {Object} LayoutProps
 * @property {React.ReactNode} children - Main content to render
 * @property {string|null} [activeCategory] - Currently selected category filter
 * @property {function} [onCategoryChange] - Callback when category changes
 */

/**
 * Main layout component
 * 
 * @param {LayoutProps} props - Component props
 * @returns {React.ReactNode} Rendered layout
 */
export default function Layout({ children, activeCategory, onCategoryChange }) {
  const { project, closeProject } = useProject();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  async function handleBackup() {
    try {
      const res = await window.gameverse.backup.create();
      showToast(`Backup created (${(res.size / 1024 / 1024).toFixed(2)} MB)`, 'success');
    } catch (e) {
      showToast(e.message || 'Backup failed', 'error');
    }
  }

  async function handleReveal() {
    await window.gameverse.project.reveal();
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">GV</div>
          <div>
            <div className="sidebar-project-name">{project?.projectName}</div>
            <div className="sidebar-project-label">GameVerse Project</div>
          </div>
        </div>

        <form className="sidebar-search" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            placeholder="Search everything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <nav className="sidebar-nav">
          <NavLink to="/" end className="sidebar-link">
            🗂️ Dashboard
          </NavLink>
          <NavLink to="/worldbible" className="sidebar-link">
            📖 World Bible
          </NavLink>
          <NavLink to="/collections" className="sidebar-link">
            🧩 Collections
          </NavLink>
          <NavLink to="/settings" className="sidebar-link">
            ⚙️ Templates & Settings
          </NavLink>
        </nav>

        {onCategoryChange && (
          <div className="sidebar-categories">
            <div className="sidebar-section-label">Categories</div>
            <button
              className={`sidebar-cat ${!activeCategory ? 'active' : ''}`}
              onClick={() => onCategoryChange(null)}
            >
              All Items
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`sidebar-cat ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => onCategoryChange(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="sidebar-footer">
          <button className="btn btn-ghost btn-sm" onClick={handleBackup} title="Backup project">
            💾 Backup
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleReveal} title="Open project folder">
            📁 Reveal
          </button>
          <button className="btn btn-ghost btn-sm" onClick={closeProject} title="Close project">
            ⏏ Close
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
