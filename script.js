document.addEventListener('DOMContentLoaded', () => {
    const converterArea = document.getElementById('converter-area');
    const dropZoneLarge = document.getElementById('drop-zone');
    const dropZoneSmall = document.getElementById('drop-zone-small');
    const globalDropOverlay = document.getElementById('global-drop-overlay');
    const fileInput = document.getElementById('file-input');
    const selectFilesBtn = document.getElementById('select-files-btn');
    const filesContainer = document.getElementById('files-container');
    const formatSelect = document.getElementById('format-select');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const actionButtonsDiv = document.getElementById('action-buttons');
    const logoBtn = document.getElementById('logo-btn');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityValue = document.getElementById('quality-value');
    const namingRuleSelect = document.getElementById('naming-rule-select');
    const prefixInput = document.getElementById('prefix-input');
    const suffixInput = document.getElementById('suffix-input');
    const namingExample = document.getElementById('naming-example');
    const progressArea = document.getElementById('progress-area');
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    const cancelConversionBtn = document.getElementById('cancel-conversion-btn');
    let fileQueue = [];
    let isConverting = false;
    let conversionCancelled = false;
    let dragCounter = 0;
    const ICONS = {
        trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
        download: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`
    };
    const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.avif', '.tiff', '.nef', '.cr2', '.arw', '.rw2'];
    const RAW_EXTENSIONS = ['.nef', '.cr2', '.arw', '.rw2'];
    const preventDefaults = e => {
        e.preventDefault();
        e.stopPropagation();
    };
    window.addEventListener('dragover', preventDefaults);
    window.addEventListener('drop', preventDefaults);
    window.addEventListener('dragenter', e => {
        preventDefaults(e);
        if (isConverting) return;
        dragCounter++;
        globalDropOverlay.classList.add('visible');
    });
    window.addEventListener('dragleave', e => {
        preventDefaults(e);
        dragCounter--;
        if (dragCounter === 0) {
            globalDropOverlay.classList.remove('visible');
        }
    });
    window.addEventListener('drop', e => {
        preventDefaults(e);
        if (isConverting) return;
        dragCounter = 0;
        globalDropOverlay.classList.remove('visible');
        handleDrop(e);
    });
    [dropZoneLarge, dropZoneSmall].forEach(zone => {
        zone.addEventListener('click', () => fileInput.click());
    });
    selectFilesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    clearAllBtn.addEventListener('click', clearQueue);
    filesContainer.addEventListener('click', handleFileAction);
    actionButtonsDiv.addEventListener('click', handleGlobalAction);
    logoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!isConverting) clearQueue();
    });
    qualitySlider.addEventListener('input', () => {
        qualityValue.textContent = qualitySlider.value;
    });
    const namingControls = [namingRuleSelect, prefixInput, suffixInput, formatSelect];
    namingControls.forEach(control => control.addEventListener('input', updateNamingExample));
    namingRuleSelect.addEventListener('change', () => {
        const rule = namingRuleSelect.value;
        prefixInput.classList.toggle('hidden', rule !== 'prefix');
        suffixInput.classList.toggle('hidden', rule !== 'suffix');
        updateNamingExample();
    });
    cancelConversionBtn.addEventListener('click', () => {
        conversionCancelled = true;
    });

    function updateNamingExample() {
        const originalName = "IMG_2023";
        const originalExtension = "jpg";
        const newExtension = formatSelect.value;
        const baseName = getNewFileName(originalName, 0);
        namingExample.textContent = `Example: ${originalName}.${originalExtension} → ${baseName}.${newExtension}`;
    }

    function handleDrop(e) {
        if (isConverting) return;
        const files = e.dataTransfer.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        if (isConverting) return;
        const validFiles = [...files].filter(file => {
            if (!file || !file.name) return false;
            const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            return SUPPORTED_EXTENSIONS.includes(extension);
        });
        if (validFiles.length === 0) return;
        const wasEmpty = fileQueue.length === 0;
        const newItems = validFiles.map(file => ({
            id: `file-${Date.now()}-${Math.random()}`,
            file,
            status: 'queued'
        }));
        fileQueue.push(...newItems);
        if (wasEmpty) updateConverterView();
        renderFileList(newItems);
        updateNamingExample();
    }

    function updateConverterView() {
        if (fileQueue.length > 0) {
            converterArea.classList.add('converter-area-active');
        } else {
            converterArea.classList.remove('converter-area-active');
        }
    }

    function renderFileList(newItems = fileQueue) {
        newItems.forEach(item => {
            if (document.getElementById(item.id)) return;
            const fileItemEl = document.createElement('div');
            fileItemEl.className = 'file-item';
            fileItemEl.id = item.id;
            filesContainer.appendChild(fileItemEl);
            updateFileElement(item);
        });
        renderGlobalActions();
    }

    function updateFileElement(item) {
        const fileItemEl = document.getElementById(item.id);
        if (!fileItemEl) return;
        let statusHTML, actionHTML;
        switch (item.status) {
            case 'processing':
                statusHTML = `<span class="file-status processing">Processing...</span>`;
                actionHTML = '';
                break;
            case 'converted':
                statusHTML = `<span class="file-status converted">Converted</span>`;
                actionHTML = `<button class="action-btn download-btn" data-action="download" data-id="${item.id}">${ICONS.download}</button><button class="action-btn remove-btn" data-action="remove" data-id="${item.id}">${ICONS.trash}</button>`;
                break;
            case 'error':
                statusHTML = `<span class="file-status error">Error</span>`;
                actionHTML = `<button class="action-btn remove-btn" data-action="remove" data-id="${item.id}">${ICONS.trash}</button>`;
                break;
            default:
                statusHTML = `<span class="file-status">Queued</span>`;
                actionHTML = `<button class="action-btn remove-btn" data-action="remove" data-id="${item.id}">${ICONS.trash}</button>`;
        }
        fileItemEl.innerHTML = `<div class="file-info"><span class="file-name">${item.file.name}</span></div><div class="file-actions">${statusHTML}${actionHTML}</div>`;
    }

    function renderGlobalActions() {
        if (isConverting) {
            actionButtonsDiv.innerHTML = '';
            return;
        }
        const hasUnconverted = fileQueue.some(f => ['queued', 'error'].includes(f.status));
        const hasConverted = fileQueue.some(f => f.status === 'converted');
        actionButtonsDiv.innerHTML = `${hasUnconverted?`<button class="btn" data-action="convert-all">Convert All</button>`:''}${hasConverted?`<button class="btn btn-success" data-action="download-zip">Download All (.zip)</button>`:''}`;
    }

    function handleFileAction(e) {
        const button = e.target.closest('.action-btn');
        if (!button || isConverting) return;
        const {
            action,
            id
        } = button.dataset;
        if (action === 'remove') removeFile(id);
        if (action === 'download') downloadIndividualFile(id);
    }

    function handleGlobalAction(e) {
        const button = e.target.closest('button');
        if (!button || isConverting) return;
        const {
            action
        } = button.dataset;
        if (action === 'convert-all') convertAllFiles();
        if (action === 'download-zip') downloadAllAsZip();
    }

    function removeFile(id) {
        const fileItemEl = document.getElementById(id);
        if (fileItemEl) {
            fileItemEl.classList.add('removing');
            fileItemEl.addEventListener('animationend', () => {
                fileQueue = fileQueue.filter(item => item.id !== id);
                fileItemEl.remove();
                if (fileQueue.length === 0) updateConverterView();
                renderGlobalActions();
                updateNamingExample();
            }, {
                once: true
            });
        }
    }

    function clearQueue() {
        if (isConverting || fileQueue.length === 0) return;
        const items = filesContainer.querySelectorAll('.file-item');
        items.forEach((item, index) => {
            item.style.animationDelay = `${index*50}ms`;
            item.classList.add('removing');
        });
        const lastItem = items[items.length - 1];
        lastItem.addEventListener('animationend', () => {
            fileQueue = [];
            filesContainer.innerHTML = '';
            updateConverterView();
            updateNamingExample();
        }, {
            once: true
        });
    }
    async function convertAllFiles() {
        isConverting = true;
        conversionCancelled = false;
        progressArea.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressPercentage.textContent = '0%';
        renderGlobalActions();
        clearAllBtn.disabled = true;
        const filesToConvert = fileQueue.filter(f => ['queued', 'error'].includes(f.status));
        const totalFiles = filesToConvert.length;
        let convertedCount = 0;
        try {
            for (const [index, item] of filesToConvert.entries()) {
                if (conversionCancelled) break;
                item.status = 'processing';
                updateFileElement(item);
                const quality = qualitySlider.value / 100;
                const targetFormat = formatSelect.value;
                const originalName = item.file.name.substring(0, item.file.name.lastIndexOf('.'));
                const baseName = getNewFileName(originalName, index);
                const newName = `${baseName}.${targetFormat}`;
                try {
                    item.convertedData = await convertFile(item.file, newName, targetFormat, quality);
                    item.status = 'converted';
                } catch (error) {
                    console.error('Conversion Error:', error);
                    item.status = 'error';
                }
                updateFileElement(item);
                convertedCount++;
                const percentage = Math.round((convertedCount / totalFiles) * 100);
                progressBar.style.width = `${percentage}%`;
                progressPercentage.textContent = `${percentage}%`;
            }
        } finally {
            if (conversionCancelled) {
                fileQueue.forEach(item => {
                    if (item.status === 'processing') {
                        item.status = 'queued';
                        updateFileElement(item);
                    }
                });
                progressPercentage.textContent = 'Cancelled';
            } else {
                progressPercentage.textContent = 'Complete!';
            }
            setTimeout(() => {
                progressArea.classList.add('hidden');
                isConverting = false;
                clearAllBtn.disabled = false;
                renderGlobalActions();
            }, 2000);
        }
    }

    function getNewFileName(originalName, index) {
        const rule = namingRuleSelect.value;
        switch (rule) {
            case 'prefix':
                const prefix = prefixInput.value || "";
                return prefix + originalName;
            case 'suffix':
                const suffix = suffixInput.value || "";
                return originalName + suffix;
            case 'autonumber':
                return `${originalName}-${index+1}`;
            case 'original':
            default:
                return originalName;
        }
    }

    function processOnCanvas(canvas, newName, targetFormat, quality) {
        if (targetFormat === 'tiff') {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const tiffArrayBuffer = UTIF.encode([imageData.data.buffer], canvas.width, canvas.height);
            const blob = new Blob([tiffArrayBuffer], {
                type: 'image/tiff'
            });
            const url = URL.createObjectURL(blob);
            return {
                url,
                name: newName
            };
        } else {
            const mimeType = `image/${targetFormat}`;
            const dataUrl = canvas.toDataURL(mimeType, quality);
            return {
                url: dataUrl,
                name: newName
            };
        }
    }
    async function convertFile(file, newName, targetFormat, quality) {
        const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            if (RAW_EXTENSIONS.includes(extension)) {
                reader.readAsArrayBuffer(file);
                reader.onload = (e) => {
                    dcraw(e.target.result, {
                            export: 'jpeg'
                        }).then(data => {
                            if (!data.blobs || !data.blobs[0]) {
                                return reject(new Error('No preview found in RAW file.'));
                            }
                            const jpegBlob = data.blobs[0];
                            const url = URL.createObjectURL(jpegBlob);
                            const img = new Image();
                            img.onload = () => {
                                const canvas = document.createElement('canvas');
                                canvas.width = img.width;
                                canvas.height = img.height;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0);
                                URL.revokeObjectURL(url);
                                resolve(processOnCanvas(canvas, newName, targetFormat, quality));
                            };
                            img.onerror = () => {
                                URL.revokeObjectURL(url);
                                reject(new Error('Could not load extracted preview from RAW file.'));
                            };
                            img.src = url;
                        })
                        .catch(err => reject(err));
                };
            } else {
                reader.readAsDataURL(file);
                reader.onload = e => {
                    const img = new Image();
                    img.src = e.target.result;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth || img.width;
                        canvas.height = img.naturalHeight || img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        resolve(processOnCanvas(canvas, newName, targetFormat, quality));
                    };
                    img.onerror = reject;
                };
            }
            reader.onerror = reject;
        });
    }

    function downloadIndividualFile(id) {
        const item = fileQueue.find(f => f.id === id);
        if (item?.convertedData) {
            triggerDownload(item.convertedData.url, item.convertedData.name);
        }
    }
    async function downloadAllAsZip() {
        const zip = new JSZip();
        const convertedFiles = fileQueue.filter(f => f.status === 'converted' && f.convertedData);
        for (const item of convertedFiles) {
            if (item.convertedData.url.startsWith('blob:')) {
                const response = await fetch(item.convertedData.url);
                const blob = await response.blob();
                zip.file(item.convertedData.name, blob);
            } else {
                const base64Data = item.convertedData.url.split(',')[1];
                zip.file(item.convertedData.name, base64Data, {
                    base64: true
                });
            }
        }
        const zipBlob = await zip.generateAsync({
            type: 'blob'
        });
        triggerDownload(URL.createObjectURL(zipBlob), `FileShiftX_Converted.zip`);
    }

    function triggerDownload(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    }
    updateNamingExample();
});