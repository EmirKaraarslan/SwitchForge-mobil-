const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { TEMP_BASE_DIR, registerDownload } = require('../utils/cleanup');
const { mergePdfs, splitPdfToZip, imagesToPdf, pdfToImagesZip } = require('../services/pdfService');
const { convertWithLibreOffice } = require('../services/libreoffice');
const { extractAudioToMp3 } = require('../services/ffmpeg');

// Configure multer storage
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(TEMP_BASE_DIR, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Preserve Turkish characters and safe extension
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 250 * 1024 * 1024 } // 250 MB
});

router.post('/', upload.array('files', 50), async (req, res) => {
  const type = req.body.type;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, error: 'Lütfen dönüştürülecek dosya seçin.' });
  }

  const sessionDir = path.join(TEMP_BASE_DIR, `task_${Date.now()}_${uuidv4().substring(0, 8)}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    let resultFilePath = null;
    let resultFileName = 'donusturulen_dosya';
    let mimeType = 'application/octet-stream';

    // 1. PDF Birleştir (Merge)
    if (type === 'merge-pdf') {
      const pdfPaths = files.map((f) => f.path);
      resultFileName = `Birlesik_PDF_${Date.now()}.pdf`;
      resultFilePath = path.join(sessionDir, resultFileName);
      mimeType = 'application/pdf';
      await mergePdfs(pdfPaths, resultFilePath);
    }

    // 2. PDF Parçala (Split)
    else if (type === 'split-pdf') {
      const pdfPath = files[0].path;
      const baseName = path.basename(files[0].originalname, path.extname(files[0].originalname));
      resultFileName = `${baseName}_Parcalari.zip`;
      resultFilePath = path.join(sessionDir, resultFileName);
      mimeType = 'application/zip';
      await splitPdfToZip(pdfPath, resultFilePath);
    }

    // 3. Resim veya Office -> PDF
    else if (type === 'to-pdf') {
      const ext = path.extname(files[0].originalname).toLowerCase();
      const baseName = path.basename(files[0].originalname, ext);

      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        // Multi or single images to PDF
        const imgPaths = files.map((f) => f.path);
        resultFileName = `${baseName}_Belge.pdf`;
        resultFilePath = path.join(sessionDir, resultFileName);
        mimeType = 'application/pdf';
        await imagesToPdf(imgPaths, resultFilePath);
      } else if (['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.odt', '.rtf'].includes(ext)) {
        // Office to PDF via LibreOffice
        resultFilePath = await convertWithLibreOffice(files[0].path, sessionDir, 'pdf');
        resultFileName = `${baseName}.pdf`;
        mimeType = 'application/pdf';
      } else {
        throw new Error(`Desteklenmeyen dosya formatı: ${ext}`);
      }
    }

    // 4. PDF -> Word (DOCX)
    else if (type === 'to-word') {
      const baseName = path.basename(files[0].originalname, path.extname(files[0].originalname));
      resultFilePath = await convertWithLibreOffice(files[0].path, sessionDir, 'docx');
      resultFileName = `${baseName}.docx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    // 5. PDF -> Excel (XLSX)
    else if (type === 'to-excel') {
      const baseName = path.basename(files[0].originalname, path.extname(files[0].originalname));
      resultFilePath = await convertWithLibreOffice(files[0].path, sessionDir, 'xlsx');
      resultFileName = `${baseName}.xlsx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    // 6. PDF -> PowerPoint (PPTX)
    else if (type === 'to-ppt') {
      const baseName = path.basename(files[0].originalname, path.extname(files[0].originalname));
      resultFilePath = await convertWithLibreOffice(files[0].path, sessionDir, 'pptx');
      resultFileName = `${baseName}.pptx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    }

    // 7. PDF -> PDF/A
    else if (type === 'to-pdfa') {
      const baseName = path.basename(files[0].originalname, path.extname(files[0].originalname));
      resultFilePath = await convertWithLibreOffice(files[0].path, sessionDir, 'pdfa');
      resultFileName = `${baseName}_PDFA.pdf`;
      mimeType = 'application/pdf';
    }

    // 8. PDF -> JPG Resimler
    else if (type === 'to-jpg') {
      const baseName = path.basename(files[0].originalname, path.extname(files[0].originalname));
      resultFileName = `${baseName}_Resimleri.zip`;
      resultFilePath = path.join(sessionDir, resultFileName);
      mimeType = 'application/zip';
      await pdfToImagesZip(files[0].path, sessionDir, resultFilePath);
    }

    // 9. Videodan Ses Çıkar (MP4 -> MP3)
    else if (type === 'mp4-to-mp3') {
      const baseName = path.basename(files[0].originalname, path.extname(files[0].originalname));
      resultFileName = `${baseName}.mp3`;
      resultFilePath = path.join(sessionDir, resultFileName);
      mimeType = 'audio/mpeg';
      await extractAudioToMp3(files[0].path, resultFilePath);
    } else {
      throw new Error('Geçersiz veya desteklenmeyen dönüştürme türü.');
    }

    // Register download
    const downloadId = uuidv4();
    registerDownload(downloadId, resultFilePath, resultFileName, mimeType);

    res.json({
      success: true,
      downloadUrl: `/api/download/${downloadId}`,
      fileName: resultFileName
    });
  } catch (err) {
    console.error('Conversion Route Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Dönüştürme sırasında hata oluştu.' });
  } finally {
    // Clean uploaded input files
    for (const f of files) {
      try {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      } catch (e) {}
    }
  }
});

module.exports = router;
