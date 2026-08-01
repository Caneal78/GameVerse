/**
 * PreviewCard Component
 * 
 * Displays asset preview based on file type:
 * - Images: Image preview
 * - GLB/GLTF: Embedded 3D viewer
 * - Audio: Waveform and playback controls
 * 
 * @component PreviewCard
 */

import React, { useState, useEffect, useRef } from 'react';
import GlbViewer from '../GlbViewer.jsx';

export default function PreviewCard({ file, projectPath }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [audioSrc, setAudioSrc] = useState(null);
  const [modelSrc, setModelSrc] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!file || !projectPath) return;

    const loadPreview = async () => {
      const ext = file.original_name.split('.').pop().toLowerCase();
      const section = file.section;

      // Handle image preview
      if (section === 'Images' || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
        try {
          const arrayBuffer = await window.gameverse.files.readAsArrayBuffer(file.stored_path);
          const blob = new Blob([arrayBuffer], { type: file.mime_type || 'image/png' });
          const url = URL.createObjectURL(blob);
          setImageSrc(url);
          return () => URL.revokeObjectURL(url);
        } catch (err) {
          console.error('[PreviewCard] Failed to load image:', err);
        }
      }

      // Handle audio preview
      if (section === 'Audio' || ['mp3', 'wav', 'ogg'].includes(ext)) {
        try {
          const arrayBuffer = await window.gameverse.files.readAsArrayBuffer(file.stored_path);
          const blob = new Blob([arrayBuffer], { type: file.mime_type || 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          setAudioSrc(url);
          return () => URL.revokeObjectURL(url);
        } catch (err) {
          console.error('[PreviewCard] Failed to load audio:', err);
        }
      }

      // Handle model preview
      if (section === 'Models' || ['glb', 'gltf', 'fbx', 'obj'].includes(ext)) {
        try {
          const resolvedPath = await window.gameverse.files.resolvePath(file.stored_path);
          const url = `gvfile://${resolvedPath.replace(/\\/g, '/')}`;
          setModelSrc(url);
        } catch (err) {
          console.error('[PreviewCard] Failed to load model:', err);
        }
      }
    };

    loadPreview();
  }, [file, projectPath]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  if (!file) {
    return <div className="inspector-empty-state">No file selected</div>;
  }

  const ext = file.original_name.split('.').pop().toLowerCase();
  const isImage = file.section === 'Images' || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
  const isModel = file.section === 'Models' || ['glb', 'gltf', 'fbx', 'obj'].includes(ext);
  const isAudio = file.section === 'Audio' || ['mp3', 'wav', 'ogg'].includes(ext);

  return (
    <>
      {isImage && imageSrc && (
        <div className="inspector-preview-image">
          <img src={imageSrc} alt={file.original_name} />
        </div>
      )}

      {isModel && modelSrc && (
        <div className="inspector-preview-model">
          <GlbViewer src={modelSrc} />
        </div>
      )}

      {isAudio && audioSrc && (
        <div className="inspector-preview-audio">
          <audio
            ref={audioRef}
            src={audioSrc}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />
          <div className="audio-waveform-placeholder">
            <div className="waveform-bars">
              {Array.from({ length: 50 }).map((_, i) => (
                <div
                  key={i}
                  className="waveform-bar"
                  style={{
                    height: `${20 + Math.random() * 60}%`,
                    opacity: isPlaying ? 0.8 : 0.4
                  }}
                />
              ))}
            </div>
          </div>
          <div className="audio-controls">
            <button className="btn btn-sm btn-primary" onClick={handlePlayPause}>
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <div className="audio-time">
              <span>{formatTime(currentTime)}</span>
              <span> / </span>
              <span>{formatTime(duration)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="audio-seek"
            />
          </div>
        </div>
      )}

      {!isImage && !isModel && !isAudio && (
        <div className="inspector-empty-state">
          <div className="inspector-file-icon">📄</div>
          <div>No preview available for this file type</div>
        </div>
      )}
    </>
  );
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
