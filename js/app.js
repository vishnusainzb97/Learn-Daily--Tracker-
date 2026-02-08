/* ============================================
   DAILY LEARNING TRACKER - MAIN APPLICATION
   App Initialization & Event Handling
   ============================================ */

// ============================================
// APP STATE
// ============================================

const App = {
    currentFilter: 'all',
    searchQuery: '',
    editingId: null,
    deferredPrompt: null,
    // Import wizard state
    import: {
        currentStep: 1,
        workbook: null,
        sheetData: null,
        headers: [],
        columnMap: null,
        processedData: null
    }
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize storage
    Storage.init();

    // Apply theme
    initTheme();

    // Render initial UI
    renderStats();
    renderCategories();
    renderLearnings();

    // Setup event listeners
    setupEventListeners();

    // Register service worker
    registerServiceWorker();

    // Handle PWA install prompt
    handleInstallPrompt();
});

// ============================================
// THEME MANAGEMENT
// ============================================

function initTheme() {
    const settings = Storage.getSettings();
    let theme = settings.theme;

    if (theme === 'system') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const settings = Storage.getSettings();
        if (settings.theme === 'system') {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            updateThemeIcon(newTheme);
        }
    });
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    updateThemeIcon(newTheme);
    Storage.saveSettings({ theme: newTheme });
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderStats() {
    const stats = Storage.getStats();
    const settings = Storage.getSettings();
    const container = document.getElementById('stats-grid');

    if (!container) return;

    container.innerHTML = `
    ${Components.createStatCard('🔥', stats.streak, 'Day Streak', 'streak')}
    ${Components.createStatCard('✨', stats.todayCount, 'Today', 'today')}
    ${Components.createStatCard('📅', stats.weekCount, 'This Week', 'week')}
    ${Components.createStatCard('📚', stats.totalCount, 'Total', 'total')}
  `;

    // Render weekly progress
    const weeklyContainer = document.getElementById('weekly-progress');
    if (weeklyContainer) {
        weeklyContainer.innerHTML = Components.createWeeklyProgress(stats.weeklyBreakdown, settings);
    }
}

function renderCategories() {
    const categories = Storage.getCategories();
    const container = document.getElementById('category-filters');

    if (!container) return;

    const allPill = Components.createCategoryPill(
        { id: 'all', name: 'All', icon: '📋' },
        App.currentFilter === 'all'
    );

    const categoryPills = categories.map(cat =>
        Components.createCategoryPill(cat, App.currentFilter === cat.id)
    ).join('');

    container.innerHTML = allPill + categoryPills;

    // Setup click events
    container.querySelectorAll('.category-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            App.currentFilter = pill.dataset.category;
            renderCategories();
            renderLearnings();
        });
    });
}

function renderLearnings() {
    const container = document.getElementById('entries-list');
    const countEl = document.getElementById('entries-count');

    if (!container) return;

    // Get filtered learnings
    const learnings = Storage.searchLearnings(App.searchQuery, {
        category: App.currentFilter
    });

    // Update count
    if (countEl) {
        countEl.textContent = `${learnings.length} entries`;
    }

    // Check for empty state
    if (learnings.length === 0) {
        const emptyType = App.searchQuery ? 'search' :
            App.currentFilter !== 'all' ? 'category' : 'default';
        container.innerHTML = Components.createEmptyState(emptyType);

        // Setup empty state button
        const emptyBtn = document.getElementById('empty-add-btn');
        if (emptyBtn) {
            emptyBtn.addEventListener('click', openAddModal);
        }
        return;
    }

    // Group by date and render
    const groups = Components.groupLearningsByDate(learnings);
    container.innerHTML = groups.map(group =>
        Components.createDateGroup(group.date, group.learnings)
    ).join('');

    // Setup card actions
    setupCardActions();
}

function setupCardActions() {
    // Edit buttons
    document.querySelectorAll('.card-action-btn.edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            openEditModal(id);
        });
    });

    // Delete buttons
    document.querySelectorAll('.card-action-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            confirmDelete(id);
        });
    });
}

// ============================================
// MODAL MANAGEMENT
// ============================================

function openAddModal() {
    App.editingId = null;
    const formHtml = Components.createLearningForm();
    const footer = `
    <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
    <button type="submit" form="learning-form" class="btn btn-primary">Save Learning</button>
  `;

    showModal('Add New Learning', formHtml, footer);

    // Focus title input
    setTimeout(() => {
        document.getElementById('learning-title')?.focus();
    }, 100);
}

function openEditModal(id) {
    const learning = Storage.getLearningById(id);
    if (!learning) return;

    App.editingId = id;
    const formHtml = Components.createLearningForm(learning);
    const footer = `
    <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
    <button type="submit" form="learning-form" class="btn btn-primary">Update Learning</button>
  `;

    showModal('Edit Learning', formHtml, footer);
}

function showModal(title, bodyContent, footerContent) {
    // Remove existing modal
    const existing = document.getElementById('modal-overlay');
    if (existing) existing.remove();

    // Create and insert modal
    const modalHtml = Components.createModal(title, bodyContent, footerContent);
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Get modal elements
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');
    const cancelBtn = document.getElementById('modal-cancel');
    const form = document.getElementById('learning-form');

    // Show modal with animation
    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });

    // Setup close handlers
    const closeModal = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Setup form submission
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleFormSubmit(form);
        closeModal();
    });

    // Close on escape
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

function handleFormSubmit(form) {
    const formData = new FormData(form);
    const tagsInput = formData.get('tags');
    const tags = tagsInput
        ? tagsInput.split(',').map(t => t.trim()).filter(t => t)
        : [];

    const learning = {
        id: formData.get('id') || null,
        title: formData.get('title'),
        content: formData.get('content'),
        category: formData.get('category'),
        tags
    };

    if (!learning.title.trim()) {
        Components.showToast('Please enter a title', 'error');
        return;
    }

    Storage.saveLearning(learning);

    const isEdit = !!learning.id;
    Components.showToast(
        isEdit ? 'Learning updated!' : 'Learning added!',
        'success'
    );

    // Refresh UI
    renderStats();
    renderLearnings();
}

function confirmDelete(id) {
    const learning = Storage.getLearningById(id);
    if (!learning) return;

    const bodyContent = `
    <p style="margin-bottom: var(--space-4);">Are you sure you want to delete this learning?</p>
    <div class="learning-card" style="pointer-events: none;">
      <h3 class="learning-card-title">${Components.escapeHtml(learning.title)}</h3>
    </div>
  `;

    const footer = `
    <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
    <button type="button" class="btn btn-danger" id="confirm-delete">Delete</button>
  `;

    showModal('Delete Learning', bodyContent, footer);

    document.getElementById('confirm-delete')?.addEventListener('click', () => {
        Storage.deleteLearning(id);
        Components.showToast('Learning deleted', 'success');

        // Close modal and refresh
        document.getElementById('modal-overlay')?.remove();
        renderStats();
        renderLearnings();
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

    // Add button (desktop)
    document.getElementById('add-btn')?.addEventListener('click', openAddModal);

    // FAB (mobile)
    document.getElementById('fab-add')?.addEventListener('click', openAddModal);

    // Import button
    document.getElementById('import-btn')?.addEventListener('click', openImportModal);

    // Search input
    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            App.searchQuery = e.target.value;
            renderLearnings();
        }, 300);
    });

    // Bottom nav
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            handleNavigation(view);
        });
    });

    // Install banner close
    document.getElementById('install-banner-close')?.addEventListener('click', () => {
        const banner = document.getElementById('install-banner');
        banner?.classList.remove('show');
        Storage.saveSettings({ showInstallBanner: false });
    });

    // Install button
    document.getElementById('install-btn')?.addEventListener('click', async () => {
        if (App.deferredPrompt) {
            App.deferredPrompt.prompt();
            const { outcome } = await App.deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                Components.showToast('App installed!', 'success');
            }

            App.deferredPrompt = null;
            document.getElementById('install-banner')?.classList.remove('show');
        }
    });
}

function handleNavigation(view) {
    // Update active nav item
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });

    // Handle different views (for future expansion)
    switch (view) {
        case 'home':
            App.currentFilter = 'all';
            App.searchQuery = '';
            document.getElementById('search-input').value = '';
            renderCategories();
            renderLearnings();
            break;
        case 'stats':
            // Could open a stats modal or page
            Components.showToast('Stats view coming soon!', 'info');
            break;
        case 'settings':
            // Could open settings modal
            Components.showToast('Settings coming soon!', 'info');
            break;
    }
}

// ============================================
// PWA FUNCTIONALITY
// ============================================

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('SW registered:', registration.scope);
        } catch (error) {
            console.log('SW registration failed:', error);
        }
    }
}

function handleInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        App.deferredPrompt = e;

        const settings = Storage.getSettings();
        if (settings.showInstallBanner) {
            const banner = document.getElementById('install-banner');
            setTimeout(() => {
                banner?.classList.add('show');
            }, 2000);
        }
    });

    window.addEventListener('appinstalled', () => {
        App.deferredPrompt = null;
        Components.showToast('App installed successfully!', 'success');
    });
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N to add new learning
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openAddModal();
    }

    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
    }
});

// Export for debugging
window.App = App;

// ============================================
// EXCEL IMPORT WIZARD
// ============================================

function openImportModal() {
    // Reset import state
    App.import = {
        currentStep: 1,
        workbook: null,
        sheetData: null,
        headers: [],
        columnMap: null,
        processedData: null
    };

    const bodyContent = ExcelImport.createImportModal();
    const footer = ExcelImport.createImportFooter(1);

    showImportModal('📊 Import from Excel', bodyContent, footer);
    setupImportStep1();
}

function showImportModal(title, bodyContent, footerContent) {
    // Remove existing modal
    const existing = document.getElementById('modal-overlay');
    if (existing) existing.remove();

    const modalHtml = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <button class="modal-close" id="modal-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          ${bodyContent}
        </div>
        <div class="modal-footer" id="import-footer">
          ${footerContent}
        </div>
      </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');

    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });

    const closeModal = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    };

    closeBtn?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Handle escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

function updateImportFooter() {
    const footer = document.getElementById('import-footer');
    if (footer) {
        footer.innerHTML = ExcelImport.createImportFooter(App.import.currentStep);
        setupImportNavigation();
    }
}

function setupImportNavigation() {
    const nextBtn = document.getElementById('import-next');
    const backBtn = document.getElementById('import-back');

    // Remove old listeners by cloning and replacing elements
    if (nextBtn) {
        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
        newNextBtn.addEventListener('click', handleImportNext);
    }

    if (backBtn) {
        const newBackBtn = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBackBtn, backBtn);
        newBackBtn.addEventListener('click', handleImportBack);
    }
}

function handleImportNext() {
    switch (App.import.currentStep) {
        case 2:
            goToStep3();
            break;
        case 3:
            executeImport();
            break;
        case 4:
            document.getElementById('modal-overlay')?.remove();
            break;
    }
}

function handleImportBack() {
    if (App.import.currentStep > 1) {
        App.import.currentStep--;
        showStep(App.import.currentStep);
        updateImportFooter();
    }
}

function showStep(stepNum) {
    document.querySelectorAll('.import-step').forEach((step, index) => {
        step.classList.toggle('hidden', index + 1 !== stepNum);
    });
}

// Step 1: File Upload
function setupImportStep1() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('excel-file-input');

    if (!uploadZone || !fileInput) {
        console.error('[Import] Upload zone or file input not found!');
        return;
    }

    console.log('[Import] Setting up Step 1 listeners');

    // Remove any existing listeners by cloning elements
    const newUploadZone = uploadZone.cloneNode(true);
    uploadZone.parentNode.replaceChild(newUploadZone, uploadZone);

    // Get the new file input reference after cloning
    const newFileInput = document.getElementById('excel-file-input');

    if (!newFileInput) {
        console.error('[Import] File input not found after clone!');
        return;
    }

    // Drag and drop
    newUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        newUploadZone.classList.add('dragover');
    });

    newUploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        newUploadZone.classList.remove('dragover');
    });

    newUploadZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        newUploadZone.classList.remove('dragover');

        console.log('[Import] File dropped');
        const file = e.dataTransfer.files[0];
        if (file) {
            await handleFileUpload(file);
        }
    });

    // File input change
    newFileInput.addEventListener('change', async (e) => {
        console.log('[Import] File input changed', e.target.files);
        const file = e.target.files[0];
        if (file) {
            await handleFileUpload(file);
        }
    });

    // Click anywhere on upload zone (except the button/label which handles itself)
    newUploadZone.addEventListener('click', (e) => {
        // Don't trigger if clicking on the label/button or the input itself
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'LABEL' || target.closest('.upload-btn')) {
            console.log('[Import] Click on button/label, letting it handle itself');
            return;
        }
        console.log('[Import] Upload zone clicked, triggering file input');
        newFileInput.click();
    });

    setupImportNavigation();
}

async function handleFileUpload(file) {
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
    ];

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        Components.showToast('Please upload an Excel or CSV file', 'error');
        return;
    }

    try {
        Components.showToast('Parsing file...', 'info');
        const result = await ExcelImport.parseExcelFile(file);

        App.import.workbook = result.workbook;
        App.import.sheetData = result.data;
        App.import.headers = result.data[0] || [];
        App.import.columnMap = ExcelImport.detectColumns(App.import.headers);

        Components.showToast(`Found ${result.data.length - 1} rows`, 'success');

        // Reset file input so the same file can be re-uploaded
        const fileInput = document.getElementById('excel-file-input');
        if (fileInput) fileInput.value = '';

        // Go to step 2
        App.import.currentStep = 2;
        showStep(2);
        setupImportStep2(result.sheets);
        updateImportFooter();
    } catch (error) {
        console.error('File upload error:', error);
        Components.showToast('Failed to parse file: ' + error.message, 'error');

        // Reset file input on error too
        const fileInput = document.getElementById('excel-file-input');
        if (fileInput) fileInput.value = '';
    }
}

// Step 2: Column Mapping
function setupImportStep2(sheets) {
    // Populate sheet selector
    const sheetSelect = document.getElementById('sheet-select');
    if (sheetSelect && sheets) {
        sheetSelect.innerHTML = sheets.map(s =>
            `<option value="${s.name}">${s.name} (${s.rowCount} rows)</option>`
        ).join('');

        sheetSelect.addEventListener('change', () => {
            const newData = ExcelImport.getSheetData(App.import.workbook, sheetSelect.value);
            App.import.sheetData = newData;
            App.import.headers = newData[0] || [];
            App.import.columnMap = ExcelImport.detectColumns(App.import.headers);
            populateColumnSelects();
        });
    }

    populateColumnSelects();

    // Categorization mode toggle
    document.querySelectorAll('input[name="cat-mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const manualSelect = document.getElementById('manual-category-select');
            manualSelect?.classList.toggle('hidden', radio.value !== 'manual');
        });
    });
}

function populateColumnSelects() {
    const headers = App.import.headers || [];

    // Ensure columnMap exists - initialize with auto-detection if null
    if (!App.import.columnMap) {
        App.import.columnMap = ExcelImport.detectColumns(headers);
    }
    const columnMap = App.import.columnMap || {};

    const optionsHtml = `<option value="-1">-- Not mapped --</option>` +
        headers.map((h, i) => `<option value="${i}">${h || `Column ${i + 1}`}</option>`).join('');

    const mappings = [
        { id: 'map-title', field: 'title' },
        { id: 'map-content', field: 'content' },
        { id: 'map-date', field: 'date' },
        { id: 'map-category', field: 'category' },
        { id: 'map-tags', field: 'tags' }
    ];

    mappings.forEach(({ id, field }) => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = optionsHtml;
            if (columnMap[field] !== null && columnMap[field] !== undefined) {
                select.value = columnMap[field];
            }
        }
    });
}

// Step 3: Preview
function goToStep3() {
    try {
        // Collect mapping from UI
        App.import.columnMap = {
            title: parseInt(document.getElementById('map-title')?.value ?? -1),
            content: parseInt(document.getElementById('map-content')?.value ?? -1),
            date: parseInt(document.getElementById('map-date')?.value ?? -1),
            category: parseInt(document.getElementById('map-category')?.value ?? -1),
            tags: parseInt(document.getElementById('map-tags')?.value ?? -1)
        };

        // Convert -1 to null
        Object.keys(App.import.columnMap).forEach(key => {
            if (App.import.columnMap[key] === -1) {
                App.import.columnMap[key] = null;
            }
        });

        // Validate that we have data to process
        if (!App.import.sheetData || App.import.sheetData.length === 0) {
            Components.showToast('No data found in the file', 'error');
            return;
        }

        // Get categorization mode
        const catMode = document.querySelector('input[name="cat-mode"]:checked')?.value || 'auto';
        const defaultCategory = document.getElementById('default-category')?.value || 'other';
        const hasHeaders = document.getElementById('has-headers')?.checked ?? true;

        // Process data
        App.import.processedData = ExcelImport.processImportData(
            App.import.sheetData,
            App.import.columnMap,
            {
                hasHeaders,
                autoCategorizeEnabled: catMode === 'auto',
                defaultCategory: catMode === 'manual' ? defaultCategory : 'other'
            }
        );

        // Check if we got any valid entries
        if (!App.import.processedData || App.import.processedData.length === 0) {
            Components.showToast('No valid entries found. Check your column mapping.', 'warning');
            return;
        }

        // Calculate preview stats
        const existingLearnings = Storage.getLearnings();
        const existingTitles = new Set(existingLearnings.map(l => l.title.toLowerCase()));

        let newCount = 0;
        let dupCount = 0;

        App.import.processedData.forEach(learning => {
            if (existingTitles.has(learning.title.toLowerCase())) {
                dupCount++;
            } else {
                newCount++;
            }
        });

        // Update preview UI
        App.import.currentStep = 3;
        showStep(3);

        document.getElementById('preview-total').textContent = App.import.processedData.length;
        document.getElementById('preview-new').textContent = newCount;
        document.getElementById('preview-duplicates').textContent = dupCount;

        // Show preview cards
        const previewList = document.getElementById('preview-list');
        if (previewList) {
            const previewItems = App.import.processedData.slice(0, 5);
            previewList.innerHTML = previewItems.map(item => {
                const category = Storage.getCategoryById(item.category) || { name: 'Other' };
                return `
                    <div class="preview-card">
                        <div class="preview-card-title">${Components.escapeHtml(item.title || 'Untitled')}</div>
                        <div class="preview-card-meta">
                            <span>${category.name}</span>
                            <span>•</span>
                            <span>${new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                `;
            }).join('');

            if (App.import.processedData.length > 5) {
                previewList.innerHTML += `<p style="text-align: center; color: var(--color-text-muted); font-size: var(--font-size-sm);">... and ${App.import.processedData.length - 5} more</p>`;
            }
        }

        updateImportFooter();
    } catch (error) {
        console.error('Import preview error:', error);
        Components.showToast('Error processing data: ' + error.message, 'error');
    }
}

// Step 4: Execute Import
function executeImport() {
    if (!App.import.processedData || App.import.processedData.length === 0) {
        Components.showToast('No data to import', 'error');
        return;
    }

    const result = ExcelImport.importLearnings(App.import.processedData);

    // Show completion
    App.import.currentStep = 4;
    showStep(4);

    const resultText = document.getElementById('import-result-text');
    if (resultText) {
        resultText.innerHTML = `
            <strong>${result.imported}</strong> learnings imported successfully!
            ${result.skipped > 0 ? `<br><span style="color: var(--color-text-muted)">${result.skipped} duplicates skipped</span>` : ''}
        `;
    }

    updateImportFooter();

    // Refresh the main UI
    renderStats();
    renderLearnings();

    Components.showToast(`Imported ${result.imported} learnings!`, 'success');
}

