const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);

// Merge multiple PDFs into one
async function mergePdfs(pdfPaths, outputPath) {
  const mergedPdf = await PDFDocument.create();

  for (const filePath of pdfPaths) {
    const pdfBytes = fs.readFileSync(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    const pageIndices = pdf.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfBytes = await mergedPdf.save();
  fs.writeFileSync(outputPath, mergedPdfBytes);
  return outputPath;
}

// Split PDF into single-page PDFs and zip them
async function splitPdfToZip(pdfPath, outputZipPath) {
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdf = await PDFDocument.load(pdfBytes);
  const totalPages = pdf.getPageCount();
  const baseName = path.basename(pdfPath, path.extname(pdfPath));

  return new Promise(async (resolve, reject) => {
    const output = fs.createWriteStream(outputZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(outputZipPath));
    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    for (let i = 0; i < totalPages; i++) {
      const singleDoc = await PDFDocument.create();
      const [copiedPage] = await singleDoc.copyPages(pdf, [i]);
      singleDoc.addPage(copiedPage);
      const singleBytes = await singleDoc.save();
      const pageFileName = `${baseName}_Sayfa_${i + 1}.pdf`;
      archive.append(Buffer.from(singleBytes), { name: pageFileName });
    }

    await archive.finalize();
  });
}

// Convert Images to Single PDF
async function imagesToPdf(imagePaths, outputPath) {
  const pdfDoc = await PDFDocument.create();

  for (const imgPath of imagePaths) {
    const imgBytes = fs.readFileSync(imgPath);
    const ext = path.extname(imgPath).toLowerCase();
    let img;
    if (ext === '.png') {
      img = await pdfDoc.embedPng(imgBytes);
    } else {
      img = await pdfDoc.embedJpg(imgBytes);
    }
    const dims = img.scale(1);
    const page = pdfDoc.addPage([dims.width, dims.height]);
    page.drawImage(img, { x: 0, y: 0, width: dims.width, height: dims.height });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  return outputPath;
}

// Convert PDF to JPG Images and zip them
async function pdfToImagesZip(pdfPath, tempDir, outputZipPath) {
  const baseName = path.basename(pdfPath, path.extname(pdfPath));
  const imagesPrefix = path.join(tempDir, 'page');

  // Try pdftoppm (poppler-utils)
  let pdftoppmCmd = 'pdftoppm';
  if (process.platform === 'win32') {
    // Check if poppler is installed in tools or standard paths
    const winPoppler = path.join(
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
      'pdf-poppler',
      'vender',
      'poppler',
      'win32',
      'bin',
      'pdftoppm.exe'
    );
    if (fs.existsSync(winPoppler)) {
      pdftoppmCmd = winPoppler;
    }
  }

  try {
    await execFilePromise(pdftoppmCmd, ['-jpeg', '-r', '150', pdfPath, imagesPrefix]);
  } catch (err) {
    console.error('pdftoppm error:', err);
    throw new Error('PDF resme dönüştürülürken hata oluştu. Sunucu poppler desteğini kontrol edin.');
  }

  // Find generated jpg files
  const files = fs.readdirSync(tempDir).filter((f) => f.startsWith('page') && f.endsWith('.jpg'));
  if (files.length === 0) {
    throw new Error('PDF sayfaları resme dönüştürülemedi.');
  }

  // Zip images
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(outputZipPath));
    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    files.sort().forEach((file, idx) => {
      const filePath = path.join(tempDir, file);
      archive.file(filePath, { name: `${baseName}_Sayfa_${idx + 1}.jpg` });
    });

    archive.finalize();
  });
}

module.exports = {
  mergePdfs,
  splitPdfToZip,
  imagesToPdf,
  pdfToImagesZip
};
