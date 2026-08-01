/**
 * AssetInspector Component
 * 
 * Main container for the Asset Inspector panel.
 * Displays all inspector cards for the selected asset.
 * 
 * @component AssetInspector
 */

import React, { useState, useEffect } from 'react';
import PreviewCard from './PreviewCard.jsx';
import GeneralCard from './GeneralCard.jsx';
import GeometryCard from './GeometryCard.jsx';
import MetadataCard from './MetadataCard.jsx';
import DeveloperCard from './DeveloperCard.jsx';
import './inspector.css';

export default function AssetInspector({ selectedFileId }) {
  const [fileDetails, setFileDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [collapsedCards, setCollapsedCards] = useState({});

  useEffect(() => {
    if (!selectedFileId) {
      setFileDetails(null);
      return;
    }

    async function loadFileDetails() {
      setLoading(true);
      setError(null);
      try {
        const details = await window.gameverse.inspector.getFileDetails(selectedFileId);
        setFileDetails(details);
      } catch (err) {
        console.error('[AssetInspector] Failed to load file details:', err);
        setError(err.message || 'Failed to load file details');
      } finally {
        setLoading(false);
      }
    }

    loadFileDetails();
  }, [selectedFileId]);

  const toggleCard = (cardName) => {
    setCollapsedCards(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };

  if (!selectedFileId) {
    return (
      <div className="inspector-panel">
        <div className="inspector-header">
          <h2>Asset Inspector</h2>
        </div>
        <div className="inspector-body">
          <div className="inspector-empty-state">
            <div className="inspector-empty-icon">🔍</div>
            <div>Select a file to inspect</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="inspector-panel">
        <div className="inspector-header">
          <h2>Asset Inspector</h2>
        </div>
        <div className="inspector-body">
          <div className="inspector-loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inspector-panel">
        <div className="inspector-header">
          <h2>Asset Inspector</h2>
        </div>
        <div className="inspector-body">
          <div className="inspector-error">
            <div className="inspector-error-icon">⚠️</div>
            <div>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!fileDetails) {
    return (
      <div className="inspector-panel">
        <div className="inspector-header">
          <h2>Asset Inspector</h2>
        </div>
        <div className="inspector-body">
          <div className="inspector-empty-state">
            <div className="inspector-empty-icon">📄</div>
            <div>No file details available</div>
          </div>
        </div>
      </div>
    );
  }

  const { file, item, projectPath } = fileDetails;

  return (
    <div className="inspector-panel">
      <div className="inspector-header">
        <h2>Asset Inspector</h2>
      </div>
      <div className="inspector-body">
        <div className={`inspector-card ${collapsedCards.preview ? 'collapsed' : ''}`}>
          <div className="inspector-card-header" onClick={() => toggleCard('preview')}>
            <h3>Preview</h3>
          </div>
          <div className="inspector-card-body">
            <PreviewCard file={file} projectPath={projectPath} />
          </div>
        </div>

        <div className={`inspector-card ${collapsedCards.general ? 'collapsed' : ''}`}>
          <div className="inspector-card-header" onClick={() => toggleCard('general')}>
            <h3>General</h3>
          </div>
          <div className="inspector-card-body">
            <GeneralCard file={file} item={item} />
          </div>
        </div>

        <div className={`inspector-card ${collapsedCards.geometry ? 'collapsed' : ''}`}>
          <div className="inspector-card-header" onClick={() => toggleCard('geometry')}>
            <h3>3D Information</h3>
          </div>
          <div className="inspector-card-body">
            <GeometryCard file={file} />
          </div>
        </div>

        <div className={`inspector-card ${collapsedCards.metadata ? 'collapsed' : ''}`}>
          <div className="inspector-card-header" onClick={() => toggleCard('metadata')}>
            <h3>Metadata</h3>
          </div>
          <div className="inspector-card-body">
            <MetadataCard file={file} />
          </div>
        </div>

        <div className={`inspector-card ${collapsedCards.developer ? 'collapsed' : ''}`}>
          <div className="inspector-card-header" onClick={() => toggleCard('developer')}>
            <h3>Developer Information</h3>
          </div>
          <div className="inspector-card-body">
            <DeveloperCard file={file} item={item} />
          </div>
        </div>
      </div>
    </div>
  );
}
