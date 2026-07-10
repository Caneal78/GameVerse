/**
 * Create Item Modal Component
 * 
 * Modal dialog for creating new items with name, category,
 * status, and initial tags.
 * 
 * @component CreateItemModal
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext.jsx';

/**
 * All available item categories
 * @type {string[]}
 */
const ALL_CATEGORIES = [
  'Character', 'Creature', 'Vehicle', 'Location', 'Building', 'Prop',
  'Weapon', 'Material', 'Faction', 'Quest', 'Animation', 'Script', 'Item'
];

/**
 * Create item modal props
 * 
 * @typedef {Object} CreateItemModalProps
 * @property {string} [defaultCategory] - Pre-selected category
 * @property {function} onClose - Callback when modal is closed
 * @property {function} onCreated - Callback when item is created
 */

/**
 * Create item modal component
 * 
 * @param {CreateItemModalProps} props - Component props
 * @returns {React.ReactNode} Rendered modal
 */
export default function CreateItemModal({ defaultCategory, onClose, onCreated }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [category, setCategory] = useState(defaultCategory || 'Character');
  const [status, setStatus] = useState('Concept');
  const [tagsText, setTagsText] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      showToast('Please enter a name.', 'error');
      return;
    }
    setBusy(true);
    try {
      const tags = tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const item = await window.gameverse.items.create({
        name: name.trim(),
        category,
        status,
        tags
      });
      showToast(`${category} "${item.name}" created.`, 'success');
      onCreated && onCreated(item);
      onClose();
      navigate(`/item/${item.id}`);
    } catch (e) {
      showToast(e.message || 'Failed to create item', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Item</h3>
        </div>
        <div className="modal-body">
          <div className="field-group">
            <label>Name</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vance"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div className="field-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Concept">Concept</option>
              <option value="WIP">WIP</option>
              <option value="Final">Final</option>
            </select>
          </div>
          <div className="field-group">
            <label>Tags (comma separated)</label>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="Hero, Human, Playable"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={busy}>
            {busy ? <span className="spinner" /> : 'Create Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
