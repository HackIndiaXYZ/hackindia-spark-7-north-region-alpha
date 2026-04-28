/**
 * DIPDoc App Controller v3
 * Main entry point. Initializes all modules including novelty features.
 */
const DIPDocApp = (() => {
  let lastStatus = 'Stable';
  let dataTickCount = 0;

  function init() {
    console.log('DIPDoc v3.0 — Initializing Core Systems...');

    // Init core modules
    Navigation.init();
    AmbientGlow.init();
    Dashboard.init();
    SHAPChart.init();
    RiskEngine.init();
    CloudSync.init();
    Notifications.init();
    Profile.init();

    // Init novelty modules
    PredictiveEngine.init();
    DigitalTwin.init();
    EmotionEngine.init();

    // Wire auth form switching
    setupAuthUI();

    // Wire up Caregiver Quick Actions
    const btnCgReport = document.getElementById('btn-cg-top-report');
    if (btnCgReport) {
      btnCgReport.addEventListener('click', () => {
        Notifications.showToast('Generating clinical report...', 'info');
      });
    }

    // Connect Simulator
    DIPSimulator.onData(handleSensorData);
    DIPSimulator.start(1000);

    console.log('DIPDoc v3.0 Ready');
  }

  function setupAuthUI() {
    const switchToReg = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');
    const signinCard = document.getElementById('auth-signin');
    const registerCard = document.getElementById('auth-register');
    const togglePwd = document.getElementById('toggle-password');
    const pwdField = document.getElementById('password');

    if (switchToReg && switchToLogin) {
      switchToReg.addEventListener('click', () => {
        signinCard.classList.add('hidden');
        registerCard.classList.remove('hidden');
      });
      switchToLogin.addEventListener('click', () => {
        registerCard.classList.add('hidden');
        signinCard.classList.remove('hidden');
      });
    }

    if (togglePwd && pwdField) {
      togglePwd.addEventListener('click', () => {
        const isPassword = pwdField.type === 'password';
        pwdField.type = isPassword ? 'text' : 'password';
      });
    }

    // Register form submission
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        Navigation.switchTo('home');
        Notifications.showToast('Account created successfully', 'success');
      });
    }
  }

  /* 
   * Central Data Dispatcher
   */
  function handleSensorData(data) {
    dataTickCount++;

    // 1. Dashboard UI
    Dashboard.update(data);

    // 2. Risk & Diagnostic Prediction
    RiskEngine.update(data);

    // 3. Novelty Features (every tick for responsiveness)
    PredictiveEngine.addReading(data);
    DigitalTwin.learn(data);
    EmotionEngine.analyze(data);

    // 4. Health Analysis
    if (dataTickCount % 3 === 0) {
      SHAPChart.update(data.localStatus, data);
      updateAnalysisSummary(data);
    }

    // 5. Family Care Dashboard
    updateFamilyDashboard(data);

    // 6. Alert Notifications
    handleAlerts(data);
    
    // 7. Cloud Sync
    if (dataTickCount % 10 === 0) {
      CloudSync.syncData(data);
    }
  }

  function handleAlerts(data) {
    if (data.localStatus !== lastStatus) {
      if (data.localStatus === 'Critical') {
        Notifications.pushAlert('critical', 'Abnormal readings detected. Guardian notified.');
      } else if (data.localStatus === 'Warning') {
        Notifications.pushAlert('warning', 'Minor deviation detected in vitals.');
      }
      lastStatus = data.localStatus;
    }
  }

  function updateAnalysisSummary(data) {
    const list = document.getElementById('analysis-summary-list');
    const risk = document.getElementById('analysis-risk-trend');
    const rec = document.getElementById('analysis-recommendation');
    if (!list) return;

    if (data.localStatus === 'Stable') {
      list.innerHTML = '<li>Vitals are within normal ranges.</li><li>Activity level is consistent with baseline.</li>';
      risk.textContent = 'Status: Stable';
      rec.textContent = 'Recommendation: Continue healthy routine.';
    } else {
      list.innerHTML = '<li>Fluctuation in heart rate detected.</li><li>Elevated body temperature noted.</li>';
      risk.textContent = 'Status: Increasing Risk';
      rec.textContent = 'Recommendation: Rest and monitor vitals closely.';
    }
  }

  function updateFamilyDashboard(data) {
    const s = data.sensors;
    const scoreEl = document.getElementById('family-score');
    const progressEl = document.getElementById('fhh-progress');
    const statusEl = document.getElementById('family-status-badge');
    const stripEl = document.getElementById('risk-strip');

    // Compute health score (inverse of deviation)
    const healthScore = Math.max(0, Math.min(100, 100 - data.deviationScore));
    
    if (scoreEl) scoreEl.textContent = healthScore;
    
    // Update ring
    if (progressEl) {
      const circumference = 2 * Math.PI * 60;
      const offset = circumference * (1 - healthScore / 100);
      progressEl.setAttribute('stroke-dashoffset', offset);
      
      progressEl.className = 'fhh-arc ' + 
        (healthScore > 70 ? 'stable' : healthScore > 45 ? 'attention' : 'high');
    }

    // Update status badge
    if (statusEl) {
      const dot = statusEl.querySelector('.fhh-dot');
      const text = statusEl.querySelector('.fhh-status-text');
      if (healthScore > 70) {
        if (dot) dot.className = 'fhh-dot stable';
        if (text) text.textContent = 'Stable';
      } else if (healthScore > 45) {
        if (dot) dot.className = 'fhh-dot attention';
        if (text) text.textContent = 'Needs Attention';
      } else {
        if (dot) dot.className = 'fhh-dot high';
        if (text) text.textContent = 'High Risk';
      }
    }

    // Update risk strip
    if (stripEl) {
      const items = stripEl.querySelectorAll('.rls-item');
      const level = healthScore > 70 ? 'stable' : healthScore > 45 ? 'attention' : 'high';
      items.forEach(item => {
        item.classList.toggle('active', item.dataset.level === level);
      });
    }

    // Daily summary
    const dsSteps = document.getElementById('ds-steps');
    const dsSleep = document.getElementById('ds-sleep');
    const dsMood = document.getElementById('ds-mood');
    const dsHR = document.getElementById('ds-hr');

    if (dsSteps) dsSteps.textContent = (s.steps || 4200).toLocaleString();
    if (dsSleep) dsSleep.textContent = (s.sleepHours || 7) + 'h';
    if (dsMood) {
      const mood = s.mood || 70;
      dsMood.textContent = mood > 70 ? 'Good' : mood > 45 ? 'Fair' : 'Low';
    }
    if (dsHR) dsHR.textContent = s.heartRate + ' bpm';

    // Update dashboard cards too
    const stepsVal = document.getElementById('steps-value');
    const glucoseVal = document.getElementById('glucose-value');
    const glucoseStatus = document.getElementById('glucose-status');
    const spo2Val = document.getElementById('spo2-value');
    const bpVal = document.getElementById('bp-value');
    const hydrationVal = document.getElementById('hydration-value');
    const stepsStatus = document.getElementById('steps-status');

    if (stepsVal) stepsVal.textContent = (s.steps || 4200).toLocaleString();
    if (glucoseVal) glucoseVal.textContent = s.bloodGlucose || 95;
    if (glucoseStatus) {
      const g = s.bloodGlucose || 95;
      glucoseStatus.textContent = g > 110 ? 'High' : g < 70 ? 'Low' : 'Normal';
      glucoseStatus.style.color = (g > 110 || g < 70) ? 'var(--amber)' : 'var(--emerald)';
    }
    if (spo2Val) spo2Val.textContent = s.spo2;
    if (bpVal) bpVal.textContent = s.bpSystolic;
    if (hydrationVal) hydrationVal.textContent = s.hydration;
    if (stepsStatus) {
      const st = s.steps || 4200;
      stepsStatus.textContent = st > 3000 ? 'Active' : st > 1500 ? 'Moderate' : 'Low';
      stepsStatus.style.color = st > 3000 ? 'var(--emerald)' : 'var(--amber)';
    }
  }

  // Boot App
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init };
})();
