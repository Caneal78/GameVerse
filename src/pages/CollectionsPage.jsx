import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function CollectionsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [collections, setCollections] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function load() {
    const list = await window.gameverse.collections.list();
    setCollections(list);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!name.trim()) {
      showToast('Please enter a collection name.', 'error');
      return;
    }
    const c = await window.gameverse.collections.create(name.trim(), description.trim());
    setName('');
    setDescription('');
    setShowModal(false);
    await load();
    navigate(`/collections/${c.id}`);
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this collection? Items themselves will not be deleted.')) return;
    await window.gameverse.collections.delete(id);
    load();
  }

  return (
    <Layout>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Collections</h1>
          <div className="dashboard-subtitle">{collections.length} collection(s)</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Collection</button>
      </div>

      <div className="dashboard-body">
        {collections.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 32 }}>🧩</div>
            <div>No collections yet. Group items together, like "Swamp Biome" or "Main Characters."</div>
          </div>
        ) : (
          <div className="item-grid">
            {collections.map((c) => (
              <div key={c.id} className="item-card" onClick={() => navigate(`/collections/${c.id}`)}>
                <div className="item-card-thumb">
                  <div className="item-card-thumb-fallback">🧩</div>
                </div>
                <div className="item-card-body">
                  <div className="item-card-name">{c.name}</div>
                  <div className="item-card-category">{c.description || 'No description'}</div>
                  <button className="btn btn-sm btn-danger" style={{ marginTop: 8 }} onClick={(e) => handleDelete(c.id, e)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>New Collection</h3></div>
            <div className="modal-body">
              <div className="field-group">
                <label>Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Swamp Biome" autoFocus />
              </div>
              <div className="field-group">
                <label>Description</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
