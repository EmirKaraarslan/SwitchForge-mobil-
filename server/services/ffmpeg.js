const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execFilePromise = util.promisify(execFile);

function getFfmpegExecutable() {
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
      'node_modules',
      'ffmpeg-static',
      'ffmpeg.exe'
    );
    if (fs.existsSync(winPath)) return winPath;
  }
  return 'ffmpeg';
}

async function extractAudioToMp3(videoPath, outputMp3Path) {
  const ffmpeg = getFfmpegExecutable();
  const args = [
    '-y',
    '-i',
    videoPath,
    '-vn',
    '-c:a',
    'libmp3lame',
    '-q:a',
    '0',
    '-nostats',
    '-loglevel',
    'error',
    outputMp3Path
  ];

  await execFilePromise(ffmpeg, args);

  if (!fs.existsSync(outputMp3Path)) {
    throw new Error('Sesi ayıklama işlemi tamamlanamadı.');
  }

  return outputMp3Path;
}

module.exports = {
  extractAudioToMp3,
  getFfmpegExecutable
};
