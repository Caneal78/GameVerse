import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import ItemCard from '../components/ItemCard.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function CollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [collection, setCollection] = useState(null);
  const [allItems, setAllItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');

  async function load() {
    const c = await window.gameverse.collections.get(id);
    if (!c) {
      showToast('Collection not found', 'error');
      navigate('/collections');
      return;
    }
    setCollection(c);
    const items = await window.gameverse.items.list({});
    setAllItems(items);
  }

  useEffect(() => { load(); }, [id]);

  async function handleAdd() {
    if (!selectedItemId) return;
    await window.gameverse.collections.addItem(id, selectedItemId);
    setSelectedItemId('');
    load();
  }

  async function handleRemove(itemId) {
    await window.gameverse.collections.removeItem(id, itemId);
    load();
  }

  if (!collection) return <Layout><div className="empty-state"><span className="spinner" /></div></Layout>;

  const availableItems = allItems.filter((i) => !collection.items.some((ci) => ci.id === i.id));

  return (
    <Layout>
      <div className="dashboard-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/collections')}>← Collections</button>
          <h1 className="dashboard-title" style={{ marginTop: 8 }}>{collection.name}</h1>
          <div className="dashboard-subtitle">{collection.description}</div>
        </div>
        <div className="dashboard-controls">
          <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
            <option value="">Add item...</option>
            {availableItems.map((i) => (
              <option key={i.id} value={i.id}>{i.name} ({i.category})</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={handleAdd}>+ Add</button>
        </div>
      </div>

      <div className="dashboard-body">
        {collection.items.length === 0 ? (
          <div className="empty-state">No items in this collection yet.</div>
        ) : (
          <div className="item-grid">
            {collection.items.map((item) => (
              <div key={item.id} style={{ position: 'relative' }}>
                <ItemCard item={item} />
                <button
                  className="btn btn-sm btn-danger"
                  style={{ position: 'absolute', top: 8, left: 8 }}
                  onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
