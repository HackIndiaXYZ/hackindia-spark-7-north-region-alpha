/**
 * DIPDoc Digital Health Twin
 * Learns patient baseline patterns via exponential moving average,
 * then detects meaningful deviations from learned behavior.
 */
const DigitalTwin = (() => {
  const ALPHA = 0.08; // EMA smoothing factor (slow learner = more stable baseline)
  const MIN_READINGS = 15;
  let readingCount = 0;
  let panelEl = null;

  // Learned baseline (starts with population defaults for elderly male)
  const baseline = {
    heartRate:    72,
    temperature:  36.6,
    spo2:         97,
    bpSystolic:   128,
    bpDiastolic:  78,
    steps:        4200,
    sleepHours:   7.0,
    hydration:    62,
    mood:         70,
    glucose:      98,
    activity:     58,
    cognitive:    80
  };

  // Current deviations (percentage)
  const deviations = {};
  // Recent actual values for display
  const current = {};

  // Narrative insights
  let narratives = [];

  function init() {
    panelEl = document.getElementById('twin-panel');
  }

  function learn(data) {
    if (!data || !data.sensors) return;
    readingCount++;

    const s = data.sensors;
    const readings = {
      heartRate:   s.heartRate,
      temperature: s.temperature,
      spo2:        s.spo2,
      bpSystolic:  s.bpSystolic,
      bpDiastolic: s.bpDiastolic,
      steps:       s.steps || 4200,
      sleepHours:  s.sleepHours || 7,
      hydration:   s.hydration,
      mood:        s.mood || 70,
      glucose:     s.bloodGlucose || 95,
      activity:    s.activityScore || 60,
      cognitive:   s.cognitiveScore || 82
    };

    // Update baseline via EMA and compute deviations
    Object.keys(baseline).forEach(key => {
      const prev = baseline[key];
      const now = readings[key];
      current[key] = now;

      // Update baseline (EMA)
      baseline[key] = prev + ALPHA * (now - prev);

      // Compute deviation %
      if (prev !== 0) {
        deviations[key] = ((now - prev) / prev) * 100;
      }
    });

    narratives = generateNarratives();
    render();
  }

  function generateNarratives() {
    const narr = [];

    // Steps deviation
    if (current.steps && baseline.steps) {
      const stepDev = ((current.steps - baseline.steps) / baseline.steps) * 100;
      if (stepDev < -40) {
        narr.push({
          type: 'warning',
          metric: 'Walking Behavior',
          text: `Mr. Sharma's baseline is ${Math.round(baseline.steps)} steps/day. Current: ${current.steps} steps — ${Math.abs(Math.round(stepDev))}% below normal pattern.`,
          severity: stepDev < -60 ? 'high' : 'moderate'
        });
      }
    }

    // Heart rate deviation
    if (Math.abs(deviations.heartRate || 0) > 12) {
      const dir = deviations.heartRate > 0 ? 'above' : 'below';
      narr.push({
        type: deviations.heartRate > 15 ? 'warning' : 'info',
        metric: 'Heart Rate Pattern',
        text: `Resting heart rate is ${Math.abs(Math.round(deviations.heartRate))}% ${dir} learned baseline of ${Math.round(baseline.heartRate)} bpm.`,
        severity: Math.abs(deviations.heartRate) > 20 ? 'high' : 'moderate'
      });
    }

    // Sleep pattern
    if (deviations.sleepHours && deviations.sleepHours < -15) {
      narr.push({
        type: 'warning',
        metric: 'Sleep Cycle',
        text: `Sleep duration dropped from baseline ${baseline.sleepHours.toFixed(1)}h to ${current.sleepHours}h — possible circadian disruption.`,
        severity: deviations.sleepHours < -25 ? 'high' : 'moderate'
      });
    }

    // Mood pattern
    if (deviations.mood && deviations.mood < -15) {
      narr.push({
        type: 'warning',
        metric: 'Mood Pattern',
        text: `Mood score has declined ${Math.abs(Math.round(deviations.mood))}% from learned pattern. Combined with activity changes, this indicates behavioral shift.`,
        severity: deviations.mood < -25 ? 'high' : 'moderate'
      });
    }

    // Blood glucose trend
    if (deviations.glucose && Math.abs(deviations.glucose) > 10) {
      const dir = deviations.glucose > 0 ? 'above' : 'below';
      narr.push({
        type: 'info',
        metric: 'Blood Sugar',
        text: `Glucose reading is ${Math.abs(Math.round(deviations.glucose))}% ${dir} learned baseline of ${Math.round(baseline.glucose)} mg/dL.`,
        severity: Math.abs(deviations.glucose) > 20 ? 'high' : 'moderate'
      });
    }

    // Hydration
    if (deviations.hydration && deviations.hydration < -15) {
      narr.push({
        type: 'warning',
        metric: 'Hydration Level',
        text: `Hydration at ${current.hydration}% vs baseline ${Math.round(baseline.hydration)}% — sustained drop detected.`,
        severity: deviations.hydration < -25 ? 'high' : 'moderate'
      });
    }

    // Multi-signal alert
    const warningCount = narr.filter(n => n.type === 'warning').length;
    if (warningCount >= 3) {
      narr.unshift({
        type: 'critical',
        metric: 'Combined Pattern Alert',
        text: `${warningCount} simultaneous deviations from Digital Twin baseline detected. This compound pattern may indicate hidden health deterioration.`,
        severity: 'high'
      });
    }

    return narr;
  }

  function render() {
    if (!panelEl) return;

    if (readingCount < MIN_READINGS) {
      panelEl.innerHTML = `
        <div class="twin-learning">
          <div class="tl-spinner"></div>
          <div class="tl-text">Digital Twin is learning baseline patterns...</div>
          <div class="tl-progress">${readingCount}/${MIN_READINGS} data points collected</div>
        </div>`;
      return;
    }

    // Build deviation bars
    const keyMetrics = [
      { key: 'heartRate', label: 'Heart Rate', unit: 'bpm', icon: '♥' },
      { key: 'steps', label: 'Daily Steps', unit: '', icon: '👣' },
      { key: 'sleepHours', label: 'Sleep', unit: 'h', icon: '🌙' },
      { key: 'glucose', label: 'Blood Sugar', unit: 'mg/dL', icon: '🩸' },
      { key: 'mood', label: 'Mood Score', unit: '', icon: '😊' },
      { key: 'hydration', label: 'Hydration', unit: '%', icon: '💧' }
    ];

    const metricsHTML = keyMetrics.map(m => {
      const dev = deviations[m.key] || 0;
      const absdev = Math.abs(dev);
      const dir = dev >= 0 ? 'up' : 'down';
      const severity = absdev > 20 ? 'high' : absdev > 10 ? 'moderate' : 'normal';

      return `
        <div class="twin-metric">
          <div class="tm-left">
            <span class="tm-icon">${m.icon}</span>
            <div class="tm-info">
              <span class="tm-label">${m.label}</span>
              <span class="tm-baseline">Baseline: ${typeof baseline[m.key] === 'number' ? 
                (Number.isInteger(baseline[m.key]) ? Math.round(baseline[m.key]) : baseline[m.key].toFixed(1)) : baseline[m.key]}${m.unit ? ' ' + m.unit : ''}</span>
            </div>
          </div>
          <div class="tm-right">
            <span class="tm-current">${typeof current[m.key] === 'number' ? 
              (Number.isInteger(current[m.key]) ? current[m.key] : current[m.key].toFixed(1)) : current[m.key]}${m.unit ? ' ' + m.unit : ''}</span>
            <span class="tm-dev severity-${severity} dir-${dir}">${dev >= 0 ? '+' : ''}${dev.toFixed(1)}%</span>
          </div>
        </div>`;
    }).join('');

    const narrativesHTML = narratives.length > 0 ? narratives.map(n => `
      <div class="twin-narrative type-${n.type}">
        <div class="tn-dot severity-${n.severity}"></div>
        <div class="tn-content">
          <span class="tn-metric">${n.metric}</span>
          <p class="tn-text">${n.text}</p>
        </div>
      </div>
    `).join('') : `<div class="twin-narrative type-info">
        <div class="tn-dot severity-normal"></div>
        <div class="tn-content">
          <span class="tn-metric">All Clear</span>
          <p class="tn-text">All vitals within learned baseline patterns. Digital Twin model is stable.</p>
        </div>
      </div>`;

    panelEl.innerHTML = `
      <div class="twin-header-card">
        <div class="th-title">Digital Health Twin</div>
        <div class="th-sub">Learned from ${readingCount} data points</div>
      </div>
      <div class="twin-metrics-grid">${metricsHTML}</div>
      <div class="twin-narratives">
        <div class="tn-title">Pattern Analysis</div>
        ${narrativesHTML}
      </div>
    `;
  }

  function getBaseline() { return { ...baseline }; }
  function getDeviations() { return { ...deviations }; }
  function getNarratives() { return narratives; }

  return { init, learn, getBaseline, getDeviations, getNarratives };
})();
