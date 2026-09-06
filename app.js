// HTML to PDF Studio - Main Application Logic

(function() {
  // Standard paper formats with millimeter dimensions
  const FORMAT_SIZES = {
    a4: { widthMm: 210, heightMm: 297 },
    letter: { widthMm: 215.9, heightMm: 279.4 },
    legal: { widthMm: 215.9, heightMm: 355.6 },
    a3: { widthMm: 297, heightMm: 420 },
    a5: { widthMm: 148, heightMm: 210 }
  };

  // Application State
  const state = {
    files: [],
    activeFileId: null,
    currentHtml: '',
    previewZoom: 0.85,
    settings: {
      format: 'a4',
      orientation: 'portrait',
      margin: 6,
      scale: 100,
      autoFit: true,
      backgroundGraphics: true,
      hideEmptyRows: false,
      addPageNumbers: false,
      customCss: ''
    },
    effectiveScale: 1.0
  };

  // DOM Elements
  const elements = {
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileInput'),
    filesContainer: document.getElementById('filesContainer'),
    fileList: document.getElementById('fileList'),
    fileCount: document.getElementById('fileCount'),
    clearFilesBtn: document.getElementById('clearFilesBtn'),
    codeEditor: document.getElementById('codeEditor'),
    applyCodeBtn: document.getElementById('applyCodeBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),

    // Settings
    paperSize: document.getElementById('paperSize'),
    orientation: document.getElementById('orientation'),
    marginPreset: document.getElementById('marginPreset'),
    customMarginGroup: document.getElementById('customMarginGroup'),
    customMarginVal: document.getElementById('customMarginVal'),
    scaleSlider: document.getElementById('scaleSlider'),
    scaleVal: document.getElementById('scaleVal'),
    autoFitWidth: document.getElementById('autoFitWidth'),
    backgroundGraphics: document.getElementById('backgroundGraphics'),
    hideEmptyRows: document.getElementById('hideEmptyRows'),
    addPageNumbers: document.getElementById('addPageNumbers'),
    toggleCssAccordion: document.getElementById('toggleCssAccordion'),
    cssAccordionBody: document.getElementById('cssAccordionBody'),
    cssAccordionArrow: document.getElementById('cssAccordionArrow'),
    customCssInput: document.getElementById('customCssInput'),

    // Progress & Actions
    progressContainer: document.getElementById('progressContainer'),
    progressBarFill: document.getElementById('progressBarFill'),
    progressStatusText: document.getElementById('progressStatusText'),
    progressPercent: document.getElementById('progressPercent'),
    directDownloadBtn: document.getElementById('directDownloadBtn'),
    vectorPrintBtn: document.getElementById('vectorPrintBtn'),
    batchExportBtn: document.getElementById('batchExportBtn'),
    batchCountBadge: document.getElementById('batchCountBadge'),

    // Preview
    activeDocName: document.getElementById('activeDocName'),
    paperDimensionsBadge: document.getElementById('paperDimensionsBadge'),
    previewViewport: document.getElementById('previewViewport'),
    paperWrapper: document.getElementById('paperWrapper'),
    paperSheet: document.getElementById('paperSheet'),
    previewIframe: document.getElementById('previewIframe'),
    emptyState: document.getElementById('emptyState'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    previewZoomLevel: document.getElementById('previewZoomLevel'),
    fitScreenBtn: document.getElementById('fitScreenBtn'),

    toastContainer: document.getElementById('toastContainer')
  };

  // Toast Notification
  function showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'âœ“' : (type === 'error' ? 'âœ•' : 'â„¹');
    toast.innerHTML = `<span style="font-weight: bold;">${icon}</span><span>${message}</span>`;
    
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  // Progress Bar Helper
  function setProgress(visible, percent = 0, text = 'Processing...') {
    if (visible) {
      elements.progressContainer.style.display = 'flex';
      elements.progressBarFill.style.width = `${percent}%`;
      elements.progressPercent.textContent = `${Math.round(percent)}%`;
      elements.progressStatusText.textContent = text;
    } else {
      elements.progressContainer.style.display = 'none';
      elements.progressBarFill.style.width = '0%';
    }
  }

  // Theme Management
  function initTheme() {
    const savedTheme = localStorage.getItem('html2pdf_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('html2pdf_theme', next);
  }

  // Paper Class Update
  function updatePaperSheetClass() {
    const format = state.settings.format;
    const orientation = state.settings.orientation;
    elements.paperSheet.className = `paper-sheet ${format}-${orientation}`;
    
    const formatName = elements.paperSize.options[elements.paperSize.selectedIndex].text.split(' ')[0];
    const orientName = orientation.charAt(0).toUpperCase() + orientation.slice(1);
    elements.paperDimensionsBadge.textContent = `${formatName} ${orientName}`;
  }

  // Build Injected CSS for Preview
  function buildInjectedStyles() {
    const { format, orientation, margin, backgroundGraphics, addPageNumbers, customCss } = state.settings;
    
    let style = `
      @page {
        size: ${format} ${orientation};
        margin: ${margin}mm;
      }
      html, body {
        ${backgroundGraphics ? '-webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;' : ''}
      }
      /* Ensure table cells with borders render crisp solid borders in preview */
      td.lineTableBudgetTd, #mainbody td.lineTableBudgetTd {
        border: 1.5px solid #000000 !important;
        background-color: #ffffff !important;
      }
      td.lineTableTd, #mainbody td.lineTableTd {
        border: 1px solid #000000 !important;
      }
      #notesTable {
        border: 1.5px solid #000000 !important;
      }
      #despatchTable, #despatchTable td {
        border: 1px solid #808080 !important;
      }
    `;

    if (addPageNumbers) {
      style += `
        @bottom-right {
          content: counter(page) " / " counter(pages);
          font-family: sans-serif;
          font-size: 9pt;
          color: #666;
        }
      `;
    }

    if (customCss) {
      style += `\n/* Custom User Styles */\n${customCss}\n`;
    }

    return style;
  }

  // Calculate Page Layout & Scaled Dimensions
  function getLayoutMetrics() {
    const { format, orientation, margin, scale, autoFit } = state.settings;
    const formatInfo = FORMAT_SIZES[format] || FORMAT_SIZES.a4;
    const pageWidthMm = orientation === 'landscape' ? formatInfo.heightMm : formatInfo.widthMm;
    const pageHeightMm = orientation === 'landscape' ? formatInfo.widthMm : formatInfo.heightMm;

    const marginMm = margin || 0;
    const innerWidthMm = Math.max(pageWidthMm - (marginMm * 2), 20);
    const innerHeightMm = Math.max(pageHeightMm - (marginMm * 2), 20);

    const printableWidthPx = Math.round((innerWidthMm / 25.4) * 96);
    const printableHeightPx = Math.round((innerHeightMm / 25.4) * 96);
    const marginPx = Math.round((marginMm / 25.4) * 96);

    return {
      formatInfo,
      pageWidthMm,
      pageHeightMm,
      marginMm,
      innerWidthMm,
      innerHeightMm,
      printableWidthPx,
      printableHeightPx,
      marginPx,
      userScale: scale / 100,
      autoFit
    };
  }

  // Update Live Preview
  function updatePreview(onlyScale = false) {
    if (!state.currentHtml) {
      elements.paperWrapper.style.display = 'none';
      elements.emptyState.style.display = 'flex';
      return;
    }

    elements.emptyState.style.display = 'none';
    elements.paperWrapper.style.display = 'block';

    updatePaperSheetClass();

    const metrics = getLayoutMetrics();

    // Show realistic paper margins visually on the paper sheet
    elements.paperSheet.style.padding = `${metrics.marginPx}px`;
    elements.paperSheet.style.boxSizing = 'border-box';

    const doc = elements.previewIframe.contentDocument || elements.previewIframe.contentWindow.document;

    // Fast path: if only scale changed and iframe already has scaler, adjust styles directly
    if (onlyScale && doc && doc.getElementById('pdf-content-scaler') && doc.getElementById('pdf-content-root')) {
      const scaler = doc.getElementById('pdf-content-scaler');
      const root = doc.getElementById('pdf-content-root');
      const effectiveScale = state.settings.scale / 100;
      state.effectiveScale = effectiveScale;
      elements.scaleVal.textContent = `${state.settings.scale}%`;

      const virtualWidthPx = Math.round(metrics.printableWidthPx / effectiveScale);
      scaler.style.width = `${virtualWidthPx}px`;
      scaler.style.transform = `scale(${effectiveScale})`;
      root.style.width = `${metrics.printableWidthPx}px`;

      const unscaledHeight = Math.max(scaler.scrollHeight, scaler.offsetHeight);
      const scaledHeight = Math.ceil(unscaledHeight * effectiveScale);
      root.style.height = `${scaledHeight}px`;
      elements.previewIframe.style.height = `${Math.max(scaledHeight, metrics.printableHeightPx)}px`;
      return;
    }

    // Initial render pass
    let modifiedHtml = state.currentHtml;
    const initialStyles = `
      <style id="html2pdf-runtime-styles">
        ${buildInjectedStyles()}
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
          background-color: transparent !important;
        }
      </style>
    `;

    if (modifiedHtml.includes('</head>')) {
      modifiedHtml = modifiedHtml.replace('</head>', `${initialStyles}</head>`);
    } else {
      modifiedHtml = `${initialStyles}${modifiedHtml}`;
    }

    doc.open();
    doc.write(modifiedHtml);
    doc.close();

    // Setup scaler wrapper and calculate dimensions
    setTimeout(() => {
      try {
        const body = doc.body;
        if (!body) return;

        // Ensure elements are wrapped in #pdf-content-root and #pdf-content-scaler
        let root = doc.getElementById('pdf-content-root');
        let scaler = doc.getElementById('pdf-content-scaler');
        if (!scaler) {
          root = doc.createElement('div');
          root.id = 'pdf-content-root';
          scaler = doc.createElement('div');
          scaler.id = 'pdf-content-scaler';

          while (body.firstChild) {
            scaler.appendChild(body.firstChild);
          }
          root.appendChild(scaler);
          body.appendChild(root);
        }

        // Handle hideEmptyRows in preview
        const invoiceRows = doc.querySelectorAll('tr.lineTableTr');
        invoiceRows.forEach(tr => {
          const cells = Array.from(tr.querySelectorAll('td'));
          const isEmpty = cells.length > 0 && cells.every(td => {
            const val = td.textContent.replace(/[\s\u00A0\uFEFF]/g, '');
            return val === '';
          });
          if (state.settings.hideEmptyRows && isEmpty) {
            tr.style.display = 'none';
          } else {
            tr.style.display = '';
          }
        });

        // Measure natural content width and height
        scaler.style.cssText = 'width: max-content !important; min-width: 800px !important; transform: none !important; display: inline-block !important;';
        const naturalWidth = Math.max(scaler.scrollWidth, scaler.offsetWidth, 800);
        const naturalHeight = Math.max(scaler.scrollHeight, scaler.offsetHeight);

        // Determine effective scale: fit BOTH width and height on 1 page!
        let effectiveScale = metrics.userScale;
        if (metrics.autoFit) {
          const scaleW = metrics.printableWidthPx / naturalWidth;
          const scaleH = metrics.printableHeightPx / naturalHeight;
          // Scale to fit both dimensions onto 1 single page with a 2% safety margin
          effectiveScale = Number((Math.min(scaleW, scaleH) * 0.98).toFixed(3));
          elements.scaleVal.textContent = `${Math.round(effectiveScale * 100)}% (Auto 1-Page)`;
          elements.scaleSlider.value = Math.round(effectiveScale * 100);
        } else {
          effectiveScale = metrics.userScale;
          elements.scaleVal.textContent = `${Math.round(effectiveScale * 100)}%`;
        }
        state.effectiveScale = effectiveScale;

        // Apply virtual width and CSS transform scaling
        const virtualWidthPx = Math.max(Math.round(metrics.printableWidthPx / effectiveScale), naturalWidth);

        root.style.cssText = `
          width: ${metrics.printableWidthPx}px !important;
          overflow: hidden !important;
          position: relative !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 0 !important;
        `;

        scaler.style.cssText = `
          width: ${virtualWidthPx}px !important;
          transform: scale(${effectiveScale}) !important;
          transform-origin: 0 0 !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
        `;

        // Calculate accurate height and set preview iframe height
        const unscaledHeight = Math.max(scaler.scrollHeight, scaler.offsetHeight);
        let scaledHeight = Math.ceil(unscaledHeight * effectiveScale);
        if (metrics.autoFit && scaledHeight > metrics.printableHeightPx) {
          scaledHeight = metrics.printableHeightPx;
        }
        root.style.height = `${scaledHeight}px`;
        elements.previewIframe.style.height = `${Math.max(scaledHeight, metrics.printableHeightPx)}px`;
      } catch (e) {
        console.warn('Preview sizing warning:', e);
      }
    }, 60);
  }

  // Zoom Controls
  function applyZoom(newZoom) {
    state.previewZoom = Math.min(Math.max(newZoom, 0.3), 2.0);
    elements.paperWrapper.style.transform = `scale(${state.previewZoom})`;
    elements.previewZoomLevel.textContent = `${Math.round(state.previewZoom * 100)}%`;
  }

  function fitToScreen() {
    const viewportWidth = elements.previewViewport.clientWidth - 80;
    const paperWidth = elements.paperSheet.offsetWidth || 800;
    const fittedZoom = Math.min(viewportWidth / paperWidth, 1.2);
    applyZoom(fittedZoom);
  }

  // Switch Active File
  function setActiveFile(fileId) {
    const file = state.files.find(f => f.id === fileId);
    if (!file) return;

    state.activeFileId = fileId;
    state.currentHtml = file.content;
    elements.activeDocName.textContent = file.name;
    elements.codeEditor.value = file.content;

    document.querySelectorAll('.file-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.id === fileId);
    });

    updatePreview();
  }

  // Render File List in Sidebar
  function renderFileList() {
    elements.fileList.innerHTML = '';
    elements.fileCount.textContent = state.files.length;
    elements.batchCountBadge.textContent = state.files.length;

    if (state.files.length === 0) {
      elements.filesContainer.style.display = 'none';
      elements.batchExportBtn.style.display = 'none';
      return;
    }

    elements.filesContainer.style.display = 'flex';
    elements.batchExportBtn.style.display = state.files.length > 1 ? 'inline-flex' : 'none';

    state.files.forEach(file => {
      const item = document.createElement('div');
      item.className = `file-item ${file.id === state.activeFileId ? 'selected' : ''}`;
      item.dataset.id = file.id;

      const sizeKb = (file.size / 1024).toFixed(1);

      item.innerHTML = `
        <div class="file-info" title="${file.name}">
          <span>ğŸ“„</span>
          <span style="font-weight: 500;">${file.name}</span>
          <span style="font-size: 11px; color: var(--text-muted);">(${sizeKb} KB)</span>
        </div>
        <div class="file-actions">
          <button class="btn btn-secondary btn-sm remove-file-btn" title="Remove file" style="padding: 2px 6px;">âœ•</button>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (!e.target.closest('.remove-file-btn')) {
          setActiveFile(file.id);
        }
      });

      const removeBtn = item.querySelector('.remove-file-btn');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFile(file.id);
      });

      elements.fileList.appendChild(item);
    });
  }

  // Add Files to State
  function addFiles(newFiles) {
    newFiles.forEach(file => {
      const existingIdx = state.files.findIndex(f => f.name === file.name);
      if (existingIdx !== -1) {
        state.files[existingIdx] = file;
      } else {
        state.files.push(file);
      }
    });

    renderFileList();
    if (newFiles.length > 0) {
      setActiveFile(newFiles[0].id);
      showToast(`Loaded ${newFiles.length} document${newFiles.length > 1 ? 's' : ''}`, 'success');
    }
  }

  // Remove File
  function removeFile(fileId) {
    state.files = state.files.filter(f => f.id !== fileId);
    renderFileList();

    if (state.activeFileId === fileId) {
      if (state.files.length > 0) {
        setActiveFile(state.files[0].id);
      } else {
        state.activeFileId = null;
        state.currentHtml = '';
        elements.codeEditor.value = '';
        elements.activeDocName.textContent = 'No Document';
        updatePreview();
      }
    }
  }

  // Clear All Files
  function clearAllFiles() {
    state.files = [];
    state.activeFileId = null;
    state.currentHtml = '';
    elements.codeEditor.value = '';
    elements.activeDocName.textContent = 'No Document';
    renderFileList();
    updatePreview();
    showToast('All documents cleared', 'info');
  }

  // Handle Drag & Drop / Input Selection
  function handleFileSelect(fileList) {
    const htmlFiles = Array.from(fileList).filter(f => f.name.match(/\.(html|htm)$/i));
    if (htmlFiles.length === 0) {
      showToast('Please select valid .html or .htm files', 'error');
      return;
    }

    let loadedCount = 0;
    const parsedFiles = [];

    htmlFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        parsedFiles.push({
          id: 'doc_' + Math.random().toString(36).substr(2, 9),
          name: file.name,
          content: e.target.result,
          size: file.size
        });
        loadedCount++;
        if (loadedCount === htmlFiles.length) {
          addFiles(parsedFiles);
        }
      };
      reader.readAsText(file);
    });
  }

  // =========================================================================
  // PDF Conversion Engine 1: Proportional Single-Page Fit (Zero-Clipping)
  // =========================================================================
  async function convertToPdf(docContent, docName) {
    if (!docContent || !docContent.trim()) {
      showToast('No document content to convert', 'error');
      return;
    }

    const metrics = getLayoutMetrics();
    const { format, orientation, backgroundGraphics, customCss } = state.settings;
    const baseName = (docName || 'converted_document').replace(/\.(html|htm)$/i, '');
    const outputFilename = `${baseName}.pdf`;

    setProgress(true, 15, 'Preparing unclipped document layout...');

    try {
      const pdoc = elements.previewIframe.contentDocument || elements.previewIframe.contentWindow.document;

      // Ensure fonts are ready
      if (elements.previewIframe.contentWindow.document.fonts && elements.previewIframe.contentWindow.document.fonts.ready) {
        await Promise.race([
          elements.previewIframe.contentWindow.document.fonts.ready,
          new Promise(r => setTimeout(r, 400))
        ]);
      }

      // 1. Build an off-screen container rendered at 100% natural layout width with NO clipping or height restrictions
      const exportContainer = document.createElement('div');
      exportContainer.className = 'pdf-export-unconstrained';
      if (pdoc.body) {
        if (pdoc.body.id) exportContainer.id = pdoc.body.id;
        if (pdoc.body.className) exportContainer.className += ' ' + pdoc.body.className;
      }
      if (!exportContainer.id) {
        exportContainer.id = 'mainbody';
      }
      exportContainer.style.cssText = `
        position: fixed !important;
        left: -9999px !important;
        top: 0 !important;
        width: 800px !important;
        min-width: 800px !important;
        height: auto !important;
        overflow: visible !important;
        background-color: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        z-index: -999 !important;
      `;

      // Copy all style tags
      pdoc.querySelectorAll('style').forEach(st => {
        exportContainer.appendChild(st.cloneNode(true));
      });

      // Copy link stylesheets
      pdoc.querySelectorAll('link[rel="stylesheet"]').forEach(lk => {
        exportContainer.appendChild(lk.cloneNode(true));
      });

      // Inject runtime print styling
      const runtimePrintStyle = document.createElement('style');
      runtimePrintStyle.textContent = `
        .pdf-export-unconstrained, .pdf-export-unconstrained * {
          box-sizing: border-box;
          ${backgroundGraphics ? '-webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;' : ''}
        }
        /* Ensure table cells with borders (like e-invoice budget & line tables) render crisp solid borders in html2canvas */
        .pdf-export-unconstrained td.lineTableBudgetTd,
        #mainbody td.lineTableBudgetTd,
        td.lineTableBudgetTd {
          border: 1.5px solid #000000 !important;
          background-color: #ffffff !important;
          box-sizing: border-box !important;
        }
        .pdf-export-unconstrained td.lineTableTd,
        #mainbody td.lineTableTd,
        td.lineTableTd {
          border: 1px solid #000000 !important;
          background-color: #ffffff !important;
          box-sizing: border-box !important;
        }
        .pdf-export-unconstrained #notesTable,
        #notesTable {
          border: 1.5px solid #000000 !important;
          box-sizing: border-box !important;
        }
        .pdf-export-unconstrained #despatchTable,
        .pdf-export-unconstrained #despatchTable td,
        #despatchTable,
        #despatchTable td {
          border: 1px solid #808080 !important;
          box-sizing: border-box !important;
        }
        .pdf-export-unconstrained #budgetContainerTable,
        #budgetContainerTable {
          border-collapse: collapse !important;
        }
        ${customCss ? `\n/* User Custom CSS */\n${customCss}\n` : ''}
      `;
      exportContainer.appendChild(runtimePrintStyle);

      // Helper to clone nodes and preserve canvas image content
      function cloneWithCanvases(sourceNode) {
        const clone = sourceNode.cloneNode(true);
        const origCanvases = sourceNode.querySelectorAll ? Array.from(sourceNode.querySelectorAll('canvas')) : [];
        if (sourceNode.tagName === 'CANVAS') origCanvases.unshift(sourceNode);
        const cloneCanvases = clone.querySelectorAll ? Array.from(clone.querySelectorAll('canvas')) : [];
        if (clone.tagName === 'CANVAS') cloneCanvases.unshift(clone);

        for (let i = 0; i < origCanvases.length && i < cloneCanvases.length; i++) {
          const orig = origCanvases[i];
          const cl = cloneCanvases[i];
          cl.width = orig.width;
          cl.height = orig.height;
          const ctx = cl.getContext('2d');
          if (ctx) {
            ctx.drawImage(orig, 0, 0);
          }
        }
        return clone;
      }

      // Clone from preview scaler or body
      const previewScaler = pdoc.getElementById('pdf-content-scaler');
      const sourceNodes = previewScaler ? previewScaler.childNodes : (pdoc.body ? pdoc.body.childNodes : []);
      Array.from(sourceNodes).forEach(node => {
        if (node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
          exportContainer.appendChild(cloneWithCanvases(node));
        }
      });

      // Handle hideEmptyRows in exportContainer
      if (state.settings.hideEmptyRows) {
        exportContainer.querySelectorAll('tr.lineTableTr').forEach(tr => {
          const cells = Array.from(tr.querySelectorAll('td'));
          const isEmpty = cells.length > 0 && cells.every(td => {
            const val = td.textContent.replace(/[\s\u00A0\uFEFF]/g, '');
            return val === '';
          });
          if (isEmpty) {
            tr.remove();
          }
        });
      }

      document.body.appendChild(exportContainer);

      setProgress(true, 40, 'Rendering high-resolution 2D canvas...');

      // 2. Prepare full html2pdf options upfront with proper margins and jsPDF units
      const marginMm = metrics.marginMm || 6;
      const formatInfo = FORMAT_SIZES[format] || FORMAT_SIZES.a4;
      const pageWMm = orientation === 'landscape' ? formatInfo.heightMm : formatInfo.widthMm;
      const pageHMm = orientation === 'landscape' ? formatInfo.widthMm : formatInfo.heightMm;

      const opt = {
        margin: [marginMm, marginMm, marginMm, marginMm],
        filename: outputFilename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2, // High-DPI 2x
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: {
          unit: 'mm',
          format: format,
          orientation: orientation
        }
      };

      // 3. Render unconstrained element to high-res canvas directly
      const canvas = typeof html2canvas !== 'undefined'
        ? await html2canvas(exportContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0
          })
        : await html2pdf().from(exportContainer).set(opt).toCanvas().get('canvas');

      // Remove the off-screen export container
      exportContainer.remove();

      setProgress(true, 70, 'Fitting document onto single A4 page...');

      // 4. Create fresh, clean jsPDF instance directly (bypassing html2pdf internal slicing bugs)
      const jsPdfConstructor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      let pdf;
      if (jsPdfConstructor) {
        pdf = new jsPdfConstructor({
          orientation: orientation,
          unit: 'mm',
          format: format
        });
      } else {
        const worker = html2pdf().set(opt).from(exportContainer);
        pdf = await worker.toPdf().get('pdf');
      }

      // 5. Fit entire canvas within printable bounds
      const printWMm = Math.max(pageWMm - (marginMm * 2), 20);
      const printHMm = Math.max(pageHMm - (marginMm * 2), 20);

      const scaleW = printWMm / canvas.width;
      const scaleH = printHMm / canvas.height;
      const scale = Math.min(scaleW, scaleH);

      const finalWMm = Number((canvas.width * scale).toFixed(2));
      const finalHMm = Number((canvas.height * scale).toFixed(2));

      // Center horizontally and align top margin
      const xOffset = Number((marginMm + (printWMm - finalWMm) / 2).toFixed(2));
      const yOffset = Number(marginMm.toFixed(2));

      // Clear any auto-generated extra pages to guarantee 1 page
      const totalPages = pdf.internal.getNumberOfPages();
      for (let p = totalPages; p > 1; p--) {
        pdf.deletePage(p);
      }

      if (pdf.internal.getNumberOfPages() === 0) {
        pdf.addPage(format, orientation);
      }

      // Draw clear background and then our full, perfectly scaled canvas image
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWMm, pageHMm, 'F');
      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWMm, finalHMm);

      setProgress(true, 90, 'Saving PDF file...');

      // 6. Trigger download directly via PDF blob
      pdf.save(outputFilename);

      setProgress(true, 100, 'Complete!');
      setTimeout(() => setProgress(false), 800);

      showToast(`Successfully downloaded "${outputFilename}" (Guaranteed 1-Page)!`, 'success', 4000);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      setProgress(false);
      showToast('Error generating PDF: ' + error.message, 'error', 5000);
    }
  }

  // =========================================================================
  // PDF Conversion Engine 2: Native Chromium Vector Print (100% WYSIWYG)
  // =========================================================================
  function printNativeVector() {
    if (!state.currentHtml || !state.currentHtml.trim()) {
      showToast('No document content to print', 'error');
      return;
    }

    showToast('Opening clean print window. Choose "Save as PDF" for 100% crisp vector output.', 'info', 4500);

    try {
      const printStyles = `
        <style>
          @page {
            size: A4 portrait;
            margin: 4mm 6mm;
          }
          @media print {
            html, body {
              width: 100% !important;
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #mainbody {
              zoom: 0.86 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            table {
              page-break-inside: avoid !important;
            }
          }
          @media screen {
            body {
              background: #f0f0f0;
              padding: 20px;
              display: flex;
              justify-content: center;
            }
            #mainbody {
              background: white;
              padding: 20px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
              zoom: 0.86;
            }
          }
        </style>
      `;

      let fullHtml = state.currentHtml;
      if (fullHtml.includes('</head>')) {
        fullHtml = fullHtml.replace('</head>', `${printStyles}</head>`);
      } else {
        fullHtml = `${printStyles}${fullHtml}`;
      }

      // Open a clean dedicated window (prevents any UI lockup or modal iframe freeze)
      const printWindow = window.open('', '_blank', 'width=900,height=1000');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(fullHtml);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);
      } else {
        // Fallback if popup blocked: use hidden iframe
        const hiddenPrintFrame = document.createElement('iframe');
        hiddenPrintFrame.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1000px;height:1200px;border:none;';
        document.body.appendChild(hiddenPrintFrame);
        const fdoc = hiddenPrintFrame.contentDocument || hiddenPrintFrame.contentWindow.document;
        fdoc.open();
        fdoc.write(fullHtml);
        fdoc.close();
        setTimeout(() => {
          hiddenPrintFrame.contentWindow.focus();
          hiddenPrintFrame.contentWindow.print();
          setTimeout(() => hiddenPrintFrame.remove(), 60000);
        }, 500);
      }
    } catch (err) {
      console.error('Print Error:', err);
      showToast('Print failed: ' + err.message, 'error');
    }
  }

  // Batch Export All Files
  async function batchExportAll() {
    if (state.files.length === 0) return;

    elements.batchExportBtn.disabled = true;
    const total = state.files.length;

    for (let i = 0; i < total; i++) {
      const file = state.files[i];
      const percent = ((i + 1) / total) * 100;
      setProgress(true, percent, `Converting ${i + 1} of ${total}: ${file.name}`);
      
      setActiveFile(file.id);
      await new Promise(r => setTimeout(r, 400));
      await convertToPdf(file.content, file.name);
      await new Promise(r => setTimeout(r, 500));
    }

    elements.batchExportBtn.disabled = false;
    setProgress(false);
    showToast(`Completed batch export of ${total} files!`, 'success');
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Theme toggle
    elements.themeToggleBtn.addEventListener('click', toggleTheme);

    // Tab switching
    elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.tabBtns.forEach(b => b.classList.remove('active'));
        elements.tabPanes.forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        const targetPane = document.getElementById(btn.dataset.tab);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    // Drag and drop zone
    elements.dropzone.addEventListener('click', () => elements.fileInput.click());

    elements.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.dropzone.classList.add('dragover');
    });

    elements.dropzone.addEventListener('dragleave', () => {
      elements.dropzone.classList.remove('dragover');
    });

    elements.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      elements.dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files);
      }
    });

    elements.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelect(e.target.files);
      }
    });

    // Clear all files
    elements.clearFilesBtn.addEventListener('click', clearAllFiles);

    // Code Editor Apply button
    elements.applyCodeBtn.addEventListener('click', () => {
      const updatedCode = elements.codeEditor.value;
      state.currentHtml = updatedCode;

      if (state.activeFileId) {
        const file = state.files.find(f => f.id === state.activeFileId);
        if (file) file.content = updatedCode;
      }

      updatePreview();
      showToast('HTML code changes applied', 'success');
    });

    // Debounced live typing update from code editor
    let codeDebounceTimer = null;
    elements.codeEditor.addEventListener('input', () => {
      clearTimeout(codeDebounceTimer);
      codeDebounceTimer = setTimeout(() => {
        state.currentHtml = elements.codeEditor.value;
        if (state.activeFileId) {
          const file = state.files.find(f => f.id === state.activeFileId);
          if (file) file.content = state.currentHtml;
        }
        updatePreview();
      }, 500);
    });


    // Settings Changes
    elements.paperSize.addEventListener('change', (e) => {
      state.settings.format = e.target.value;
      updatePreview();
    });

    elements.orientation.addEventListener('change', (e) => {
      state.settings.orientation = e.target.value;
      updatePreview();
    });

    elements.marginPreset.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        elements.customMarginGroup.style.display = 'flex';
        state.settings.margin = parseInt(elements.customMarginVal.value, 10) || 0;
      } else {
        elements.customMarginGroup.style.display = 'none';
        state.settings.margin = parseInt(e.target.value, 10);
      }
      updatePreview();
    });

    elements.customMarginVal.addEventListener('input', (e) => {
      state.settings.margin = parseInt(e.target.value, 10) || 0;
      updatePreview();
    });

    elements.autoFitWidth.addEventListener('change', (e) => {
      state.settings.autoFit = e.target.checked;
      updatePreview();
    });

    elements.scaleSlider.addEventListener('input', (e) => {
      state.settings.scale = parseInt(e.target.value, 10);
      state.settings.autoFit = false;
      elements.autoFitWidth.checked = false;
      elements.scaleVal.textContent = `${state.settings.scale}%`;
      updatePreview(true);
    });

    elements.backgroundGraphics.addEventListener('change', (e) => {
      state.settings.backgroundGraphics = e.target.checked;
      updatePreview();
    });

    elements.hideEmptyRows.addEventListener('change', (e) => {
      state.settings.hideEmptyRows = e.target.checked;
      updatePreview();
    });

    elements.addPageNumbers.addEventListener('change', (e) => {
      state.settings.addPageNumbers = e.target.checked;
      updatePreview();
    });

    // Custom CSS Accordion
    elements.toggleCssAccordion.addEventListener('click', () => {
      const isOpen = elements.cssAccordionBody.classList.toggle('open');
      elements.cssAccordionArrow.textContent = isOpen ? 'â–²' : 'â–¼';
    });

    elements.customCssInput.addEventListener('input', (e) => {
      state.settings.customCss = e.target.value;
      updatePreview();
    });

    // Zoom Controls
    elements.zoomInBtn.addEventListener('click', () => applyZoom(state.previewZoom + 0.1));
    elements.zoomOutBtn.addEventListener('click', () => applyZoom(state.previewZoom - 0.1));
    elements.fitScreenBtn.addEventListener('click', fitToScreen);

    // Export Action Buttons
    elements.directDownloadBtn.addEventListener('click', () => {
      const activeFile = state.files.find(f => f.id === state.activeFileId);
      const name = activeFile ? activeFile.name : 'document.html';
      convertToPdf(state.currentHtml, name);
    });

    elements.vectorPrintBtn.addEventListener('click', () => {
      printNativeVector();
    });

    elements.batchExportBtn.addEventListener('click', batchExportAll);

    // Window resize adjustment
    window.addEventListener('resize', () => {
      if (window.innerWidth < 1200) {
        fitToScreen();
      }
    });
  }

  // Initialize
  function init() {
    initTheme();
    setupEventListeners();
    updatePreview();
    setTimeout(fitToScreen, 100);
  }

  init();
})();
