import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout.jsx';
import ItemCard from '../components/ItemCard.jsx';
import CreateItemModal from '../components/CreateItemModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/dashboard.css';

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState(null);
  const [status, setStatus] = useState('');
  const [tag, setTag] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (category) filters.category = category;
      if (status) filters.status = status;
      if (tag) filters.tag = tag;
      const list = await window.gameverse.items.list(filters);
      setItems(list);
      const tags = await window.gameverse.tags.list();
      setAllTags(tags);
    } catch (e) {
      showToast(e.message || 'Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  }, [category, status, tag]);

  useEffect(() => {
    load();
  }, [load]);

  // Group items by category when "All Items" is selected, for the grid-by-category view
  const grouped = {};
  if (!category) {
    for (const item of items) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    }
  }

  return (
    <Layout activeCategory={category} onCategoryChange={setCategory}>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">{category || 'All Items'}</h1>
          <div className="dashboard-subtitle">
            {loading ? 'Loading…' : `${items.length} item${items.length === 1 ? '' : 's'}`}
          </div>
        </div>
        <div className="dashboard-controls">
          <select
            className="dashboard-filter-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Concept">Concept</option>
            <option value="WIP">WIP</option>
            <option value="Final">Final</option>
          </select>
          <select
            className="dashboard-filter-select"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            <option value="">All Tags</option>
            {allTags.map((t) => (
              <option key={t.id} value={t.name}>{t.name} ({t.usage_count})</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Create Item
          </button>
        </div>
      </div>

      <div className="dashboard-body">
        {items.length === 0 && !loading && (
          <div className="empty-state">
            <div style={{ fontSize: 32 }}>🗂️</div>
            <div>No items yet. Create your first item to get started.</div>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + Create Item
            </button>
          </div>
        )}

        {category ? (
          <div className="item-grid">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          Object.entries(grouped).map(([cat, catItems]) => (
            <div className="category-section" key={cat}>
              <div className="category-section-title">{cat.toUpperCase()}S</div>
              <div className="item-grid">
                {catItems.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <CreateItemModal
          defaultCategory={category}
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
    </Layout>
  );
}
