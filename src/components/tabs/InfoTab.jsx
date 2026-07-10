/**
 * Info Tab Component
 * 
 * Tab for editing basic item info, status, tags, and template fields.
 * 
 * @component InfoTab
 */

import React, { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';

/**
 * Info tab props
 * 
 * @typedef {Object} InfoTabProps
 * @property {Object} item - Item data to edit
 * @property {function} onChange - Callback when item is updated
 */

/**
 * Info tab component
 * 
 * @param {InfoTabProps} props - Component props
 * @returns {React.ReactNode} Rendered tab
 */
export default function InfoTab({ item, onChange }) {
  const { showToast } = useToast();
  const [summary, setSummary] = useState(item.summary || '');
  const [status, setStatus] = useState(item.status);
  const [name, setName] = useState(item.name);
  const [fields, setFields] = useState({});
  const [templateFields, setTemplateFields] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSummary(item.summary || '');
    setStatus(item.status);
    setName(item.name);
    const f = {};
    for (const field of item.fields) f[field.field_key] = field.field_value;
    setFields(f);

    window.gameverse.templates.list().then((templates) => {
      const tpl = templates.find((t) => t.category === item.category);
      setTemplateFields(tpl ? tpl.fields : []);
    });
  }, [item]);

  async function handleSave() {
    setSaving(true);
    try {
      await window.gameverse.items.update(item.id, { name, status, summary, fields });
      showToast('Saved.', 'success');
      onChange && onChange();
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddTag() {
    if (!newTag.trim()) return;
    await window.gameverse.tags.addToItem(item.id, newTag.trim());
    setNewTag('');
    onChange && onChange();
  }

  async function handleRemoveTag(tagId) {
    await window.gameverse.tags.removeFromItem(item.id, tagId);
    onChange && onChange();
  }

  function updateField(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <div className="section-title">Basic Info</div>
      <div className="two-col" style={{ marginBottom: 20 }}>
        <div className="field-group">
          <label>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field-group">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Concept">Concept</option>
            <option value="WIP">WIP</option>
            <option value="Final">Final</option>
          </select>
        </div>
      </div>

      <div className="field-group" style={{ marginBottom: 20 }}>
        <label>Summary</label>
        <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short one-line summary of this item..." />
      </div>

      <div className="section-title">Tags</div>
      <div className="tag-input-row" style={{ marginBottom: 20 }}>
        {item.tags.map((t) => (
          <span key={t.id} className="pill pill-accent" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.name}
            <span style={{ cursor: 'pointer' }} onClick={() => handleRemoveTag(t.id)}>✕</span>
          </span>
        ))}
        <input
          type="text"
          placeholder="Add tag..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
          style={{ width: 140 }}
        />
        <button className="btn btn-sm" onClick={handleAddTag}>+ Add</button>
      </div>

      {templateFields.length > 0 && (
        <>
          <div className="section-title">{item.category} Template Fields</div>
          <div className="two-col" style={{ marginBottom: 20 }}>
            {templateFields.map((f) => (
              <div className="field-group" key={f.key} style={f.type === 'textarea' ? { gridColumn: '1 / -1' } : {}}>
                <label>{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={fields[f.key] || ''}
                    onChange={(e) => updateField(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    type="text"
                    value={fields[f.key] || ''}
                    onChange={(e) => updateField(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? <span className="spinner" /> : 'Save Changes'}
      </button>
    </div>
  );
}
