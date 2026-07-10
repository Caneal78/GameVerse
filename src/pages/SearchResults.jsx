import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function SearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const query = new URLSearchParams(location.search).get('q') || '';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    window.gameverse.search
      .query(query)
      .then((r) => {
        if (!cancelled) {
          setResults(r);
          setLoading(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          showToast(error.message || 'Search failed', 'error');
          setResults([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query, showToast]);

  return (
    <Layout>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Search: "{query}"</h1>
          <div className="dashboard-subtitle">
            {loading ? 'Searching…' : `${results.length} result(s) across names, tags, notes, and files`}
          </div>
        </div>
      </div>
      <div className="dashboard-body">
        {!loading && results.length === 0 && (
          <div className="empty-state">No matches found for "{query}".</div>
        )}
        {results.map((r) => (
          <div className="list-row" key={r.item_id} onClick={() => navigate(`/item/${r.item_id}`)} style={{ cursor: 'pointer' }}>
            <div>
              <strong>{r.name}</strong>{' '}
              <span className="pill pill-accent">{r.category}</span>{' '}
              <span className={`pill status-${r.status}`}>{r.status}</span>
            </div>
            <span style={{ color: 'var(--text-muted)' }}>View →</span>
          </div>
        ))}
      </div>
    </Layout>
  );
}
