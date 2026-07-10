/**
 * Links Tab Component
 * 
 * Tab for managing connections between items.
 * Supports bidirectional links with custom relationship labels.
 * 
 * @component LinksTab
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext.jsx';
import { safeIpc } from '../../utils/safeIpc.js';

/**
 * Available relationship types for item connections
 * @type {string[]}
 */
const RELATIONSHIPS = [
  'Connected', 'Companion Of', 'Located In', 'Owned By', 'Enemy Of',
  'Ally Of', 'Member Of', 'Contains', 'Uses'
];

/**
 * Links tab props
 * 
 * @typedef {Object} LinksTabProps
 * @property {Object} item - Item data
 * @property {function} onChange - Callback when links are updated
 */

/**
 * Links tab component
 * 
 * @param {LinksTabProps} props - Component props
 * @returns {React.ReactNode} Rendered tab
 */
export default function LinksTab({ item, onChange }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [allItems, setAllItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [relationship, setRelationship] = useState('Connected');

  useEffect(() => {
    let cancelled = false;
    window.gameverse.items
      .list({})
      .then((list) => {
        if (!cancelled) {
          setAllItems(list.filter((i) => i.id !== item.id));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          showToast(error.message || 'Failed to load items', 'error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [item.id, showToast]);

  async function handleLink() {
    if (!selectedItemId) {
      showToast('Choose an item to connect.', 'error');
      return;
    }
    try {
      await safeIpc(
        window.gameverse.links.create(item.id, selectedItemId, relationship),
        { showToast, errorMessage: 'Failed to create link' },
      );
      setSelectedItemId('');
      onChange && onChange();
    } catch {
      // Toast already shown by safeIpc
    }
  }

  async function handleUnlink(linkId) {
    try {
      await safeIpc(window.gameverse.links.delete(linkId), {
        showToast,
        errorMessage: 'Failed to remove link',
      });
      onChange && onChange();
    } catch {
      // Toast already shown by safeIpc
    }
  }

  return (
    <div>
      <div className="section-title">Connect to Another Item</div>
      <div className="two-col" style={{ marginBottom: 12 }}>
        <div className="field-group">
          <label>Item</label>
          <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
            <option value="">Select an item...</option>
            {allItems.map((i) => (
              <option key={i.id} value={i.id}>{i.name} ({i.category})</option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label>Relationship</label>
          <select value={relationship} onChange={(e) => setRelationship(e.target.value)}>
            {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <button className="btn btn-primary" onClick={handleLink} style={{ marginBottom: 24 }}>
        + Add Connection
      </button>

      <div className="section-title">Connected Items ({item.links.length})</div>
      {item.links.length === 0 ? (
        <div className="empty-state"><div>No connections yet.</div></div>
      ) : (
        item.links.map((link) => (
          <div className="list-row" key={link.link_id}>
            <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/item/${link.item.id}`)}>
              <strong>{link.item.name}</strong>{' '}
              <span className="pill">{link.item.category}</span>{' '}
              <span className="pill pill-accent">{link.relationship}</span>
            </div>
            <button className="btn btn-sm btn-danger" onClick={() => handleUnlink(link.link_id)}>Remove</button>
          </div>
        ))
      )}
    </div>
  );
}
