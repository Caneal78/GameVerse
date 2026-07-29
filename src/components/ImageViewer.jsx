/**
 * Image Viewer Component
 * 
 * Advanced image viewer with zoom, pan, and basic image manipulation.
 * Supports PNG, JPG, JPEG, GIF, WEBP formats.
 * 
 * @component ImageViewer
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';

export default function ImageViewer({ src, alt = '', onClose }) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  if (!src) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        color: '#888'
      }}>
        <div>No image source provided</div>
      </div>
    );
  }

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.1), 10));
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [position]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setBrightness(100);
    setContrast(100);
  }, []);

  const rotateImage = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev * 1.2, 10));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev / 1.2, 0.1));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        position: 'relative',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          transformOrigin: 'center center',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      >
        {loading && !error && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#888',
            fontSize: '14px'
          }}>
            Loading...
          </div>
        )}
        {error ? (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#e74c3c',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            <div>Failed to load image</div>
            <div style={{ fontSize: '12px', marginTop: '8px' }}>{error}</div>
          </div>
        ) : (
          <img
            ref={imageRef}
            src={src}
            alt={alt}
            onLoad={() => setLoading(false)}
            onError={(e) => {
              setError('Could not load image');
              setLoading(false);
            }}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              filter: `brightness(${brightness}%) contrast(${contrast}%)`,
              display: loading ? 'none' : 'block',
              pointerEvents: 'none'
            }}
            draggable={false}
          />
        )}
      </div>

      {showControls && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <button
            onClick={zoomOut}
            style={{
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            title="Zoom Out"
          >
            −
          </button>
          <span style={{ color: 'white', minWidth: '50px', textAlign: 'center', fontSize: '12px' }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            style={{
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            title="Zoom In"
          >
            +
          </button>

          <div style={{ width: '1px', height: '24px', backgroundColor: '#444', margin: '0 8px' }} />

          <button
            onClick={rotateImage}
            style={{
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            title="Rotate"
          >
            ↻
          </button>

          <button
            onClick={resetView}
            style={{
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            title="Reset View"
          >
            Reset
          </button>

          <div style={{ width: '1px', height: '24px', backgroundColor: '#444', margin: '0 8px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#aaa', fontSize: '11px' }}>Brightness:</span>
            <input
              type="range"
              min="0"
              max="200"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              style={{ width: '80px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#aaa', fontSize: '11px' }}>Contrast:</span>
            <input
              type="range"
              min="0"
              max="200"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              style={{ width: '80px' }}
            />
          </div>

          {onClose && (
            <>
              <div style={{ width: '1px', height: '24px', backgroundColor: '#444', margin: '0 8px' }} />
              <button
                onClick={onClose}
                style={{
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Close
              </button>
            </>
          )}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          borderRadius: '4px',
          padding: '8px 12px',
          color: '#aaa',
          fontSize: '11px',
          pointerEvents: 'none'
        }}
      >
        Scroll to zoom • Drag to pan
      </div>
    </div>
  );
}
