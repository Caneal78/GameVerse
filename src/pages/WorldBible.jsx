import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { safeIpc } from '../utils/safeIpc.js';
import '../styles/worldbible.css';

const WB_CATEGORIES = [
  'Characters', 'Creatures', 'Locations', 'Factions', 'History',
  'Lore', 'Technology', 'Weapons', 'Vehicles', 'Quests'
];

export default function WorldBible() {
  const { showToast } = useToast();
  const [category, setCategory] = useState('Lore');
  const [pages, setPages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editLinkedItem, setEditLinkedItem] = useState('');
  const [dirty, setDirty] = useState(false);

  function selectPage(page) {
    setSelected(page);
    setEditTitle(page.title);
    setEditBody(page.body);
    setEditLinkedItem(page.linked_item_id || '');
    setDirty(false);
  }

  function clearEditor() {
    setSelected(null);
    setEditTitle('');
    setEditBody('');
    setEditLinkedItem('');
    setDirty(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadCategory() {
      try {
        const list = await window.gameverse.worldBible.list(category);
        if (cancelled) return;
        setPages(list);
        if (list.length > 0) {
          selectPage(list[0]);
        } else {
          clearEditor();
        }
      } catch (error) {
        if (!cancelled) {
          showToast(error.message || 'Failed to load pages', 'error');
          setPages([]);
          clearEditor();
        }
      }
    }

    loadCategory();

    window.gameverse.items
      .list({})
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((error) => {
        if (!cancelled) {
          showToast(error.message || 'Failed to load items', 'error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [category, showToast]);

  async function handleNewPage() {
    try {
      const page = await safeIpc(
        window.gameverse.worldBible.create({
          category,
          title: 'New Page',
          body: '',
        }),
        { showToast, errorMessage: 'Failed to create page' },
      );
      const list = await window.gameverse.worldBible.list(category);
      setPages(list);
      selectPage(page);
    } catch {
      // Toast already shown by safeIpc
    }
  }

  async function handleSave() {
    if (!selected) return;
    try {
      const updated = await safeIpc(
        window.gameverse.worldBible.update(selected.id, {
          title: editTitle,
          body: editBody,
          linked_item_id: editLinkedItem || null,
        }),
        { showToast, successMessage: 'Page saved.', errorMessage: 'Failed to save page' },
      );
      setDirty(false);
      setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSelected(updated);
    } catch {
      // Toast already shown by safeIpc
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm(`Delete page "${selected.title}"?`)) return;
    try {
      await safeIpc(window.gameverse.worldBible.delete(selected.id), {
        showToast,
        errorMessage: 'Failed to delete page',
      });
      const list = await window.gameverse.worldBible.list(category);
      setPages(list);
      if (list.length > 0) {
        selectPage(list[0]);
      } else {
        clearEditor();
      }
    } catch {
      // Toast already shown by safeIpc
    }
  }

  return (
    <Layout>
      <div className="wb-layout">
        <div className="wb-category-bar">
          {WB_CATEGORIES.map((c) => (
            <button
              key={c}
              className={`wb-cat-btn ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="wb-body">
          <div className="wb-sidebar">
            <button className="btn btn-primary btn-sm" style={{ width: '100%', marginBottom: 12 }} onClick={handleNewPage}>
              + New {category.slice(0, -1)} Page
            </button>
            {pages.length === 0 && (
              <div className="empty-state" style={{ padding: 20 }}>No pages yet.</div>
            )}
            {pages.map((p) => (
              <div
                key={p.id}
                className={`wb-page-item ${selected?.id === p.id ? 'active' : ''}`}
                onClick={() => selectPage(p)}
              >
                {p.title}
              </div>
            ))}
          </div>

          <div className="wb-editor">
            {selected ? (
              <>
                <input
                  className="wb-title-input"
                  value={editTitle}
                  onChange={(e) => { setEditTitle(e.target.value); setDirty(true); }}
                  placeholder="Page title"
                />
                <div className="field-group" style={{ maxWidth: 320, marginBottom: 14 }}>
                  <label>Link to Item (optional)</label>
                  <select
                    value={editLinkedItem}
                    onChange={(e) => { setEditLinkedItem(e.target.value); setDirty(true); }}
                  >
                    <option value="">None</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>{i.name} ({i.category})</option>
                    ))}
                  </select>
                </div>
                <textarea
                  className="wb-body-textarea"
                  value={editBody}
                  onChange={(e) => { setEditBody(e.target.value); setDirty(true); }}
                  placeholder="Write world bible content here..."
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary" onClick={handleSave} disabled={!dirty}>Save Page</button>
                  <button className="btn btn-danger" onClick={handleDelete}>Delete Page</button>
                </div>
              </>
            ) : (
              <div className="empty-state">Select or create a page to begin.</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
