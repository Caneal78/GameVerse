/**
 * Asset List Component
 * 
 * Displays files in a table/list layout with columns for name, type, size, and actions.
 * Supports selection and preview actions.
 * 
 * @component AssetList
 */

import React from "react";

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
const MODEL_EXTS = [".glb", ".gltf", ".fbx", ".obj", ".stl", ".blend"];
const ANIMATION_EXTS = [".glb", ".gltf", ".fbx", ".dae", ".anim", ".bvh"];
const AUDIO_EXTS = [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", "wma"];
const SCRIPT_EXTS = [".js", ".py", ".lua", ".cs", ".cpp", ".h", ".json", ".xml"];

function extOf(name) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function getFileType(filename) {
  const ext = extOf(filename);
  if (IMAGE_EXTS.includes(ext)) return "Image";
  if (MODEL_EXTS.includes(ext)) return "Model";
  if (ANIMATION_EXTS.includes(ext)) return "Animation";
  if (AUDIO_EXTS.includes(ext)) return "Audio";
  if (SCRIPT_EXTS.includes(ext)) return "Script";
  return "File";
}

function formatFileSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function AssetList({ files, section, onFileClick, onPreview }) {
  if (files.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "200px",
          color: "var(--text-muted)",
          fontSize: "14px",
        }}
      >
        No files in this section yet.
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "13px",
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: "1px solid var(--border-color)",
              color: "var(--text-muted)",
            }}
          >
            <th style={{ textAlign: "left", padding: "8px", fontWeight: 500 }}>Name</th>
            <th style={{ textAlign: "left", padding: "8px", fontWeight: 500 }}>Type</th>
            <th style={{ textAlign: "left", padding: "8px", fontWeight: 500 }}>Size</th>
            <th style={{ textAlign: "left", padding: "8px", fontWeight: 500 }}>Added</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr
              key={file.id}
              onClick={() => onFileClick && onFileClick(file)}
              onDoubleClick={() => onPreview && onPreview(file)}
              style={{
                borderBottom: "1px solid var(--border-color)",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-tertiary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <td style={{ padding: "8px" }}>{file.original_name}</td>
              <td style={{ padding: "8px", color: "var(--text-muted)" }}>
                {getFileType(file.original_name)}
              </td>
              <td style={{ padding: "8px", color: "var(--text-muted)" }}>
                {formatFileSize(file.file_size)}
              </td>
              <td style={{ padding: "8px", color: "var(--text-muted)" }}>
                {new Date(file.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
