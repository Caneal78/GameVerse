/**
 * Notebook Tab Component
 * 
 * Tab for managing notebook entries (biographies, lore, etc.)
 * Supports multiple note types and inline editing.
 * 
 * @component NotebookTab
 */

import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { safeIpc } from '../../utils/safeIpc.js';

/**
 * Available notebook entry types
 * @type {string[]}
 */
const NOTE_TYPES = [
  'General', 'Biography', 'Lore', 'Design', 'Modeling', 'Animation',
  'Dialogue', 'Quest', 'AI Prompt', 'Negative Prompt'
];

/**
 * Notebook tab props
 * 
 * @typedef {Object} NotebookTabProps
 * @property {Object} item - Item data
 * @property {function} onChange - Callback when notes are updated
 */

/**
 * Notebook tab component
 * 
 * @param {NotebookTabProps} props - Component props
 * @returns {React.ReactNode} Rendered tab
 */
export default function NotebookTab({ item, onChange }) {
  const { showToast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [noteType, setNoteType] = useState('General');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState('General');
  const [editBody, setEditBody] = useState('');

  async function handleCreate() {
    if (!title.trim()) {
      showToast('Please enter a note title.', 'error');
      return;
    }
    try {
      await safeIpc(
        window.gameverse.notes.add(item.id, { title: title.trim(), note_type: noteType, body }),
        { showToast, errorMessage: 'Failed to create note' },
      );
      setTitle('');
      setBody('');
      setNoteType('General');
      setShowNew(false);
      onChange && onChange();
    } catch {
      // Toast already shown by safeIpc
    }
  }

  function startEdit(note) {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditType(note.note_type);
    setEditBody(note.body);
  }

  async function saveEdit(noteId) {
    try {
      await safeIpc(
        window.gameverse.notes.update(noteId, {
          title: editTitle,
          note_type: editType,
          body: editBody,
        }),
        { showToast, errorMessage: 'Failed to save note' },
      );
      setEditingId(null);
      onChange && onChange();
    } catch {
      // Toast already shown by safeIpc
    }
  }

  async function handleDelete(noteId) {
    if (!confirm('Delete this note?')) return;
    try {
      await safeIpc(window.gameverse.notes.delete(noteId), {
        showToast,
        errorMessage: 'Failed to delete note',
      });
      onChange && onChange();
    } catch {
      // Toast already shown by safeIpc
    }
  }

  return (
    <div>
      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Notebook</span>
        <button className="btn btn-sm btn-primary" onClick={() => setShowNew((v) => !v)}>
          {showNew ? 'Cancel' : '+ New Note'}
        </button>
      </div>

      {showNew && (
        <div className="note-editor card" style={{ padding: 16, marginBottom: 18 }}>
          <div className="two-col">
            <div className="field-group">
              <label>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vance Biography" />
            </div>
            <div className="field-group">
              <label>Type</label>
              <select value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                {NOTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="field-group">
            <label>Content</label>
            <textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write here..." />
          </div>
          <div>
            <button className="btn btn-primary" onClick={handleCreate}>Save Note</button>
          </div>
        </div>
      )}

      {item.notes.length === 0 && !showNew && (
        <div className="empty-state">
          <div>No notebook entries yet.</div>
        </div>
      )}

      {item.notes.map((note) => (
        <div className="note-item" key={note.id}>
          {editingId === note.id ? (
            <div className="note-editor">
              <div className="two-col">
                <div className="field-group">
                  <label>Title</label>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </div>
                <div className="field-group">
                  <label>Type</label>
                  <select value={editType} onChange={(e) => setEditType(e.target.value)}>
                    {NOTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <textarea rows={8} value={editBody} onChange={(e) => setEditBody(e.target.value)} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => saveEdit(note.id)}>Save</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="note-item-header">
                <div>
                  <div className="note-item-title">{note.title}</div>
                  <span className="pill" style={{ marginTop: 4, display: 'inline-block' }}>{note.note_type}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="icon-btn" onClick={() => startEdit(note)} title="Edit">✎</button>
                  <button className="icon-btn" onClick={() => handleDelete(note.id)} title="Delete">🗑</button>
                </div>
              </div>
              <div className="note-item-body">{note.body}</div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
