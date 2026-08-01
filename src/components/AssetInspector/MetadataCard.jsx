/**
 * MetadataCard Component
 * 
 * Displays and allows editing of file metadata:
 * - Title, author, copyright
 * - License, website, source
 * - Notes, custom properties
 * - Keywords, tags
 * 
 * @component MetadataCard
 */

import React from 'react';

export default function MetadataCard({ file }) {
  if (!file) {
    return <div className="inspector-empty-state">No file selected</div>;
  }

  const metadata = file.metadata || {};

  return (
    <div className="inspector-metadata-view">
      {metadata.title && (
        <div className="inspector-field-group">
          <label>Title</label>
          <div className="inspector-field-value">{metadata.title}</div>
        </div>
      )}

      {metadata.author && (
        <div className="inspector-field-group">
          <label>Author</label>
          <div className="inspector-field-value">{metadata.author}</div>
        </div>
      )}

      {metadata.copyright && (
        <div className="inspector-field-group">
          <label>Copyright</label>
          <div className="inspector-field-value">{metadata.copyright}</div>
        </div>
      )}

      {metadata.license && (
        <div className="inspector-field-group">
          <label>License</label>
          <div className="inspector-field-value">{metadata.license}</div>
        </div>
      )}

      {metadata.website && (
        <div className="inspector-field-group">
          <label>Website</label>
          <div className="inspector-field-value">
            <a href={metadata.website} target="_blank" rel="noopener noreferrer">
              {metadata.website}
            </a>
          </div>
        </div>
      )}

      {metadata.source && (
        <div className="inspector-field-group">
          <label>Source</label>
          <div className="inspector-field-value">{metadata.source}</div>
        </div>
      )}

      {metadata.notes && (
        <div className="inspector-field-group">
          <label>Notes</label>
          <div className="inspector-field-value inspector-field-value-text">{metadata.notes}</div>
        </div>
      )}

      {metadata.keywords && (
        <div className="inspector-field-group">
          <label>Keywords</label>
          <div className="inspector-field-value">{metadata.keywords}</div>
        </div>
      )}

      {!metadata.title && !metadata.author && !metadata.copyright &&
        !metadata.license && !metadata.website && !metadata.source &&
        !metadata.notes && !metadata.keywords && (
          <div className="inspector-empty-state">No metadata</div>
        )}
    </div>
  );
}
