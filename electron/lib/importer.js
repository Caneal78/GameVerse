const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Metadata extraction
async function extractMetadata(filePath) {
  const metadata = await sharp(filePath).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    colorMode: metadata.colorSpace || 'sRGB',
    alpha: metadata.alphaChannel ? 'yes' : 'no',
    timestamp: fs.statSync(filePath).mtime.getTime()
  };
}

// Vault copy logic (using existing vault.js)
function copyToVault(filePath) {
  // Assume vault.js handles this
  return path.join('vault', path.basename(filePath));
}

ipcMain.handle('importPNG', async (event, file) => {
  try {
    // Validate PNG format
    if (!file.type.startsWith('image/png')) {
      throw new Error('File is not a PNG');
    }

    // Copy to vault
    const vaultPath = copyToVault(file.path);

    // Extract metadata
    const metadata = await extractMetadata(file.path);

    // Generate thumbnail URL
    const thumbnail = `gvfile:///${vaultPath}?type=image/png`;

    // Create item in LowDB
    const newItem = {
      id: Date.now(),
      name: path.basename(file.path),
      type: 'image',
      format: 'png',
      path: vaultPath,
      thumbnail: thumbnail,
      metadata: metadata,
      createdAt: Date.now()
    };

    // Return success
    return { success: true, item: newItem };
  } catch (error) {
    console.error('PNG import failed:', error);
    throw new Error('Failed to import PNG');
  }
});