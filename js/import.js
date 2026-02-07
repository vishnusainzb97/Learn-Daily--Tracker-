/* ============================================
   DAILY LEARNING TRACKER - EXCEL IMPORT MODULE
   Import learnings from Excel files
   ============================================ */

// Category keywords for auto-categorization
const CATEGORY_KEYWORDS = {
  coding: ['code', 'coding', 'programming', 'javascript', 'python', 'java', 'css', 'html', 'react', 'node', 'api', 'database', 'sql', 'git', 'algorithm', 'function', 'debug', 'software', 'developer', 'frontend', 'backend', 'web', 'app', 'script', 'framework', 'library', 'typescript', 'angular', 'vue', 'nextjs', 'express', 'mongodb', 'aws', 'cloud', 'devops', 'docker', 'kubernetes'],
  design: ['design', 'ui', 'ux', 'figma', 'sketch', 'photoshop', 'illustrator', 'color', 'typography', 'layout', 'wireframe', 'prototype', 'visual', 'graphic', 'creative', 'brand', 'logo', 'icon', 'animation', 'motion', 'aesthetic', 'user interface', 'user experience'],
  reading: ['read', 'reading', 'book', 'article', 'blog', 'paper', 'research', 'study', 'literature', 'novel', 'chapter', 'author', 'documentation', 'docs', 'journal', 'magazine', 'newsletter'],
  course: ['course', 'class', 'lecture', 'tutorial', 'lesson', 'module', 'udemy', 'coursera', 'youtube', 'video', 'workshop', 'bootcamp', 'certification', 'training', 'webinar', 'seminar', 'education', 'learning path', 'curriculum'],
  project: ['project', 'build', 'create', 'develop', 'implement', 'launch', 'deploy', 'portfolio', 'app', 'website', 'feature', 'milestone', 'sprint', 'hackathon', 'side project', 'personal project', 'work project']
};

// ============================================
// EXCEL PARSING (using SheetJS)
// ============================================

async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: false,
          dateNF: 'yyyy-mm-dd'
        });

        // Get all sheet names for selection
        const sheets = workbook.SheetNames.map(name => ({
          name,
          rowCount: XLSX.utils.sheet_to_json(workbook.Sheets[name]).length
        }));

        resolve({
          sheets,
          data: jsonData,
          workbook
        });
      } catch (error) {
        reject(new Error('Failed to parse Excel file: ' + error.message));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function getSheetData(workbook, sheetName) {
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    dateNF: 'yyyy-mm-dd'
  });
}

// ============================================
// COLUMN DETECTION
// ============================================

function detectColumns(headers) {
  const columnMap = {
    title: null,
    content: null,
    date: null,
    category: null,
    tags: null
  };

  // Expanded patterns to match more column names including DPR-style reports
  const patterns = {
    title: /^(title|topic|subject|learning|what|name|heading|activity|task|work|item|dpr|report|learnings?|daily)$/i,
    content: /^(content|description|details|notes|body|text|summary|learned|insight|remarks|comments?|observation|findings?|progress|status|update)$/i,
    date: /^(date|created|time|timestamp|when|day|s\.?no\.?|sr\.?no\.?|sl\.?no\.?|serial|no\.?)$/i,
    category: /^(category|type|group|classification|area|domain|field|module|section|phase)$/i,
    tags: /^(tags|keywords|labels|hashtags|skills?)$/i
  };

  headers.forEach((header, index) => {
    if (!header) return;
    const headerStr = String(header).trim();

    for (const [field, pattern] of Object.entries(patterns)) {
      if (pattern.test(headerStr) && columnMap[field] === null) {
        columnMap[field] = index;
      }
    }
  });

  // Smart fallback: find columns by partial matching if exact match fails
  if (columnMap.title === null || columnMap.content === null) {
    headers.forEach((header, index) => {
      if (!header) return;
      const h = String(header).toLowerCase();

      // Title fallbacks - look for any column with these keywords
      if (columnMap.title === null) {
        if (h.includes('learn') || h.includes('topic') || h.includes('title') ||
          h.includes('activity') || h.includes('task') || h.includes('work')) {
          columnMap.title = index;
        }
      }

      // Content fallbacks
      if (columnMap.content === null) {
        if (h.includes('detail') || h.includes('desc') || h.includes('note') ||
          h.includes('summary') || h.includes('remark') || h.includes('comment')) {
          columnMap.content = index;
        }
      }

      // Date fallbacks
      if (columnMap.date === null) {
        if (h.includes('date') || h.includes('day') || h.includes('time')) {
          columnMap.date = index;
        }
      }
    });
  }

  // If still no title found, use first non-empty text column
  if (columnMap.title === null) {
    columnMap.title = 0;
  }

  // If no content found, use column after title or same as title
  if (columnMap.content === null) {
    const nextCol = columnMap.title + 1;
    columnMap.content = nextCol < headers.length ? nextCol : columnMap.title;
  }

  return columnMap;
}

// ============================================
// AUTO-CATEGORIZATION
// ============================================

function autoCategorize(text) {
  if (!text) return 'other';

  const lowerText = text.toLowerCase();
  const scores = {};

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        scores[category]++;
      }
    }
  }

  // Find category with highest score
  let maxScore = 0;
  let bestCategory = 'other';

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

// ============================================
// IMPORT PROCESSING
// ============================================

function processImportData(data, columnMap, options = {}) {
  const {
    hasHeaders = true,
    autoCategorizeEnabled = true,
    defaultCategory = 'other',
    categoryMapping = {}
  } = options;

  const startRow = hasHeaders ? 1 : 0;
  const learnings = [];

  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const title = row[columnMap.title] || '';
    const content = row[columnMap.content] || '';

    // Skip empty rows
    if (!title.trim() && !content.trim()) continue;

    // Parse date
    let createdAt = new Date().toISOString();
    if (columnMap.date !== null && row[columnMap.date]) {
      const dateValue = row[columnMap.date];
      const parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        createdAt = parsedDate.toISOString();
      }
    }

    // Determine category
    let category = defaultCategory;

    if (columnMap.category !== null && row[columnMap.category]) {
      const excelCategory = String(row[columnMap.category]).toLowerCase().trim();
      // Check if there's a manual mapping
      if (categoryMapping[excelCategory]) {
        category = categoryMapping[excelCategory];
      } else {
        // Try to match with existing categories
        const categories = Storage.getCategories();
        const match = categories.find(c =>
          c.name.toLowerCase() === excelCategory ||
          c.id === excelCategory
        );
        category = match ? match.id : (autoCategorizeEnabled ? autoCategorize(title + ' ' + content) : defaultCategory);
      }
    } else if (autoCategorizeEnabled) {
      category = autoCategorize(title + ' ' + content);
    }

    // Parse tags
    let tags = [];
    if (columnMap.tags !== null && row[columnMap.tags]) {
      const tagStr = String(row[columnMap.tags]);
      tags = tagStr.split(/[,;|]/).map(t => t.trim()).filter(t => t);
    }

    learnings.push({
      title: String(title).trim(),
      content: String(content).trim(),
      category,
      tags,
      createdAt,
      updatedAt: createdAt
    });
  }

  return learnings;
}

// ============================================
// IMPORT EXECUTION
// ============================================

function importLearnings(learnings) {
  let imported = 0;
  let skipped = 0;

  const existingLearnings = Storage.getLearnings();
  const existingTitles = new Set(existingLearnings.map(l => l.title.toLowerCase()));

  for (const learning of learnings) {
    // Skip duplicates based on title
    if (existingTitles.has(learning.title.toLowerCase())) {
      skipped++;
      continue;
    }

    Storage.saveLearning(learning);
    existingTitles.add(learning.title.toLowerCase());
    imported++;
  }

  return { imported, skipped, total: learnings.length };
}

// ============================================
// UI COMPONENTS FOR IMPORT
// ============================================

function createImportModal() {
  const categories = Storage.getCategories();
  const categoryOptions = categories.map(c =>
    `<option value="${c.id}">${c.icon} ${c.name}</option>`
  ).join('');

  return `
    <div class="import-wizard" id="import-wizard">
      <!-- Step 1: File Upload -->
      <div class="import-step" id="import-step-1">
        <div class="import-upload-zone" id="upload-zone">
          <div class="upload-icon">📊</div>
          <h3>Upload Excel File</h3>
          <p>Drag and drop your .xlsx or .xls file here</p>
          <p class="upload-or">or</p>
          <label class="btn btn-primary upload-btn">
            <input type="file" id="excel-file-input" accept=".xlsx,.xls,.csv" hidden>
            Choose File
          </label>
          <p class="upload-formats">Supported: .xlsx, .xls, .csv</p>
        </div>
      </div>
      
      <!-- Step 2: Column Mapping -->
      <div class="import-step hidden" id="import-step-2">
        <div class="import-section">
          <h3>📋 Sheet Selection</h3>
          <select class="form-select" id="sheet-select">
            <!-- Populated dynamically -->
          </select>
        </div>
        
        <div class="import-section">
          <h3>🔗 Column Mapping</h3>
          <p class="import-hint">Match your Excel columns to the learning fields</p>
          
          <div class="column-mapping">
            <div class="mapping-row">
              <label>Title Column *</label>
              <select class="form-select" id="map-title"></select>
            </div>
            <div class="mapping-row">
              <label>Content/Details Column</label>
              <select class="form-select" id="map-content"></select>
            </div>
            <div class="mapping-row">
              <label>Date Column</label>
              <select class="form-select" id="map-date"></select>
            </div>
            <div class="mapping-row">
              <label>Category Column</label>
              <select class="form-select" id="map-category"></select>
            </div>
            <div class="mapping-row">
              <label>Tags Column</label>
              <select class="form-select" id="map-tags"></select>
            </div>
          </div>
          
          <div class="import-option">
            <label class="checkbox-label">
              <input type="checkbox" id="has-headers" checked>
              <span>First row contains headers</span>
            </label>
          </div>
        </div>
        
        <div class="import-section">
          <h3>🏷️ Categorization</h3>
          <div class="categorization-options">
            <label class="radio-card">
              <input type="radio" name="cat-mode" value="auto" checked>
              <div class="radio-card-content">
                <span class="radio-card-icon">🤖</span>
                <span class="radio-card-title">Auto-Categorize</span>
                <span class="radio-card-desc">AI analyzes content to assign categories</span>
              </div>
            </label>
            <label class="radio-card">
              <input type="radio" name="cat-mode" value="column">
              <div class="radio-card-content">
                <span class="radio-card-icon">📊</span>
                <span class="radio-card-title">Use Excel Column</span>
                <span class="radio-card-desc">Use category from your Excel file</span>
              </div>
            </label>
            <label class="radio-card">
              <input type="radio" name="cat-mode" value="manual">
              <div class="radio-card-content">
                <span class="radio-card-icon">✋</span>
                <span class="radio-card-title">Single Category</span>
                <span class="radio-card-desc">Assign one category to all imports</span>
              </div>
            </label>
          </div>
          
          <div class="manual-category hidden" id="manual-category-select">
            <label>Select Category</label>
            <select class="form-select" id="default-category">
              ${categoryOptions}
            </select>
          </div>
        </div>
      </div>
      
      <!-- Step 3: Preview -->
      <div class="import-step hidden" id="import-step-3">
        <div class="import-section">
          <h3>👀 Preview Import</h3>
          <p class="import-hint">Review the first 5 entries before importing</p>
          
          <div class="preview-stats">
            <div class="preview-stat">
              <span class="preview-stat-value" id="preview-total">0</span>
              <span class="preview-stat-label">Total Entries</span>
            </div>
            <div class="preview-stat">
              <span class="preview-stat-value" id="preview-new">0</span>
              <span class="preview-stat-label">New Entries</span>
            </div>
            <div class="preview-stat">
              <span class="preview-stat-value" id="preview-duplicates">0</span>
              <span class="preview-stat-label">Duplicates</span>
            </div>
          </div>
          
          <div class="preview-list" id="preview-list">
            <!-- Preview cards populated here -->
          </div>
        </div>
      </div>
      
      <!-- Step 4: Complete -->
      <div class="import-step hidden" id="import-step-4">
        <div class="import-complete">
          <div class="import-complete-icon">🎉</div>
          <h3>Import Complete!</h3>
          <p id="import-result-text">Successfully imported your learnings</p>
        </div>
      </div>
    </div>
  `;
}

function createImportFooter(currentStep) {
  const steps = [
    { back: null, next: null },
    { back: null, next: 'Next: Map Columns' },
    { back: 'Back', next: 'Next: Preview' },
    { back: 'Back', next: 'Import Now' },
    { back: null, next: 'Done' }
  ];

  const step = steps[currentStep];

  return `
    <div class="import-progress">
      <div class="import-progress-step ${currentStep >= 1 ? 'active' : ''}">1. Upload</div>
      <div class="import-progress-step ${currentStep >= 2 ? 'active' : ''}">2. Map</div>
      <div class="import-progress-step ${currentStep >= 3 ? 'active' : ''}">3. Preview</div>
      <div class="import-progress-step ${currentStep >= 4 ? 'active' : ''}">4. Done</div>
    </div>
    ${step.back ? `<button type="button" class="btn btn-secondary" id="import-back">${step.back}</button>` : ''}
    ${step.next ? `<button type="button" class="btn btn-primary" id="import-next" ${currentStep === 1 ? 'disabled' : ''}>${step.next}</button>` : ''}
  `;
}

// Export for use in app
window.ExcelImport = {
  parseExcelFile,
  getSheetData,
  detectColumns,
  autoCategorize,
  processImportData,
  importLearnings,
  createImportModal,
  createImportFooter,
  CATEGORY_KEYWORDS
};
