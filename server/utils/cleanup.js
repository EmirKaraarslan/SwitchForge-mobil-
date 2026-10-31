const fs = require('fs');
const path = require('path');

const TEMP_BASE_DIR = path.join(__dirname, '..', '..', 'temp_storage');
if (!fs.existsSync(TEMP_BASE_DIR)) {
  fs.mkdirSync(TEMP_BASE_DIR, { recursive: true });
}

// In-memory registry for file downloads
const downloadRegistry = new Map();

function registerDownload(id, filePath, fileName, mimeType) {
  downloadRegistry.set(id, {
    filePath,
    fileName,
    mimeType: mimeType || 'application/octet-stream',
    createdAt: Date.now()
  });
}

function getDownload(id) {
  return downloadRegistry.get(id);
}

function removeDownload(id) {
  const item = downloadRegistry.get(id);
  if (item) {
    try {
      if (fs.existsSync(item.filePath)) {
        fs.unlinkSync(item.filePath);
      }
    } catch (e) {
      console.error('File unlink error:', e);
    }
    downloadRegistry.delete(id);
  }
}

// Auto clean files older than 30 minutes
function startCleanupInterval() {
  setInterval(() => {
    const now = Date.now();
    const MAX_AGE = 30 * 60 * 1000; // 30 minutes

    for (const [id, item] of downloadRegistry.entries()) {
      if (now - item.createdAt > MAX_AGE) {
        removeDownload(id);
      }
    }

    try {
      if (fs.existsSync(TEMP_BASE_DIR)) {
        const files = fs.readdirSync(TEMP_BASE_DIR);
        for (const file of files) {
          const fullPath = path.join(TEMP_BASE_DIR, file);
          const stat = fs.statSync(fullPath);
          if (now - stat.mtimeMs > MAX_AGE) {
            if (stat.isDirectory()) {
              fs.rmSync(fullPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(fullPath);
            }
          }
        }
      }
    } catch (err) {
      console.error('Periodic cleanup error:', err);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
}

module.exports = {
  TEMP_BASE_DIR,
  registerDownload,
  getDownload,
  removeDownload,
  startCleanupInterval
};
