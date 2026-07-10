/**
 * Convert a local filesystem path into a gvfile:// URL usable by the renderer.
 * Handles Windows backslashes and absolute drive paths.
 *
 * @param {string} filePath - Absolute filesystem path
 * @returns {string|null} gvfile URL or null when no path is provided
 */
export function toGvfileUrl(filePath) {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, "/");
  const encoded = encodeURI(normalized);
  if (/^[A-Za-z]:\//.test(normalized)) {
    return `gvfile:///${encoded}`;
  }
  if (normalized.startsWith("//")) {
    return `gvfile:${encoded}`;
  }
  return `gvfile://${encoded}`;
}
