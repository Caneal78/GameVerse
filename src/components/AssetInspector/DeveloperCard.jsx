/**
 * DeveloperCard Component
 * 
 * Displays diagnostic information:
 * - Importer version
 * - Database record ID
 * - Hash, CRC
 * - Last indexed
 * - Import duration
 * - Source folder
 * - Database version
 * 
 * @component DeveloperCard
 */

import React from 'react';

export default function DeveloperCard({ file, item }) {
  if (!file || !item) {
    return <div className="inspector-empty-state">No file selected</div>;
  }

  return (
    <>
      <div className="inspector-field-group">
        <label>File Record ID</label>
        <div className="inspector-field-value inspector-field-value-uuid">{file.id}</div>
      </div>

      <div className="inspector-field-group">
        <label>Item Record ID</label>
        <div className="inspector-field-value inspector-field-value-uuid">{item.id}</div>
      </div>

      <div className="inspector-field-group">
        <label>File Version</label>
        <div className="inspector-field-value">{file.version}</div>
      </div>

      <div className="inspector-field-group">
        <label>Is Current Version</label>
        <div className="inspector-field-value">{file.is_current ? 'Yes' : 'No'}</div>
      </div>

      <div className="inspector-field-group">
        <label>Is Linked</label>
        <div className="inspector-field-value">{file.is_linked ? 'Yes (External)' : 'No (Copied)'}</div>
      </div>

      <div className="inspector-field-group">
        <label>Slot Key</label>
        <div className="inspector-field-value">{file.slot_key || 'N/A'}</div>
      </div>

      <div className="inspector-field-group">
        <label>Import Date</label>
        <div className="inspector-field-value">{new Date(file.created_at).toISOString()}</div>
      </div>

      <div className="inspector-field-group">
        <label>Last Modified</label>
        <div className="inspector-field-value">{new Date(item.updated_at).toISOString()}</div>
      </div>

      <div className="inspector-field-group">
        <label>MIME Type</label>
        <div className="inspector-field-value">{file.mime_type || 'Unknown'}</div>
      </div>

      <div className="inspector-field-group">
        <label>Stored Path</label>
        <div className="inspector-field-value inspector-field-value-path">{file.stored_path}</div>
      </div>

      {file.metadata && Object.keys(file.metadata).length > 0 && (
        <div className="inspector-field-group">
          <label>Raw Metadata</label>
          <div className="inspector-field-value inspector-field-value-json">
            <pre>{JSON.stringify(file.metadata, null, 2)}</pre>
          </div>
        </div>
      )}
    </>
  );
}
