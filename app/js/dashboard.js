/**
 * DIPDoc Dashboard v2 (Hackathon Edition)
 * Simplified, high-impact dashboard with Big Cards and Behavioral Analysis.
 */
const Dashboard = (() => {
  let riskScoreLabel, riskStatusBadge;
  let bgCards = {};
  
  const statusLabels = {
    Stable:   'Health Status: STABLE ✅',
    Moderate: 'Status: ⚠ Moderate Risk',
    High:     'Status: 🚨 High Risk'
  };

  function init() {
    riskScoreLabel = document.getElementById('dashboard-risk-score');
    riskStatusBadge = document.querySelector('.status-badge');

    // Big Card Elements
    const cardTypes = ['hr', 'temp', 'activity', 'sleep'];
    cardTypes.forEach(type => {
      bgCards[type] = {
        value: document.getElementById(type + '-value'),
        status: document.querySelector(`.big-card.${type} .bc-status`)
      };
    });

    initTrendChart();
  }

  function update(data) {
    if (!data || !data.sensors) return;
    const s = data.sensors;

    // 1. Behavioral Pattern Analysis Engine (Rule-Based)
    const analysis = analyzeBehavior(s);
    
    // 2. Update Risk Score
    if (riskScoreLabel) {
      animateValue(riskScoreLabel, parseInt(riskScoreLabel.textContent) || 0, analysis.score, 600);
    }
    
    // 3. Update Status Badge
    if (riskStatusBadge) {
      riskStatusBadge.textContent = statusLabels[analysis.level] || statusLabels.Stable;
      riskStatusBadge.className = 'status-badge ' + analysis.level.toLowerCase();
    }

    // 4. Update Big Cards
    updateBigCard('hr', s.heartRate, getHRStatus(s.heartRate));
    updateBigCard('temp', s.temperature, getTempStatus(s.temperature));
    updateBigCard('activity', s.activityLevel || 'Moderate', analysis.activityStatus);
    updateBigCard('sleep', (s.sleepHours || 7) + 'h ' + (s.sleepMins || 10) + 'm', analysis.sleepStatus);

    updateTrendChart(analysis.score);
  }

  /**
   * AI Behavioral Analysis Engine
   * Rule-based logic for hackathon "AI" feel.
   */
  function analyzeBehavior(s) {
    let score = 32; // Baseline
    let level = 'Stable';
    let activityStatus = 'Active';
    let sleepStatus = 'Good';

    // Heart Rate Rules
    if (s.heartRate > 100 || s.heartRate < 50) score += 15;
    
    // Activity Analysis (Simulated deviations)
    if (s.activityScore && s.activityScore < 40) {
      score += 20;
      activityStatus = 'Reduced Activity';
    }

    // Sleep Analysis
    if (s.sleepHours && s.sleepHours < 6) {
      score += 10;
      sleepStatus = 'Pattern Change';
    }

    // Caps
    score = Math.min(100, Math.max(0, score));

    if (score > 60) level = 'High';
    else if (score > 40) level = 'Moderate';

    return { score, level, activityStatus, sleepStatus };
  }

  function getHRStatus(hr) {
    if (hr > 100 || hr < 50) return 'Abnormal';
    return 'Normal';
  }

  function getTempStatus(t) {
    if (t > 37.5 || t < 36.0) return 'Variation';
    return 'Stable';
  }

  function updateBigCard(type, value, status) {
    const card = bgCards[type];
    if (!card) return;
    
    if (card.value) card.value.textContent = value;
    if (card.status) {
      card.status.textContent = status;
      card.status.style.color = (status === 'Normal' || status === 'Stable' || status === 'Active' || status === 'Good') 
        ? 'var(--emerald)' 
        : 'var(--amber)';
    }
  }

  // Simple Chart implementation
  let trendChart;
  function initTrendChart() {
    const ctx = document.getElementById('dashboard-trend-chart')?.getContext('2d');
    if (!ctx) return;

    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array(10).fill(''),
        datasets: [{
          label: 'Risk Trend',
          data: Array(10).fill(32),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 0,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { display: false, min: 0, max: 100 },
          x: { display: false }
        }
      }
    });
  }

  function updateTrendChart(newVal) {
    if (!trendChart) return;
    const data = trendChart.data.datasets[0].data;
    data.shift();
    data.push(newVal);
    
    // Dynamic color based on risk
    trendChart.data.datasets[0].borderColor = newVal > 40 ? '#F59E0B' : '#10B981';
    trendChart.update();
  }

  function animateValue(el, from, to, duration) {
    const startTime = performance.now();
    const diff = to - from;
    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(from + diff * eased);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  return { init, update };
})();
