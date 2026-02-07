/* ============================================
   DAILY LEARNING TRACKER - UI COMPONENTS
   Reusable UI Component Library
   ============================================ */

// ============================================
// STAT CARD COMPONENT
// ============================================

function createStatCard(icon, value, label, iconClass) {
    return `
    <div class="stat-card">
      <div class="stat-icon ${iconClass}">${icon}</div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  `;
}

// ============================================
// LEARNING CARD COMPONENT
// ============================================

function createLearningCard(learning) {
    const category = Storage.getCategoryById(learning.category) || { name: 'Other', id: 'other' };
    const date = formatRelativeDate(learning.createdAt);
    const tagsHtml = learning.tags && learning.tags.length > 0
        ? `<div class="learning-card-tags">
        ${learning.tags.map(tag => `<span class="learning-tag">#${tag}</span>`).join('')}
       </div>`
        : '';

    return `
    <article class="learning-card" data-id="${learning.id}">
      <div class="learning-card-header">
        <div class="learning-card-meta">
          <span class="learning-category" data-category="${learning.category}">${category.name}</span>
          <span class="learning-date">${date}</span>
        </div>
        <div class="learning-card-actions">
          <button class="card-action-btn edit" data-id="${learning.id}" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="card-action-btn delete" data-id="${learning.id}" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
      <h3 class="learning-card-title">${escapeHtml(learning.title)}</h3>
      <p class="learning-card-content">${escapeHtml(learning.content)}</p>
      ${tagsHtml}
    </article>
  `;
}

// ============================================
// CATEGORY PILL COMPONENT
// ============================================

function createCategoryPill(category, isActive = false) {
    return `
    <button class="category-pill ${isActive ? 'active' : ''}" 
            data-category="${category.id}">
      ${category.icon || ''} ${category.name}
    </button>
  `;
}

// ============================================
// WEEKLY PROGRESS COMPONENT
// ============================================

function createWeeklyProgress(weeklyBreakdown, settings = {}) {
    const maxCount = Math.max(...weeklyBreakdown.map(d => d.count), 1);
    const totalWeek = weeklyBreakdown.reduce((sum, d) => sum + d.count, 0);
    const goal = settings.weeklyGoal || 7;

    const daysHtml = weeklyBreakdown.map(day => {
        const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
        return `
      <div class="weekly-day ${day.isToday ? 'today' : ''}">
        <div class="weekly-day-bar">
          <div class="weekly-day-fill" style="height: ${height}%"></div>
        </div>
        <span class="weekly-day-label">${day.day}</span>
      </div>
    `;
    }).join('');

    return `
    <div class="weekly-progress">
      <div class="weekly-progress-header">
        <span class="weekly-progress-title">📊 This Week</span>
        <span class="weekly-progress-count">${totalWeek} / ${goal} entries</span>
      </div>
      <div class="weekly-days">
        ${daysHtml}
      </div>
    </div>
  `;
}

// ============================================
// EMPTY STATE COMPONENT
// ============================================

function createEmptyState(type = 'default') {
    const states = {
        default: {
            icon: '📚',
            title: 'No learnings yet',
            text: 'Start tracking your daily learnings by clicking the + button'
        },
        search: {
            icon: '🔍',
            title: 'No results found',
            text: 'Try adjusting your search or filter criteria'
        },
        category: {
            icon: '📁',
            title: 'No learnings in this category',
            text: 'Add your first learning to this category'
        }
    };

    const state = states[type] || states.default;

    return `
    <div class="empty-state">
      <div class="empty-state-icon">${state.icon}</div>
      <h3 class="empty-state-title">${state.title}</h3>
      <p class="empty-state-text">${state.text}</p>
      <button class="btn btn-primary" id="empty-add-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Add Learning
      </button>
    </div>
  `;
}

// ============================================
// MODAL COMPONENT
// ============================================

function createModal(title, bodyContent, footerContent = '') {
    return `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal">
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
        ${footerContent ? `<div class="modal-footer">${footerContent}</div>` : ''}
      </div>
    </div>
  `;
}

function createLearningForm(learning = null) {
    const categories = Storage.getCategories();
    const isEdit = !!learning;

    const categoriesOptions = categories.map(cat =>
        `<option value="${cat.id}" ${learning && learning.category === cat.id ? 'selected' : ''}>
      ${cat.icon} ${cat.name}
    </option>`
    ).join('');

    return `
    <form id="learning-form">
      <input type="hidden" name="id" value="${learning ? learning.id : ''}">
      
      <div class="form-group">
        <label class="form-label" for="learning-title">Title *</label>
        <input type="text" 
               class="form-input" 
               id="learning-title" 
               name="title" 
               placeholder="What did you learn today?"
               value="${learning ? escapeHtml(learning.title) : ''}"
               required>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="learning-content">Details</label>
        <textarea class="form-textarea" 
                  id="learning-content" 
                  name="content" 
                  placeholder="Describe what you learned in more detail..."
                  rows="4">${learning ? escapeHtml(learning.content) : ''}</textarea>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="learning-category">Category</label>
        <select class="form-select" id="learning-category" name="category">
          ${categoriesOptions}
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label" for="learning-tags">Tags (comma separated)</label>
        <input type="text" 
               class="form-input" 
               id="learning-tags" 
               name="tags" 
               placeholder="javascript, react, webdev"
               value="${learning && learning.tags ? learning.tags.join(', ') : ''}">
      </div>
    </form>
  `;
}

// ============================================
// TOAST SYSTEM
// ============================================

const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
toastContainer.id = 'toast-container';

function initToasts() {
    if (!document.getElementById('toast-container')) {
        document.body.appendChild(toastContainer);
    }
}

function showToast(message, type = 'success', duration = 3000) {
    initToasts();

    const icons = {
        success: '✓',
        error: '✕',
        warning: '!',
        info: 'i'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
  `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

// ============================================
// DATE GROUP COMPONENT
// ============================================

function createDateGroup(date, learnings) {
    const title = formatDateGroupTitle(date);
    const cardsHtml = learnings.map(l => createLearningCard(l)).join('');

    return `
    <div class="date-group">
      <div class="date-group-header">
        <span class="date-group-title">${title}</span>
        <div class="date-group-line"></div>
      </div>
      <div class="entries-list">
        ${cardsHtml}
      </div>
    </div>
  `;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatRelativeDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMins = Math.floor(diffMs / (1000 * 60));
            if (diffMins < 1) return 'Just now';
            return `${diffMins}m ago`;
        }
        return `${diffHours}h ago`;
    }

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

function formatDateGroupTitle(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today - dateOnly) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });

    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });
}

function groupLearningsByDate(learnings) {
    const groups = {};

    learnings.forEach(learning => {
        const date = new Date(learning.createdAt);
        const dateKey = date.toISOString().split('T')[0];

        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(learning);
    });

    // Sort dates descending
    const sortedDates = Object.keys(groups).sort().reverse();

    return sortedDates.map(date => ({
        date,
        learnings: groups[date]
    }));
}

// Export for use in other modules
window.Components = {
    createStatCard,
    createLearningCard,
    createCategoryPill,
    createWeeklyProgress,
    createEmptyState,
    createModal,
    createLearningForm,
    createDateGroup,
    showToast,
    groupLearningsByDate,
    escapeHtml
};
