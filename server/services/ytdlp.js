const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { getFfmpegExecutable } = require('./ffmpeg');

function getYtdlpExecutable() {
  if (process.platform === 'win32') {
    const winPath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'AppData',
      'Local',
      'Programs',
      'SwitchForge',
      'resources',
      'app.asar.unpacked',
      'bin',
      'yt-dlp.exe'
    );
    if (fs.existsSync(winPath)) return winPath;
  }
  return 'yt-dlp';
}

// In-memory progress tracking for tasks
const taskProgress = new Map();

function updateTask(id, data) {
  taskProgress.set(id, { ...taskProgress.get(id), ...data, updatedAt: Date.now() });
}

function getTask(id) {
  return taskProgress.get(id);
}

async function downloadMedia(taskId, { url, type, quality, outDir }) {
  const ytdlp = getYtdlpExecutable();
  const ffmpeg = getFfmpegExecutable();
  const isAudio = type === 'to-mp3';

  updateTask(taskId, { status: 'starting', percent: 5, text: 'Bağlantı kuruluyor...' });

  const args = [
    '--no-playlist',
    '--no-warnings',
    '--ffmpeg-location',
    ffmpeg
  ];

  let outputTemplate = '';
  if (isAudio) {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    outputTemplate = path.join(outDir, '%(title).100s.%(ext)s');
  } else {
    if (quality === 'best' || !quality) {
      args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
    } else {
      args.push('-f', `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${quality}][ext=mp4]/best`);
    }
    outputTemplate = path.join(outDir, '%(title).100s.%(ext)s');
  }

  args.push('-o', outputTemplate);
  args.push(url);

  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlp, args);
    let stderrData = '';

    proc.stdout.on('data', (data) => {
      const str = data.toString();
      const match = str.match(/\[download\]\s+([\d\.]+)%/);
      if (match) {
        const percent = Math.min(95, Math.floor(parseFloat(match[1])));
        updateTask(taskId, { status: 'downloading', percent, text: `İndiriliyor: ${match[1]}%` });
      } else if (str.includes('[ExtractAudio]')) {
        updateTask(taskId, { status: 'processing', percent: 92, text: 'Ses ayrıştırılıyor...' });
      } else if (str.includes('[Merger]')) {
        updateTask(taskId, { status: 'processing', percent: 92, text: 'Video ve ses birleştiriliyor...' });
      }
    });

    proc.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    proc.on('error', (err) => {
      console.error('yt-dlp spawn error:', err);
      updateTask(taskId, { status: 'error', text: 'İndirici başlatılamadı.' });
      reject(new Error('İndirici başlatılamadı.'));
    });

    proc.on('close', (code) => {
      if (code === 0) {
        // Find downloaded file in outDir
        try {
          const files = fs.readdirSync(outDir);
          if (files.length > 0) {
            // Sort by creation time descending
            const downloadedFile = files
              .map((f) => ({ name: f, time: fs.statSync(path.join(outDir, f)).mtimeMs }))
              .sort((a, b) => b.time - a.time)[0].name;

            const finalPath = path.join(outDir, downloadedFile);
            updateTask(taskId, { status: 'completed', percent: 100, text: 'Tamamlandı!', fileName: downloadedFile });
            resolve(finalPath);
            return;
          }
        } catch (e) {
          console.error('File search error:', e);
        }
        updateTask(taskId, { status: 'completed', percent: 100, text: 'Tamamlandı!' });
        resolve(null);
      } else {
        console.error('yt-dlp stderr:', stderrData);
        let errorMsg = 'İndirme işlemi başarısız oldu.';
        if (stderrData.includes('Video unavailable') || stderrData.includes('not available')) {
          errorMsg = 'Bu video kullanılamıyor veya gizli.';
        } else if (stderrData.includes('Sign in')) {
          errorMsg = 'Bu video için giriş yapılması gerekiyor veya yaş kısıtlamalı.';
        } else if (stderrData.includes('HTTP Error 403')) {
          errorMsg = 'YouTube erişim izni vermedi (403 Forbidden).';
        }
        updateTask(taskId, { status: 'error', percent: 0, text: errorMsg });
        reject(new Error(errorMsg));
      }
    });
  });
}

module.exports = {
  downloadMedia,
  getTask,
  updateTask
};
