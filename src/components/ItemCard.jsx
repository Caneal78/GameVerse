/**
 * Item Card Component
 *
 * Displays an item as a card in the grid view with thumbnail,
 * name, category, status, and tags.
 *
 * @component ItemCard
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toGvfileUrl } from "../utils/gvfileUrl.js";
/**
 * Item card component props
 *
 * @typedef {Object} ItemCardProps
 * @property {Object} item - Item data to display
 */

/**
 * Item card component
 *
 * @param {ItemCardProps} props - Component props
 * @returns {React.ReactNode} Rendered card
 */
export default function ItemCard({ item }) {
  const navigate = useNavigate();
  const [thumbSrc, setThumbSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (item.thumbnail && item.thumbnail.stored_path) {
      window.gameverse.files
        .resolvePath(item.thumbnail.stored_path)
        .then((p) => {
          if (!cancelled) setThumbSrc(toGvfileUrl(p));
        });
    } else {
      setThumbSrc(null);
    }
    return () => {
      cancelled = true;
    };
  }, [item.thumbnail]);

  return (
    <div className="item-card" onClick={() => navigate(`/item/${item.id}`)}>
      <div className="item-card-thumb">
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={item.name}
            onError={(e) => (e.target.style.display = "none")}
          />
        ) : (
          <div className="item-card-thumb-fallback">
            {item.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className={`pill status-${item.status} item-card-status`}>
          {item.status}
        </span>
      </div>
      <div className="item-card-body">
        <div className="item-card-name">{item.name}</div>
        <div className="item-card-category">{item.category}</div>
        {item.tags && item.tags.length > 0 && (
          <div className="item-card-tags">
            {item.tags.slice(0, 3).map((t) => (
              <span key={t.id} className="pill">
                {t.name}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="pill">+{item.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
