/**
 * Asset Grid Component
 * 
 * Displays files in a responsive grid layout using FileCard components.
 * Supports selection, preview, dynamic sizing, and sorting.
 * 
 * @component AssetGrid
 */

import React, { memo, useMemo } from "react";
import FileCard from "./FileCard.jsx";

function AssetGridComponent({ files, resolvedPaths, section, onFileClick, onPreview, thumbnailSize = 150, fileTags, favoriteFileIds, onToggleFavorite, selectedFileIds, onToggleSelection }) {
  const gridStyle = useMemo(() => ({
    display: "grid",
    gridTemplateColumns: `repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`,
    gap: "16px",
    padding: "16px",
  }), [thumbnailSize]);

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
    <div style={gridStyle}>
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          resolvedPath={resolvedPaths[file.id]}
          section={section}
          onClick={onFileClick}
          onPreview={onPreview}
          thumbnailSize={thumbnailSize}
          tags={fileTags?.[file.id] || []}
          isFavorite={favoriteFileIds?.has(file.id) || false}
          onToggleFavorite={onToggleFavorite}
          isSelected={selectedFileIds?.has(file.id) || false}
          onToggleSelection={onToggleSelection}
        />
      ))}
    </div>
  );
}

const AssetGrid = memo(AssetGridComponent);

export default AssetGrid;
