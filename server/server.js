const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { getDownload, startCleanupInterval } = require('./utils/cleanup');
const convertRouter = require('./routes/convert');
const mediaRouter = require('./routes/media');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Frontend & PWA
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health Check for Render / Railway / Cloud monitors
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime(), timestamp: Date.now() });
});

// Routes
app.use('/api/convert', convertRouter);
app.use('/api/media', mediaRouter);

// Universal File Download Endpoint (iPhone Safari & Chrome friendly)
app.get('/api/download/:id', (req, res) => {
  const item = getDownload(req.params.id);
  if (!item || !fs.existsSync(item.filePath)) {
    return res.status(404).send('İndirme bağlantısı bulunamadı veya süresi doldu. Lütfen işlemi tekrarlayın.');
  }

  const encodedFileName = encodeURIComponent(item.fileName).replace(/['()]/g, escape).replace(/\*/g, '%2A');

  res.setHeader('Content-Type', item.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${item.fileName}"; filename*=UTF-8''${encodedFileName}`);

  const filestream = fs.createReadStream(item.filePath);
  filestream.pipe(res);
});

// SPA fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start cleanup background task
startCleanupInterval();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SwitchForge Mobile & Web Server running on http://localhost:${PORT}`);
});
