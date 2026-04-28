/**
 * DIPDoc Medications Tracker
 * Displays a daily medication schedule with check-off functionality.
 */
const Medications = (() => {
  let listEl;

  const schedule = [
    { id: 1, name: 'Metformin 500mg', dose: '1 tablet', time: '8:00 AM', icon: '💊', taken: true },
    { id: 2, name: 'Amlodipine 5mg', dose: '1 tablet', time: '9:00 AM', icon: '💊', taken: true },
    { id: 3, name: 'Vitamin D3', dose: '1000 IU', time: '12:00 PM', icon: '☀️', taken: false },
    { id: 4, name: 'Metformin 500mg', dose: '1 tablet', time: '2:00 PM', icon: '💊', taken: false },
    { id: 5, name: 'Salbutamol Inhaler', dose: '2 puffs', time: '6:00 PM', icon: '🫁', taken: false },
    { id: 6, name: 'Amlodipine 5mg', dose: '1 tablet', time: '9:00 PM', icon: '💊', taken: false },
  ];

  function init() {
    listEl = document.getElementById('medication-list');
    render();
  }

  function render() {
    if (!listEl) return;

    listEl.innerHTML = schedule.map(med => `
      <div class="med-item ${med.taken ? 'taken' : ''}" data-id="${med.id}">
        <span class="med-icon">${med.icon}</span>
        <div class="med-info">
          <div class="med-name">${med.name}</div>
          <div class="med-dose">${med.dose} — ${med.time}</div>
        </div>
        <button class="med-check ${med.taken ? 'checked' : ''}" data-id="${med.id}" aria-label="Mark as taken">
          ${med.taken ? '✓' : ''}
        </button>
      </div>
    `).join('');

    // Attach event listeners
    listEl.querySelectorAll('.med-check').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        toggleMed(id);
      });
    });
  }

  function toggleMed(id) {
    const med = schedule.find(m => m.id === id);
    if (med) {
      med.taken = !med.taken;
      render();
      if (med.taken) {
        Notifications.showToast(`✅ ${med.name} marked as taken`, 'success');
      }
    }
  }

  return { init };
})();
