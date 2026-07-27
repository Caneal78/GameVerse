/**
 * Notebook Tab Component
 * 
 * Tab for managing notebook entries (biographies, lore, etc.)
 * Supports multiple note types and inline editing.
 * 
 * @component NotebookTab
 */

import React, { useState, useEffect, useRef } from 'react';
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
  const [isDirty, setIsDirty] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const autosaveTimerRef = useRef(null);
  const originalNoteRef = useRef(null);

  // Autosave with debounce (2 seconds)
  useEffect(() => {
    if (!isDirty || !editingId) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      setIsAutosaving(true);
      try {
        await safeIpc(
          globalThis.gameverse?.notes.update(editingId, {
            title: editTitle,
            note_type: editType,
            body: editBody,
          }),
          { showToast, errorMessage: 'Autosave failed' },
        );
        setIsDirty(false);
        onChange?.();
      } catch {
        // Toast already shown by safeIpc
      } finally {
        setIsAutosaving(false);
      }
    }, 2000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [isDirty, editingId, editTitle, editType, editBody]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    globalThis.addEventListener('beforeunload', handleBeforeUnload);
    return () => globalThis.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

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
    originalNoteRef.current = { ...note };
    setIsDirty(false);
  }

  function handleEditFieldChange(field, value) {
    if (field === 'title') setEditTitle(value);
    else if (field === 'type') setEditType(value);
    else if (field === 'body') setEditBody(value);

    // Check if dirty after change
    if (originalNoteRef.current) {
      const dirty = (
        (field === 'title' ? value : editTitle) !== originalNoteRef.current.title ||
        (field === 'type' ? value : editType) !== originalNoteRef.current.note_type ||
        (field === 'body' ? value : editBody) !== originalNoteRef.current.body
      );
      setIsDirty(dirty);
    }
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
                  <input type="text" value={editTitle} onChange={(e) => handleEditFieldChange('title', e.target.value)} />
                </div>
                <div className="field-group">
                  <label>Type</label>
                  <select value={editType} onChange={(e) => handleEditFieldChange('type', e.target.value)}>
                    {NOTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <textarea rows={8} value={editBody} onChange={(e) => handleEditFieldChange('body', e.target.value)} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {isAutosaving ? 'Autosaving...' : isDirty ? 'Unsaved changes (autosave in 2s)' : 'All changes saved'}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => saveEdit(note.id)}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
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
