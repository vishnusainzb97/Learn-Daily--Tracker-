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
    deferredPrompt: null
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
