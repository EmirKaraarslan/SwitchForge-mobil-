const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { TEMP_BASE_DIR, registerDownload } = require('../utils/cleanup');
const { downloadMedia, getTask, updateTask } = require('../services/ytdlp');

router.post('/start', async (req, res) => {
  const { url, type, quality } = req.body;

  if (!url || !url.trim()) {
    return res.status(400).json({ success: false, error: 'Lütfen geçerli bir video veya müzik linki girin.' });
  }

  const taskId = uuidv4();
  const sessionDir = path.join(TEMP_BASE_DIR, `media_${Date.now()}_${taskId.substring(0, 8)}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  updateTask(taskId, {
    status: 'queued',
    percent: 0,
    text: 'Sıraya alındı...',
    type,
    url
  });

  // Start download asynchronously in the background
  downloadMedia(taskId, { url, type, quality, outDir: sessionDir })
    .then((filePath) => {
      if (filePath && fs.existsSync(filePath)) {
        const fileName = path.basename(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = ext === '.mp3' ? 'audio/mpeg' : 'video/mp4';

        const downloadId = uuidv4();
        registerDownload(downloadId, filePath, fileName, mimeType);

        updateTask(taskId, {
          status: 'ready',
          percent: 100,
          text: 'Hazır! İndirebilirsiniz.',
          downloadUrl: `/api/download/${downloadId}`,
          fileName
        });
      } else {
        updateTask(taskId, {
          status: 'error',
          text: 'İndirilen medya dosyası bulunamadı.'
        });
      }
    })
    .catch((err) => {
      console.error('Async media download failed:', err);
      updateTask(taskId, {
        status: 'error',
        text: err.message || 'İndirme işlemi başarısız oldu.'
      });
    });

  res.json({ success: true, taskId });
});

router.get('/status/:taskId', (req, res) => {
  const task = getTask(req.params.taskId);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Görev bulunamadı.' });
  }
  res.json({ success: true, task });
});

module.exports = router;
