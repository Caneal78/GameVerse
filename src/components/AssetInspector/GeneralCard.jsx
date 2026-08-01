/**
 * GeneralCard Component
 * 
 * Displays basic file information:
 * - Filename, display name, asset type
 * - Category, file extension
 * - Import date, modified date
 * - File size, location
 * - UUID, tags, description
 * 
 * @component GeneralCard
 */

import React from 'react';

export default function GeneralCard({ file, item }) {
  if (!file || !item) {
    return <div className="inspector-empty-state">No file selected</div>;
  }

  const ext = file.original_name.split('.').pop().toLowerCase();
  const fileSize = formatBytes(file.size_bytes);
  const importDate = new Date(file.created_at).toLocaleDateString();
  const modifiedDate = new Date(item.updated_at).toLocaleDateString();

  return (
    <>
      <div className="inspector-field-group">
        <label>Filename</label>
        <div className="inspector-field-value">{file.original_name}</div>
      </div>

      <div className="inspector-field-group">
        <label>Display Name</label>
        <div className="inspector-field-value">{item.name}</div>
      </div>

      <div className="inspector-field-group">
        <label>Asset Type</label>
        <div className="inspector-field-value">{file.section}</div>
      </div>

      <div className="inspector-field-group">
        <label>Category</label>
        <div className="inspector-field-value">{item.category}</div>
      </div>

      <div className="inspector-field-group">
        <label>File Extension</label>
        <div className="inspector-field-value">{ext.toUpperCase()}</div>
      </div>

      <div className="inspector-field-group">
        <label>Import Date</label>
        <div className="inspector-field-value">{importDate}</div>
      </div>

      <div className="inspector-field-group">
        <label>Modified Date</label>
        <div className="inspector-field-value">{modifiedDate}</div>
      </div>

      <div className="inspector-field-group">
        <label>File Size</label>
        <div className="inspector-field-value">{fileSize}</div>
      </div>

      <div className="inspector-field-group">
        <label>Location</label>
        <div className="inspector-field-value inspector-field-value-path">{file.stored_path}</div>
      </div>

      <div className="inspector-field-group">
        <label>UUID</label>
        <div className="inspector-field-value inspector-field-value-uuid">{file.id}</div>
      </div>

      <div className="inspector-field-group">
        <label>Status</label>
        <div className="inspector-field-value">{item.status}</div>
      </div>

      {item.tags && item.tags.length > 0 && (
        <div className="inspector-field-group">
          <label>Tags</label>
          <div className="inspector-tags">
            {item.tags.map((tag, i) => (
              <span key={i} className="inspector-tag">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {item.summary && (
        <div className="inspector-field-group">
          <label>Description</label>
          <div className="inspector-field-value inspector-field-value-text">{item.summary}</div>
        </div>
      )}
    </>
  );
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
