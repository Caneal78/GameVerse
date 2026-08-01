/**
 * GeometryCard Component
 * 
 * Displays 3D model information for GLB/GLTF files:
 * - Triangle count, vertex count
 * - Mesh count, material count
 * - Texture count, bone count
 * - Animation count
 * - Format, compression method
 * 
 * @component GeometryCard
 */

import React from 'react';

export default function GeometryCard({ file }) {
  if (!file || !file.metadata) {
    return <div className="inspector-empty-state">No 3D model selected</div>;
  }

  const metadata = file.metadata;
  const isModel = file.section === 'Models' || ['glb', 'gltf', 'fbx', 'obj'].includes(file.original_name.split('.').pop().toLowerCase());

  if (!isModel) {
    return <div className="inspector-empty-state">Not a 3D model file</div>;
  }

  return (
    <>
      <div className="inspector-field-group">
        <label>Format</label>
        <div className="inspector-field-value">{metadata.format || 'Unknown'}</div>
      </div>

      {metadata.vertexCount !== undefined && metadata.vertexCount !== null && (
        <div className="inspector-field-group">
          <label>Vertex Count</label>
          <div className="inspector-field-value">{metadata.vertexCount.toLocaleString()}</div>
        </div>
      )}

      {metadata.faceCount !== undefined && metadata.faceCount !== null && (
        <div className="inspector-field-group">
          <label>Triangle Count</label>
          <div className="inspector-field-value">{metadata.faceCount.toLocaleString()}</div>
        </div>
      )}

      {metadata.polyCount !== undefined && metadata.polyCount !== null && (
        <div className="inspector-field-group">
          <label>Polygon Count</label>
          <div className="inspector-field-value">{metadata.polyCount.toLocaleString()}</div>
        </div>
      )}

      {metadata.materials && metadata.materials.length > 0 && (
        <div className="inspector-field-group">
          <label>Material Count</label>
          <div className="inspector-field-value">{metadata.materials.length}</div>
        </div>
      )}

      {metadata.textures && metadata.textures.length > 0 && (
        <div className="inspector-field-group">
          <label>Texture Count</label>
          <div className="inspector-field-value">{metadata.textures.length}</div>
        </div>
      )}

      {metadata.rig && (
        <div className="inspector-field-group">
          <label>Rig</label>
          <div className="inspector-field-value">{metadata.rig}</div>
        </div>
      )}

      {metadata.meshCount !== undefined && (
        <div className="inspector-field-group">
          <label>Mesh Count</label>
          <div className="inspector-field-value">{metadata.meshCount}</div>
        </div>
      )}

      {metadata.boneCount !== undefined && (
        <div className="inspector-field-group">
          <label>Bone Count</label>
          <div className="inspector-field-value">{metadata.boneCount}</div>
        </div>
      )}

      {metadata.animationCount !== undefined && (
        <div className="inspector-field-group">
          <label>Animation Count</label>
          <div className="inspector-field-value">{metadata.animationCount}</div>
        </div>
      )}

      {metadata.compression && (
        <div className="inspector-field-group">
          <label>Compression</label>
          <div className="inspector-field-value">{metadata.compression}</div>
        </div>
      )}
    </>
  );
}
