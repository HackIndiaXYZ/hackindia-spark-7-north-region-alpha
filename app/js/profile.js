/**
 * DIPDoc Profile & Settings Controller
 * Handles theme, language, medical history, and goals.
 */
const Profile = (() => {
  let documents = [];

  function init() {
    setupThemeToggle();
    setupLanguageSelector();
    setupUnitSelector();
    setupGoalInputs();
    setupMedicalHistory();
    loadPreferences();
    loadMedicalHistory();
  }

  /* ── Settings Logic ──────────────────────────────────── */

  function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    themeToggle.addEventListener('change', () => {
      setTheme(themeToggle.checked ? 'dark' : 'light');
    });
  }

  function setTheme(mode) {
    if (mode === 'dark') {
      document.body.classList.remove('light-theme');
      localStorage.setItem('dipdoc-theme', 'dark');
    } else {
      document.body.classList.add('light-theme');
      localStorage.setItem('dipdoc-theme', 'light');
    }
  }

  function setupLanguageSelector() {
    const langSelect = document.getElementById('language-select');
    if (!langSelect) return;
    langSelect.addEventListener('change', () => {
      localStorage.setItem('dipdoc-lang', langSelect.value);
      Notifications.showToast(`Language set to ${langSelect.value.toUpperCase()}`, 'info');
    });
  }

  function setupUnitSelector() {
    const unitSelect = document.getElementById('units-select');
    if (!unitSelect) return;
    unitSelect.addEventListener('change', () => {
      localStorage.setItem('dipdoc-units', unitSelect.value);
      Notifications.showToast(`Units set to ${unitSelect.value}`, 'info');
    });
  }

  function setupGoalInputs() {
    const goalInput = document.getElementById('goal-steps');
    if (!goalInput) return;
    goalInput.addEventListener('change', () => {
      localStorage.setItem('dipdoc-goal-steps', goalInput.value);
      Notifications.showToast(`Steps goal updated to ${goalInput.value}`, 'success');
    });
  }

  /* ── Medical History Logic ───────────────────────────── */

  function setupMedicalHistory() {
    const historyItem = document.getElementById('item-medical-history');
    const backBtn = document.getElementById('btn-history-back');
    const uploadBtn = document.getElementById('btn-upload-doc');
    const fileInput = document.getElementById('file-input');

    if (historyItem) {
      historyItem.addEventListener('click', () => Navigation.switchTo('history'));
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => Navigation.switchTo('profile'));
    }

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', handleFileUpload);
    }
  }

  function handleFileUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let file of files) {
      const newDoc = {
        id: Date.now() + Math.random(),
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        date: new Date().toLocaleDateString()
      };
      documents.push(newDoc);
    }

    saveMedicalHistory();
    renderMedicalHistory();
    Notifications.showToast(`${files.length} document(s) added`, 'success');
    e.target.value = ''; // Reset input
  }

  function deleteDocument(id) {
    documents = documents.filter(d => d.id !== id);
    saveMedicalHistory();
    renderMedicalHistory();
  }

  function renderMedicalHistory() {
    const listEl = document.getElementById('document-list');
    const countEl = document.getElementById('doc-count');
    if (!listEl) return;

    if (countEl) countEl.textContent = documents.length;

    if (documents.length === 0) {
      listEl.innerHTML = '<div class="doc-empty">No documents uploaded yet.</div>';
      return;
    }

    listEl.innerHTML = documents.map(doc => `
      <div class="doc-card">
        <div class="doc-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="doc-info">
          <div class="doc-name">${doc.name}</div>
          <div class="doc-meta">${doc.date} • ${doc.size}</div>
        </div>
        <button class="doc-delete" onclick="Profile.deleteDocument(${doc.id})">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `).join('');
  }

  function saveMedicalHistory() {
    localStorage.setItem('dipdoc-medical-history', JSON.stringify(documents));
  }

  function loadMedicalHistory() {
    const saved = localStorage.getItem('dipdoc-medical-history');
    if (saved) {
      documents = JSON.parse(saved);
      renderMedicalHistory();
    }
  }

  function loadPreferences() {
    const savedTheme = localStorage.getItem('dipdoc-theme') || 'dark';
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.checked = (savedTheme === 'dark');
    setTheme(savedTheme);

    const savedLang = localStorage.getItem('dipdoc-lang') || 'en';
    const langSelect = document.getElementById('language-select');
    if (langSelect) langSelect.value = savedLang;

    const savedUnits = localStorage.getItem('dipdoc-units') || 'metric';
    const unitSelect = document.getElementById('units-select');
    if (unitSelect) unitSelect.value = savedUnits;

    const savedGoal = localStorage.getItem('dipdoc-goal-steps') || '5000';
    const goalInput = document.getElementById('goal-steps');
    if (goalInput) goalInput.value = savedGoal;
  }

  return { init, deleteDocument };
})();
