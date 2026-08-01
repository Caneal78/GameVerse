/**
 * File Card Component
 * 
 * Renders a single file card with preview, name, tags, and actions.
 * Used in asset grid views.
 * 
 * @component FileCard
 */

import React, { memo } from "react";
import { toGvfileUrl } from "../../utils/gvfileUrl.js";
import TagBadge from "./TagBadge.jsx";

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
const MODEL_EXTS = [".glb", ".gltf", ".fbx", ".obj", ".stl", ".blend"];
const ANIMATION_EXTS = [".glb", ".gltf", ".fbx", ".dae", ".anim", ".bvh"];
const AUDIO_EXTS = [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".wma"];
const SCRIPT_EXTS = [".js", ".py", ".lua", ".cs", ".cpp", ".h", ".json", ".xml"];

function extOf(name) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function FileCardComponent({ file, resolvedPath, section, onClick, onPreview, thumbnailSize = 150, tags = [], isFavorite = false, onToggleFavorite, isSelected = false, onToggleSelection }) {
  const renderPreview = () => {
    if (!resolvedPath) return <div className="file-card-preview">…</div>;
    const ext = extOf(file.original_name);
    const src = toGvfileUrl(resolvedPath);

    if (section === "Images" || IMAGE_EXTS.includes(ext)) {
      if (!resolvedPath) {
        return (
          <div className="file-card-preview" onClick={() => onPreview && onPreview(file)}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#888',
              fontSize: '12px'
            }}>
              Loading...
            </div>
          </div>
        );
      }
      return (
        <div className="file-card-preview" onClick={() => onPreview && onPreview(file)}>
          <img
            src={src}
            alt={file.original_name}
            onError={(e) => {
              console.error('Thumbnail load error:', file.original_name, src);
              e.target.style.display = 'none';
            }}
          />
        </div>
      );
    }

    if (section === "Models" && (ext === ".glb" || ext === ".gltf")) {
      return (
        <div className="file-card-preview" onClick={() => onPreview && onPreview(file)}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              flexDirection: "column",
              gap: "8px",
              background: "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)",
              borderRadius: "4px"
            }}
          >
            <span style={{ fontSize: 32 }}>🧊</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>
              3D Model
            </span>
            {file.metadata?.vertexCount && (
              <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                {file.metadata.vertexCount.toLocaleString()} verts
              </span>
            )}
          </div>
        </div>
      );
    }

    if (section === "Animations" && ANIMATION_EXTS.includes(ext)) {
      return (
        <div className="file-card-preview" onClick={() => onPreview && onPreview(file)}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              flexDirection: "column",
              gap: "8px",
              background: "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)",
              borderRadius: "4px"
            }}
          >
            <span style={{ fontSize: 32 }}>🎬</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>
              Animation
            </span>
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
              {ext.replace('.', '').toUpperCase()}
            </span>
          </div>
        </div>
      );
    }

    if (section === "Audio" && AUDIO_EXTS.includes(ext)) {
      return (
        <div className="file-card-preview" onClick={() => onPreview && onPreview(file)}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              flexDirection: "column",
              gap: "8px",
              background: "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)",
              borderRadius: "4px"
            }}
          >
            <span style={{ fontSize: 32 }}>🔊</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>
              Audio
            </span>
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
              {ext.replace('.', '').toUpperCase()}
            </span>
          </div>
        </div>
      );
    }

    if (section === "Scripts" && SCRIPT_EXTS.includes(ext)) {
      return (
        <div className="file-card-preview" onClick={() => onPreview && onPreview(file)}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              flexDirection: "column",
              gap: "8px",
              background: "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)",
              borderRadius: "4px"
            }}
          >
            <span style={{ fontSize: 32 }}>📜</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>
              Script
            </span>
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
              {ext.replace('.', '').toUpperCase()}
            </span>
          </div>
        </div>
      );
    }

    // Default fallback for unknown file types
    return (
      <div
        className="file-card-preview"
        onClick={() => onPreview && onPreview(file)}
        style={{
          padding: 10,
          background: "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)",
          borderRadius: "4px"
        }}
      >
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px"
        }}>
          <span style={{ fontSize: 32 }}>📄</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>
            File
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      className="file-card"
      onClick={() => onClick && onClick(file)}
      style={{
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "12px",
        background: isSelected ? "var(--accent-primary)" : "var(--bg-secondary)",
        borderRadius: "8px",
        border: isSelected ? "2px solid white" : "1px solid var(--border-color)",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          aspectRatio: "1",
          borderRadius: "4px",
          overflow: "hidden",
          background: "var(--bg-tertiary)",
          position: "relative",
        }}
      >
        {renderPreview()}
        {onToggleSelection && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection(file.id);
            }}
            style={{
              position: "absolute",
              top: "8px",
              left: "8px",
              background: isSelected ? "var(--accent-primary)" : "rgba(0, 0, 0, 0.6)",
              border: isSelected ? "2px solid white" : "2px solid transparent",
              borderRadius: "4px",
              width: "20px",
              height: "20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              color: "white",
            }}
            title={isSelected ? "Deselect" : "Select"}
          >
            {isSelected ? "✓" : ""}
          </button>
        )}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(file.id);
            }}
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              background: "rgba(0, 0, 0, 0.6)",
              border: "none",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              color: isFavorite ? "#fbbf24" : "white",
            }}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        )}
      </div>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 500,
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {file.original_name}
      </div>
      {tags.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
          }}
        >
          {tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </div>
      )}
    </div>
  );
}

const FileCard = memo(FileCardComponent);

export default FileCard;
