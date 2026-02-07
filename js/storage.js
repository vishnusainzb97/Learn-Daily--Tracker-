/* ============================================
   DAILY LEARNING TRACKER - STORAGE MODULE
   Local Storage Data Layer
   ============================================ */

const STORAGE_KEYS = {
  LEARNINGS: 'dlt_learnings',
  SETTINGS: 'dlt_settings',
  CATEGORIES: 'dlt_categories'
};

// Default categories
const DEFAULT_CATEGORIES = [
  { id: 'coding', name: 'Coding', color: '#6366f1', icon: '💻' },
  { id: 'design', name: 'Design', color: '#ec4899', icon: '🎨' },
  { id: 'reading', name: 'Reading', color: '#14b8a6', icon: '📚' },
  { id: 'course', name: 'Course', color: '#f97316', icon: '🎓' },
  { id: 'project', name: 'Project', color: '#8b5cf6', icon: '🚀' },
  { id: 'other', name: 'Other', color: '#64748b', icon: '📝' }
];

// Default settings
const DEFAULT_SETTINGS = {
  theme: 'system', // 'light', 'dark', 'system'
  showInstallBanner: true,
  weeklyGoal: 7
};

// ============================================
// INITIALIZATION
// ============================================

function initStorage() {
  // Initialize categories if not exists
  if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
  }
  
  // Initialize settings if not exists
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }
  
  // Initialize learnings if not exists
  if (!localStorage.getItem(STORAGE_KEYS.LEARNINGS)) {
    localStorage.setItem(STORAGE_KEYS.LEARNINGS, JSON.stringify([]));
  }
}

// ============================================
// LEARNINGS CRUD
// ============================================

function getLearnings() {
  const data = localStorage.getItem(STORAGE_KEYS.LEARNINGS);
  return data ? JSON.parse(data) : [];
}

function getLearningById(id) {
  const learnings = getLearnings();
  return learnings.find(l => l.id === id);
}

function saveLearning(learning) {
  const learnings = getLearnings();
  
  if (learning.id) {
    // Update existing
    const index = learnings.findIndex(l => l.id === learning.id);
    if (index !== -1) {
      learnings[index] = {
        ...learnings[index],
        ...learning,
        updatedAt: new Date().toISOString()
      };
    }
  } else {
    // Create new
    const newLearning = {
      id: generateId(),
      title: learning.title,
      content: learning.content,
      category: learning.category || 'other',
      tags: learning.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    learnings.unshift(newLearning);
  }
  
  localStorage.setItem(STORAGE_KEYS.LEARNINGS, JSON.stringify(learnings));
  return learning.id || learnings[0].id;
}

function deleteLearning(id) {
  const learnings = getLearnings();
  const filtered = learnings.filter(l => l.id !== id);
  localStorage.setItem(STORAGE_KEYS.LEARNINGS, JSON.stringify(filtered));
}

// ============================================
// CATEGORIES
// ============================================

function getCategories() {
  const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
  return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
}

function getCategoryById(id) {
  const categories = getCategories();
  return categories.find(c => c.id === id);
}

function saveCategory(category) {
  const categories = getCategories();
  
  if (category.id) {
    // Update existing
    const index = categories.findIndex(c => c.id === category.id);
    if (index !== -1) {
      categories[index] = { ...categories[index], ...category };
    }
  } else {
    // Create new
    const newCategory = {
      id: category.name.toLowerCase().replace(/\s+/g, '-'),
      name: category.name,
      color: category.color || '#64748b',
      icon: category.icon || '📝'
    };
    categories.push(newCategory);
  }
  
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
}

function deleteCategory(id) {
  const categories = getCategories();
  const filtered = categories.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(filtered));
}

// ============================================
// SETTINGS
// ============================================

function getSettings() {
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return data ? JSON.parse(data) : DEFAULT_SETTINGS;
}

function saveSettings(settings) {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  return updated;
}

// ============================================
// STATISTICS
// ============================================

function getStats() {
  const learnings = getLearnings();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayStr = today.toISOString().split('T')[0];
  
  // Count today's learnings
  const todayCount = learnings.filter(l => {
    const date = new Date(l.createdAt);
    return date.toISOString().split('T')[0] === todayStr;
  }).length;
  
  // Calculate streak
  const streak = calculateStreak(learnings);
  
  // Count this week's learnings
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekCount = learnings.filter(l => {
    const date = new Date(l.createdAt);
    return date >= weekStart;
  }).length;
  
  // Total count
  const totalCount = learnings.length;
  
  // Weekly breakdown (last 7 days)
  const weeklyBreakdown = getWeeklyBreakdown(learnings);
  
  // Category breakdown
  const categoryBreakdown = getCategoryBreakdown(learnings);
  
  return {
    todayCount,
    streak,
    weekCount,
    totalCount,
    weeklyBreakdown,
    categoryBreakdown
  };
}

function calculateStreak(learnings) {
  if (learnings.length === 0) return 0;
  
  // Get unique dates with learnings (sorted descending)
  const dates = [...new Set(
    learnings.map(l => new Date(l.createdAt).toISOString().split('T')[0])
  )].sort().reverse();
  
  if (dates.length === 0) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // Check if there's an entry today or yesterday
  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
    return 0;
  }
  
  let streak = 1;
  let currentDate = new Date(dates[0]);
  
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    
    if (dates[i] === prevDateStr) {
      streak++;
      currentDate = prevDate;
    } else {
      break;
    }
  }
  
  return streak;
}

function getWeeklyBreakdown(learnings) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const breakdown = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().split('T')[0];
    
    const count = learnings.filter(l => {
      const lDate = new Date(l.createdAt);
      return lDate.toISOString().split('T')[0] === dateStr;
    }).length;
    
    breakdown.push({
      day: days[date.getDay()],
      date: dateStr,
      count,
      isToday: i === 0
    });
  }
  
  return breakdown;
}

function getCategoryBreakdown(learnings) {
  const categories = getCategories();
  const breakdown = {};
  
  categories.forEach(cat => {
    breakdown[cat.id] = 0;
  });
  
  learnings.forEach(l => {
    if (breakdown[l.category] !== undefined) {
      breakdown[l.category]++;
    } else {
      breakdown['other']++;
    }
  });
  
  return breakdown;
}

// ============================================
// SEARCH & FILTER
// ============================================

function searchLearnings(query, filters = {}) {
  let learnings = getLearnings();
  
  // Filter by category
  if (filters.category && filters.category !== 'all') {
    learnings = learnings.filter(l => l.category === filters.category);
  }
  
  // Filter by date range
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom);
    learnings = learnings.filter(l => new Date(l.createdAt) >= from);
  }
  
  if (filters.dateTo) {
    const to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
    learnings = learnings.filter(l => new Date(l.createdAt) <= to);
  }
  
  // Search by query
  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    learnings = learnings.filter(l => 
      l.title.toLowerCase().includes(q) ||
      l.content.toLowerCase().includes(q) ||
      (l.tags && l.tags.some(t => t.toLowerCase().includes(q)))
    );
  }
  
  return learnings;
}

// ============================================
// UTILITIES
// ============================================

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function exportData() {
  const data = {
    learnings: getLearnings(),
    categories: getCategories(),
    settings: getSettings(),
    exportedAt: new Date().toISOString()
  };
  return JSON.stringify(data, null, 2);
}

function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    
    if (data.learnings) {
      localStorage.setItem(STORAGE_KEYS.LEARNINGS, JSON.stringify(data.learnings));
    }
    if (data.categories) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(data.categories));
    }
    if (data.settings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    }
    
    return true;
  } catch (e) {
    console.error('Import failed:', e);
    return false;
  }
}

// Export for use in other modules
window.Storage = {
  init: initStorage,
  getLearnings,
  getLearningById,
  saveLearning,
  deleteLearning,
  getCategories,
  getCategoryById,
  saveCategory,
  deleteCategory,
  getSettings,
  saveSettings,
  getStats,
  searchLearnings,
  exportData,
  importData
};
