/**
 * DIPDoc Notifications & Caregiver Alert System (Hackathon Edition)
 * Handles the logic for Screen 3 (Alerts) and Screen 4 (Caregiver).
 */
const Notifications = (() => {
  let alertsListEl, caregiverAlertHistoryEl;
  let alerts = [];

  function init() {
    alertsListEl = document.getElementById('alerts-list');
    caregiverAlertHistoryEl = document.getElementById('caregiver-alert-history');

    // Initialize with some mock history if empty
    if (alerts.length === 0) {
      pushAlert('warning', 'Reduced Activity Detected', 'Today 10:35 AM');
      pushAlert('warning', 'Sleep Pattern Deviation', 'Yesterday');
      pushAlert('normal', 'Stable Heart Rate', '2 hours ago');
    }
  }

  // ── Push Alert ──────────────────────────────────────────
  function pushAlert(type, message, timeText = null) {
    const alert = {
      id: Date.now(),
      type,          // 'critical' | 'warning' | 'normal'
      message,
      time: timeText || formatTime(new Date()),
      timestamp: new Date()
    };

    alerts.unshift(alert);
    if (alerts.length > 20) alerts.pop();

    renderAlerts();
    
    // Show toast for real-time feedback
    const toastType = type === 'critical' ? 'error' : type === 'warning' ? 'warning' : 'success';
    showToast(message, toastType);

    return alert;
  }

  // ── Render Alerts ──────────────────────────────────────
  function renderAlerts() {
    // 1. Screen 3: Alerts Page
    if (alertsListEl) {
      alertsListEl.innerHTML = alerts.map(a => `
        <div class="alert-card ${a.type === 'normal' ? 'resolved' : 'warning'}">
          <div class="alert-badge ${getBadgeColor(a.type)}">${getBadgeText(a.type)}</div>
          <div class="alert-content">
            <h3>${a.type === 'normal' ? '✅' : '⚠'} ${a.message}</h3>
            <p>${a.time}</p>
          </div>
        </div>
      `).join('');
    }

    // 2. Screen 4: Caregiver View History
    if (caregiverAlertHistoryEl) {
      caregiverAlertHistoryEl.innerHTML = alerts.slice(0, 5).map(a => `
        <div class="alert-card ${a.type === 'normal' ? 'resolved' : 'warning'}" style="margin-bottom: 8px; padding: 12px;">
          <div class="alert-badge ${getBadgeColor(a.type)}" style="font-size: 8px;">${getBadgeText(a.type)}</div>
          <div class="alert-content">
            <h4 style="font-size: 13px; margin: 0;">${a.message}</h4>
            <p style="font-size: 10px; margin: 2px 0 0;">${a.time}</p>
          </div>
        </div>
      `).join('');
    }
    
    // 3. Update Caregiver Status Badge (Screen 4)
    updateCaregiverStatus();
  }

  function getBadgeColor(type) {
    if (type === 'critical') return 'red';
    if (type === 'warning') return 'yellow';
    return 'green';
  }

  function getBadgeText(type) {
    if (type === 'critical') return 'Urgent';
    if (type === 'warning') return 'Warning';
    return 'Resolved';
  }

  function updateCaregiverStatus() {
    const statusVal = document.querySelector('.cgm-value.stable');
    if (!statusVal) return;
    
    const latest = alerts[0];
    if (latest && latest.type === 'critical') {
      statusVal.textContent = 'URGENT';
      statusVal.style.color = 'var(--crimson)';
    } else if (latest && latest.type === 'warning') {
      statusVal.textContent = 'MODERATE';
      statusVal.style.color = 'var(--amber)';
    } else {
      statusVal.textContent = 'STABLE';
      statusVal.style.color = 'var(--emerald)';
    }
  }

  // ── Toast ──────────────────────────────────────────────
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 4000);
  }

  function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  return { init, pushAlert, showToast };
})();
