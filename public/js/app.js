document.addEventListener('DOMContentLoaded', () => {
  // Service Worker Registration for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.log('SW reg error:', err));
  }

  // Tool Definitions & Accept types
  const TOOL_CONFIG = {
    'to-pdf': {
      title: 'PDF Yap',
      sub: 'Resim veya Office dosyalarını PDF\'e çevirin',
      accept: '.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/jpeg,image/png,image/webp,.txt,.odt',
      multiple: true,
      isMedia: false,
      btnText: 'PDF\'e Dönüştür'
    },
    'to-word': {
      title: 'Word Yap',
      sub: 'PDF belgelerini düzenlenebilir DOCX formatına çevirin',
      accept: '.pdf,application/pdf',
      multiple: false,
      isMedia: false,
      btnText: 'Word\'e Dönüştür'
    },
    'to-excel': {
      title: 'Excel Yap',
      sub: 'PDF içindeki tabloları XLSX formatına çevirin',
      accept: '.pdf,application/pdf',
      multiple: false,
      isMedia: false,
      btnText: 'Excel\'e Dönüştür'
    },
    'to-ppt': {
      title: 'PowerPoint Yap',
      sub: 'PDF sayfalarını PPTX sunumuna çevirin',
      accept: '.pdf,application/pdf',
      multiple: false,
      isMedia: false,
      btnText: 'Sunuma Dönüştür'
    },
    'to-jpg': {
      title: 'Resim Yap (JPG)',
      sub: 'PDF sayfalarını yüksek çözünürlüklü JPG resimlerine çevirin',
      accept: '.pdf,application/pdf',
      multiple: false,
      isMedia: false,
      btnText: 'Resimlere Dönüştür'
    },
    'to-pdfa': {
      title: 'PDF/A Yap',
      sub: 'Uzun süreli dijital arşivleme formatına çevirin',
      accept: '.pdf,application/pdf',
      multiple: false,
      isMedia: false,
      btnText: 'PDF/A Yap'
    },
    'merge-pdf': {
      title: 'PDF Birleştir',
      sub: 'Birden fazla PDF belgesini tek bir dökümanda toplayın',
      accept: '.pdf,application/pdf',
      multiple: true,
      isMedia: false,
      btnText: 'PDF\'leri Birleştir'
    },
    'split-pdf': {
      title: 'PDF Parçala',
      sub: 'PDF belgesinin sayfalarını ayrı dosyalara bölün',
      accept: '.pdf,application/pdf',
      multiple: false,
      isMedia: false,
      btnText: 'PDF\'i Parçala'
    },
    'to-mp3': {
      title: 'Müzik İndir (MP3)',
      sub: 'YouTube veya müzik linkini yapıştırın',
      isMedia: true,
      hasQuality: false,
      btnText: 'MP3 İndir'
    },
    'to-mp4': {
      title: 'Video İndir (MP4)',
      sub: 'YouTube video linkini yapıştırın',
      isMedia: true,
      hasQuality: true,
      btnText: 'Video İndir'
    },
    'to-social': {
      title: 'Sosyal Medya İndirici',
      sub: 'TikTok, Instagram veya Twitter video linkini yapıştırın',
      isMedia: true,
      hasQuality: false,
      btnText: 'Medyayı İndir'
    },
    'mp4-to-mp3': {
      title: 'Videodan Ses Çıkar',
      sub: 'Cihazınızdaki videodan sesi (MP3) ayıklayın',
      accept: 'video/mp4,video/quicktime,video/mkv,video/*',
      multiple: false,
      isMedia: false,
      btnText: 'Sesi Çıkar'
    }
  };

  // State
  let currentToolKey = null;
  let selectedFiles = [];
  let selectedQuality = 'best';
  let pollInterval = null;

  // DOM Elements
  const views = {
    home: document.getElementById('view-home'),
    converter: document.getElementById('view-converter'),
    history: document.getElementById('view-history'),
    settings: document.getElementById('view-settings')
  };

  const navBtns = document.querySelectorAll('.nav-btn');
  const toolCards = document.querySelectorAll('.tool-card');
  const btnBackHome = document.getElementById('btn-back-home');

  const convHeading = document.getElementById('conv-heading');
  const convSubheading = document.getElementById('conv-subheading');
  const fileDropZone = document.getElementById('file-drop-zone');
  const fileInputEl = document.getElementById('file-input-el');
  const dropTitle = document.getElementById('drop-title');
  const dropHint = document.getElementById('drop-hint');
  const selectedFilesList = document.getElementById('selected-files-list');

  const urlInputZone = document.getElementById('url-input-zone');
  const mediaUrlInput = document.getElementById('media-url-input');
  const btnPasteClipboard = document.getElementById('btn-paste-clipboard');
  const qualitySelectorBox = document.getElementById('quality-selector-box');
  const qualityChips = document.querySelectorAll('.chip-option');

  const btnStartProcess = document.getElementById('btn-start-process');
  const progressBox = document.getElementById('progress-box');
  const progressStatusText = document.getElementById('progress-status-text');
  const progressPercentText = document.getElementById('progress-percent-text');
  const progressBarFill = document.getElementById('progress-bar-fill');

  const downloadCard = document.getElementById('download-card');
  const downloadFileName = document.getElementById('download-file-name');
  const btnDownloadLink = document.getElementById('btn-download-link');

  const historyContainer = document.getElementById('history-container');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // Toast Notification
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'error' ? 'ph-warning-circle' : type === 'success' ? 'ph-check-circle' : 'ph-info';
    toast.innerHTML = `<i class="ph-bold ${icon}" style="font-size: 18px;"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // View Navigation
  function switchView(viewName) {
    Object.values(views).forEach((v) => v.classList.remove('active'));
    if (views[viewName]) {
      views[viewName].classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      navBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-target').replace('view-', '');
      switchView(target);
      if (target === 'history') renderHistory();
    });
  });

  btnBackHome.addEventListener('click', () => {
    resetConverter();
    navBtns.forEach((b) => b.classList.remove('active'));
    navBtns[0].classList.add('active');
    switchView('home');
  });

  // Open Converter Tool
  toolCards.forEach((card) => {
    card.addEventListener('click', () => {
      const toolKey = card.getAttribute('data-tool');
      openTool(toolKey);
    });
  });

  function openTool(toolKey) {
    const config = TOOL_CONFIG[toolKey];
    if (!config) return;

    currentToolKey = toolKey;
    resetConverter();

    convHeading.textContent = config.title;
    convSubheading.textContent = config.sub;
    btnStartProcess.innerHTML = `<i class="ph ph-lightning"></i> ${config.btnText}`;

    if (config.isMedia) {
      fileDropZone.style.display = 'none';
      urlInputZone.style.display = 'flex';
      qualitySelectorBox.style.display = config.hasQuality ? 'flex' : 'none';
      mediaUrlInput.value = '';
    } else {
      fileDropZone.style.display = 'flex';
      urlInputZone.style.display = 'none';
      qualitySelectorBox.style.display = 'none';
      fileInputEl.accept = config.accept || '*/*';
      fileInputEl.multiple = !!config.multiple;
      dropTitle.textContent = config.multiple ? 'Dosyaları Seçmek İçin Dokunun' : 'Dosya Seçmek İçin Dokunun';
      dropHint.textContent = config.multiple ? 'Birden fazla dosya seçebilirsiniz' : 'Tek bir dosya seçin';
    }

    switchView('converter');
  }

  function resetConverter() {
    selectedFiles = [];
    selectedQuality = 'best';
    clearInterval(pollInterval);
    pollInterval = null;

    fileInputEl.value = '';
    mediaUrlInput.value = '';
    selectedFilesList.innerHTML = '';
    progressBox.style.display = 'none';
    downloadCard.style.display = 'none';
    progressBarFill.style.width = '0%';
    progressPercentText.textContent = '0%';
    btnStartProcess.disabled = true;

    qualityChips.forEach((c) => c.classList.remove('active'));
    qualityChips[0].classList.add('active');
  }

  // File Handling
  fileDropZone.addEventListener('click', () => fileInputEl.click());

  fileInputEl.addEventListener('change', (e) => {
    handleFiles(Array.from(e.target.files));
  });

  fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropZone.classList.add('dragover');
  });

  fileDropZone.addEventListener('dragleave', () => {
    fileDropZone.classList.remove('dragover');
  });

  fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });

  function handleFiles(files) {
    const config = TOOL_CONFIG[currentToolKey];
    if (!config) return;

    if (config.multiple) {
      selectedFiles = [...selectedFiles, ...files];
    } else {
      selectedFiles = [files[0]];
    }

    renderFileList();
    btnStartProcess.disabled = selectedFiles.length === 0;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function renderFileList() {
    selectedFilesList.innerHTML = '';
    selectedFiles.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <div class="file-item-info">
          <i class="ph-duotone ph-file" style="font-size: 20px; color: #818cf8;"></i>
          <div>
            <div class="file-item-name">${file.name}</div>
            <div class="file-item-size">${formatBytes(file.size)}</div>
          </div>
        </div>
        <button type="button" class="btn-remove-file" data-index="${index}">
          <i class="ph-bold ph-x"></i>
        </button>
      `;
      selectedFilesList.appendChild(item);
    });

    // Remove file listener
    selectedFilesList.querySelectorAll('.btn-remove-file').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        selectedFiles.splice(idx, 1);
        renderFileList();
        btnStartProcess.disabled = selectedFiles.length === 0;
      });
    });
  }

  // URL Input & Quality
  mediaUrlInput.addEventListener('input', () => {
    btnStartProcess.disabled = !mediaUrlInput.value.trim();
  });

  btnPasteClipboard.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        mediaUrlInput.value = text;
        btnStartProcess.disabled = false;
        showToast('Link panodan yapıştırıldı!', 'success');
      }
    } catch (err) {
      showToast('Panoya erişilemedi, lütfen linki elle yapıştırın.', 'error');
    }
  });

  qualityChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      qualityChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      selectedQuality = chip.getAttribute('data-quality');
    });
  });

  // Action Button Process Trigger
  btnStartProcess.addEventListener('click', () => {
    const config = TOOL_CONFIG[currentToolKey];
    if (!config) return;

    if (config.isMedia) {
      startMediaDownload();
    } else {
      startFileConversion();
    }
  });

  // 1. File Conversion Handler
  async function startFileConversion() {
    if (selectedFiles.length === 0) return;

    btnStartProcess.disabled = true;
    progressBox.style.display = 'flex';
    downloadCard.style.display = 'none';

    progressStatusText.textContent = 'Dosyalar yükleniyor ve hazırlanıyor...';
    progressBarFill.style.width = '20%';
    progressPercentText.textContent = '20%';

    const formData = new FormData();
    formData.append('type', currentToolKey);
    selectedFiles.forEach((file) => formData.append('files', file));

    // Simulated progress tick while server converts
    let curPercent = 25;
    const progressTimer = setInterval(() => {
      if (curPercent < 90) {
        curPercent += Math.floor(Math.random() * 8) + 3;
        if (curPercent > 90) curPercent = 90;
        progressBarFill.style.width = `${curPercent}%`;
        progressPercentText.textContent = `${curPercent}%`;
        progressStatusText.textContent = 'Dönüştürme işlemi yapılıyor...';
      }
    }, 400);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressTimer);
      const data = await response.json();

      if (data.success && data.downloadUrl) {
        progressBarFill.style.width = '100%';
        progressPercentText.textContent = '100%';
        progressStatusText.textContent = 'İşlem Başarıyla Tamamlandı!';

        showDownloadCard(data.downloadUrl, data.fileName);
        saveToHistory(TOOL_CONFIG[currentToolKey].title, data.fileName);
        showToast('Dönüştürme tamamlandı!', 'success');
      } else {
        throw new Error(data.error || 'Dönüştürme başarısız oldu.');
      }
    } catch (err) {
      clearInterval(progressTimer);
      progressStatusText.textContent = 'Hata oluştu!';
      showToast(err.message || 'Dönüştürme hatası!', 'error');
    } finally {
      btnStartProcess.disabled = false;
    }
  }

  // 2. Media Download Handler
  async function startMediaDownload() {
    const url = mediaUrlInput.value.trim();
    if (!url) return;

    btnStartProcess.disabled = true;
    progressBox.style.display = 'flex';
    downloadCard.style.display = 'none';

    progressStatusText.textContent = 'Sunucuya bağlanıyor...';
    progressBarFill.style.width = '10%';
    progressPercentText.textContent = '10%';

    try {
      const startRes = await fetch('/api/media/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          type: currentToolKey,
          quality: selectedQuality
        })
      });

      const startData = await startRes.json();
      if (!startData.success || !startData.taskId) {
        throw new Error(startData.error || 'İndirme başlatılamadı.');
      }

      // Poll task progress
      pollTaskProgress(startData.taskId);
    } catch (err) {
      progressStatusText.textContent = 'Hata!';
      showToast(err.message || 'İndirme başlatılamadı.', 'error');
      btnStartProcess.disabled = false;
    }
  }

  function pollTaskProgress(taskId) {
    clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/media/status/${taskId}`);
        const data = await res.json();

        if (data.success && data.task) {
          const task = data.task;
          const percent = task.percent || 0;
          progressBarFill.style.width = `${percent}%`;
          progressPercentText.textContent = `${percent}%`;
          progressStatusText.textContent = task.text || 'İndiriliyor...';

          if (task.status === 'ready' && task.downloadUrl) {
            clearInterval(pollInterval);
            progressBarFill.style.width = '100%';
            progressPercentText.textContent = '100%';
            progressStatusText.textContent = 'İndirme Tamamlandı!';

            showDownloadCard(task.downloadUrl, task.fileName);
            saveToHistory(TOOL_CONFIG[currentToolKey].title, task.fileName);
            showToast('Medya hazır!', 'success');
            btnStartProcess.disabled = false;
          } else if (task.status === 'error') {
            clearInterval(pollInterval);
            showToast(task.text || 'İndirme başarısız oldu.', 'error');
            btnStartProcess.disabled = false;
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1000);
  }

  function showDownloadCard(downloadUrl, fileName) {
    downloadCard.style.display = 'flex';
    downloadFileName.textContent = fileName;
    btnDownloadLink.href = downloadUrl;
    btnDownloadLink.setAttribute('download', fileName);
    downloadCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Local History Management
  function saveToHistory(toolName, fileName) {
    try {
      const history = JSON.parse(localStorage.getItem('switchforge_history') || '[]');
      history.unshift({
        tool: toolName,
        fileName: fileName,
        date: new Date().toLocaleString('tr-TR')
      });
      if (history.length > 50) history.pop();
      localStorage.setItem('switchforge_history', JSON.stringify(history));
    } catch (e) {}
  }

  function renderHistory() {
    try {
      const history = JSON.parse(localStorage.getItem('switchforge_history') || '[]');
      if (history.length === 0) {
        historyContainer.innerHTML = `
          <div class="empty-state">
            <i class="ph-duotone ph-tray"></i>
            <div>Henüz yapılmış bir işlem yok.</div>
          </div>
        `;
        return;
      }

      historyContainer.innerHTML = '';
      history.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'history-item';
        row.innerHTML = `
          <div class="history-item-left">
            <i class="ph-duotone ph-check-circle" style="font-size: 22px; color: #34d399;"></i>
            <div>
              <div class="history-item-type">${item.tool}</div>
              <div class="history-item-date">${item.fileName} • ${item.date}</div>
            </div>
          </div>
        `;
        historyContainer.appendChild(row);
      });
    } catch (e) {
      historyContainer.innerHTML = '<div class="empty-state">Geçmiş yüklenemedi.</div>';
    }
  }

  btnClearHistory.addEventListener('click', () => {
    localStorage.removeItem('switchforge_history');
    renderHistory();
    showToast('Geçmiş temizlendi.', 'info');
  });
});
