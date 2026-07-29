/**
 * GLB/GLTF 3D Model Viewer Component
 * Uses IPC to read file as ArrayBuffer and creates blob URL for model-viewer
 * Supports animation playback
 * 
 * @component GlbViewer
 */

import React, { useState, useEffect, useRef } from 'react';
import '@google/model-viewer';

export default function GlbViewer({ src, onClose }) {
  console.log('[GlbViewer] Component mounted with src:', src);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [availableAnimations, setAvailableAnimations] = useState([]);
  const [selectedAnimation, setSelectedAnimation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const viewerRef = useRef(null);

  useEffect(() => {
    console.log('[GlbViewer] useEffect called with src:', src);
    if (!src) {
      console.log('[GlbViewer] No src, returning early');
      return;
    }

    async function loadFile() {
      try {
        console.log('[GlbViewer] Starting file load...');

        // Extract the file path from the gvfile:// URL
        let filePath = src.replace(/^gvfile:\/\//, '').replace(/\//g, '\\');
        // Remove leading backslash if present
        if (filePath.startsWith('\\')) {
          filePath = filePath.substring(1);
        }
        console.log('[GlbViewer] Extracted file path:', filePath);

        // Use IPC to read the file as ArrayBuffer
        console.log('[GlbViewer] Calling IPC to read file...');
        const arrayBuffer = await window.gameverse.files.readAsArrayBuffer(filePath);
        console.log('[GlbViewer] File read via IPC, size:', arrayBuffer.byteLength);

        // Create blob and blob URL
        const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        console.log('[GlbViewer] Blob URL created:', url);

        setBlobUrl(url);
        setLoading(false);
        console.log('[GlbViewer] File loaded successfully');
      } catch (err) {
        console.error('[GlbViewer] File load error:', err);
        setError(`Failed to load file: ${err.message || err}`);
        setLoading(false);
      }
    }

    loadFile();

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [src]);

  const handleLoad = (e) => {
    console.log('[GlbViewer] Model loaded successfully');
    const viewer = e.target;

    // Get available animations
    const animations = viewer.availableAnimations || [];
    console.log('[GlbViewer] Available animations:', animations);
    setAvailableAnimations(animations);

    // Auto-select first animation if available
    if (animations.length > 0) {
      setSelectedAnimation(animations[0]);
      console.log('[GlbViewer] Auto-selected animation:', animations[0]);
    }
  };

  const handleError = (e) => {
    console.error('[GlbViewer] Model load error:', e);
    console.error('[GlbViewer] Error details:', e.detail);
    setError(`Failed to load 3D model: ${e.detail?.message || 'Unknown error'}`);
    setLoading(false);
  };

  const togglePlay = () => {
    if (viewerRef.current) {
      if (isPlaying) {
        viewerRef.current.pause();
      } else {
        viewerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAnimationChange = (e) => {
    const newAnimation = e.target.value;
    setSelectedAnimation(newAnimation);
    if (viewerRef.current) {
      viewerRef.current.animationName = newAnimation;
      viewerRef.current.play();
      setIsPlaying(true);
    }
  };

  console.log('[GlbViewer] Rendering, blobUrl:', blobUrl, 'loading:', loading, 'error:', error);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#222' }}>
      {error && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e74c3c',
          flexDirection: 'column',
          gap: '10px',
          background: '#222',
          zIndex: 10
        }}>
          <div>⚠️ Error: {error}</div>
          {onClose && <button onClick={onClose} style={{ padding: '8px 16px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>}
        </div>
      )}

      {loading && !error && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888',
          background: '#222',
          zIndex: 5
        }}>
          Loading 3D model...
        </div>
      )}

      {blobUrl && (
        <>
          <model-viewer
            ref={viewerRef}
            src={blobUrl}
            alt="3D Model"
            auto-rotate
            camera-controls
            touch-action="pan-y"
            animation-name={selectedAnimation || ''}
            autoplay
            camera-orbit="0deg 75deg 5m"
            camera-target="0m 1m 0m"
            style={{ width: '100%', height: '100%', background: '#222' }}
            onLoad={handleLoad}
            onError={handleError}
          />

          {/* Animation Controls */}
          {availableAnimations.length > 0 && (
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.7)',
              padding: '10px 15px',
              borderRadius: '8px',
              zIndex: 100
            }}>
              <button
                onClick={togglePlay}
                style={{
                  padding: '6px 12px',
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
              <select
                value={selectedAnimation || ''}
                onChange={handleAnimationChange}
                style={{
                  padding: '6px 10px',
                  background: '#444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {availableAnimations.map((anim) => (
                  <option key={anim} value={anim}>{anim}</option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '8px 16px',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: 1000
          }}
        >
          ✕ Close
        </button>
      )}
    </div>
  );
}
