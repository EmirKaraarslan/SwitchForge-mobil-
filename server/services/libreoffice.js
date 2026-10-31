const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execFilePromise = util.promisify(execFile);

function getSofficeExecutable() {
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
      path.join(__dirname, '..', '..', '..', 'Downloads', 'the crafter', 'switchforge', 'tools', 'LibreOfficePortable', 'App', 'libreoffice', 'program', 'soffice.exe')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return 'soffice.exe';
  }
  // Linux / Docker
  return 'soffice';
}

async function convertWithLibreOffice(inputPath, outputDir, targetFormat) {
  const soffice = getSofficeExecutable();
  let args = ['--headless'];

  switch (targetFormat) {
    case 'pdf':
      args.push('--convert-to', 'pdf', inputPath, '--outdir', outputDir);
      break;
    case 'docx':
      args.push('--infilter=writer_pdf_import', '--convert-to', 'docx', inputPath, '--outdir', outputDir);
      break;
    case 'xlsx':
      args.push('--convert-to', 'xlsx', inputPath, '--outdir', outputDir);
      break;
    case 'pptx':
      args.push('--infilter=impress_pdf_import', '--convert-to', 'pptx', inputPath, '--outdir', outputDir);
      break;
    case 'pdfa':
      args.push(
        '--infilter=writer_pdf_import',
        '--convert-to',
        'pdf:writer_pdf_Export:{"SelectPdfVersion":{"type":"long","value":"1"}}',
        inputPath,
        '--outdir',
        outputDir
      );
      break;
    default:
      throw new Error(`Desteklenmeyen dönüştürme formatı: ${targetFormat}`);
  }

  await execFilePromise(soffice, args);

  const extMap = {
    pdf: '.pdf',
    docx: '.docx',
    xlsx: '.xlsx',
    pptx: '.pptx',
    pdfa: '.pdf'
  };

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const expectedOut = path.join(outputDir, `${baseName}${extMap[targetFormat]}`);

  if (fs.existsSync(expectedOut)) {
    return expectedOut;
  }

  // Fallback scan
  const files = fs.readdirSync(outputDir);
  for (const f of files) {
    if (f.startsWith(baseName) && f.endsWith(extMap[targetFormat])) {
      return path.join(outputDir, f);
    }
  }

  throw new Error('Dönüştürme dosyası oluşturulamadı.');
}

module.exports = {
  convertWithLibreOffice,
  getSofficeExecutable
};
