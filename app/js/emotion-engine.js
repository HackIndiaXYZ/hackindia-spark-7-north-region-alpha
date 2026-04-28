/**
 * DIPDoc Emotion & Loneliness Detection Engine
 * Tracks voice sentiment, mood swings, activity patterns, and social isolation signals.
 * Outputs: Depression risk, Isolation risk, Cognitive stress levels.
 */
const EmotionEngine = (() => {
  const HISTORY_SIZE = 80;
  const history = [];
  let panelEl = null;
  let readingCount = 0;

  // Weighted emotional state
  let emotionalState = {
    moodScore: 72,         // 0-100
    isolationIndex: 15,    // 0-100 (higher = more isolated)
    depressionRisk: 8,     // 0-100
    cognitiveStress: 12,   // 0-100
    overallWellness: 85    // 0-100
  };

  // Rolling averages for trend detection
  let moodBuffer = [];
  let activityBuffer = [];
  let voiceBuffer = [];
  let socialBuffer = [];

  function init() {
    panelEl = document.getElementById('emotion-panel');
  }

  function analyze(data) {
    if (!data || !data.sensors) return;
    readingCount++;

    const s = data.sensors;
    const mood = s.mood || randomBetween(55, 85);
    const voiceSentiment = s.voiceSentiment || randomBetween(40, 90);
    const activity = s.activityScore || randomBetween(35, 75);
    const socialActivity = s.socialActivity || randomBetween(30, 80);

    moodBuffer.push(mood);
    activityBuffer.push(activity);
    voiceBuffer.push(voiceSentiment);
    socialBuffer.push(socialActivity);

    if (moodBuffer.length > HISTORY_SIZE) {
      moodBuffer.shift();
      activityBuffer.shift();
      voiceBuffer.shift();
      socialBuffer.shift();
    }

    history.push({
      ts: Date.now(),
      mood, voiceSentiment, activity, socialActivity
    });
    if (history.length > HISTORY_SIZE) history.shift();

    // Calculate emotional indicators
    const moodTrend = calcTrend(moodBuffer.slice(-20));
    const moodVolatility = calcVolatility(moodBuffer.slice(-15));
    const avgMood = avg(moodBuffer.slice(-10));
    const avgActivity = avg(activityBuffer.slice(-10));
    const avgVoice = avg(voiceBuffer.slice(-10));
    const avgSocial = avg(socialBuffer.slice(-10));
    const activityTrend = calcTrend(activityBuffer.slice(-20));

    // 1. Mood Score (weighted composite)
    emotionalState.moodScore = clamp(
      avgMood * 0.4 + avgVoice * 0.3 + avgActivity * 0.15 + avgSocial * 0.15,
      0, 100
    );

    // 2. Isolation Index
    let isolation = 0;
    if (avgSocial < 40) isolation += 35;
    else if (avgSocial < 55) isolation += 20;
    if (avgActivity < 35) isolation += 25;
    if (activityTrend < -2) isolation += 15;
    if (avgMood < 50) isolation += 15;
    if (avgVoice < 45) isolation += 10;
    emotionalState.isolationIndex = clamp(isolation, 0, 100);

    // 3. Depression Risk
    let depression = 0;
    if (moodTrend < -1.5) depression += 25;
    if (avgMood < 45) depression += 25;
    if (moodVolatility > 15) depression += 15;
    if (avgActivity < 30) depression += 20;
    if (avgSocial < 35) depression += 15;
    emotionalState.depressionRisk = clamp(depression, 0, 100);

    // 4. Cognitive Stress
    let stress = 0;
    if (moodVolatility > 12) stress += 25;
    if (avgVoice < 50) stress += 20;
    if (data.sensors.heartRate > 90 && avgActivity < 40) stress += 20;
    if (data.sensors.sleepHours && data.sensors.sleepHours < 5) stress += 20;
    if (moodTrend < -1) stress += 15;
    emotionalState.cognitiveStress = clamp(stress, 0, 100);

    // 5. Overall Wellness
    emotionalState.overallWellness = clamp(
      100 - (emotionalState.depressionRisk * 0.35 +
             emotionalState.isolationIndex * 0.25 +
             emotionalState.cognitiveStress * 0.25 +
             (100 - emotionalState.moodScore) * 0.15),
      0, 100
    );

    render();
  }

  function render() {
    if (!panelEl) return;

    if (readingCount < 8) {
      panelEl.innerHTML = `
        <div class="emotion-calibrating">
          <div class="ec-ring"></div>
          <div class="ec-text">Calibrating emotional baseline...</div>
          <div class="ec-sub">${readingCount}/8 voice + activity samples</div>
        </div>`;
      return;
    }

    const es = emotionalState;
    const wellnessColor = es.overallWellness > 70 ? 'good' : es.overallWellness > 45 ? 'moderate' : 'poor';

    panelEl.innerHTML = `
      <div class="emotion-wellness-ring">
        <div class="ewr-circle ${wellnessColor}">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke-width="8"
              class="ewr-progress ${wellnessColor}"
              stroke-dasharray="${Math.PI * 104}"
              stroke-dashoffset="${Math.PI * 104 * (1 - es.overallWellness / 100)}"
              stroke-linecap="round"
              transform="rotate(-90 60 60)"/>
          </svg>
          <div class="ewr-value">${Math.round(es.overallWellness)}</div>
          <div class="ewr-label">Wellness</div>
        </div>
      </div>

      <div class="emotion-indicators">
        ${renderIndicator('Mood', es.moodScore, getMoodLabel(es.moodScore), '😊')}
        ${renderIndicator('Isolation', es.isolationIndex, getIsolationLabel(es.isolationIndex), '🏠')}
        ${renderIndicator('Depression Risk', es.depressionRisk, getRiskLabel(es.depressionRisk), '💭')}
        ${renderIndicator('Cognitive Stress', es.cognitiveStress, getRiskLabel(es.cognitiveStress), '🧠')}
      </div>

      <div class="emotion-signals">
        <div class="es-title">Detection Signals</div>
        ${renderSignal('Voice Sentiment', avg(voiceBuffer.slice(-5)), 'voice')}
        ${renderSignal('Activity Pattern', avg(activityBuffer.slice(-5)), 'activity')}
        ${renderSignal('Social Interaction', avg(socialBuffer.slice(-5)), 'social')}
        ${renderSignal('Mood Stability', 100 - calcVolatility(moodBuffer.slice(-10)) * 3, 'mood')}
      </div>
    `;
  }

  function renderIndicator(label, value, status, icon) {
    const severity = value > 65 && label.includes('Risk') ? 'high' :
                     value > 40 && label.includes('Risk') ? 'moderate' :
                     value < 40 && !label.includes('Risk') ? 'moderate' : 'normal';
    return `
      <div class="ei-card ${severity}">
        <div class="ei-top">
          <span class="ei-icon">${icon}</span>
          <span class="ei-value">${Math.round(value)}</span>
        </div>
        <div class="ei-label">${label}</div>
        <div class="ei-status">${status}</div>
      </div>`;
  }

  function renderSignal(label, value, type) {
    const pct = clamp(value, 0, 100);
    const level = pct > 65 ? 'good' : pct > 40 ? 'fair' : 'low';
    return `
      <div class="es-row">
        <span class="es-label">${label}</span>
        <div class="es-bar-track">
          <div class="es-bar-fill ${level}" style="width:${pct}%"></div>
        </div>
        <span class="es-val">${Math.round(pct)}</span>
      </div>`;
  }

  function getMoodLabel(v) { return v > 70 ? 'Positive' : v > 45 ? 'Neutral' : 'Low'; }
  function getIsolationLabel(v) { return v > 60 ? 'Isolated' : v > 30 ? 'Some isolation' : 'Connected'; }
  function getRiskLabel(v) { return v > 60 ? 'Elevated' : v > 30 ? 'Mild' : 'Low'; }

  // Utilities
  function avg(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 50; }
  function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
  function randomBetween(a, b) { return Math.round(a + Math.random() * (b - a)); }

  function calcTrend(arr) {
    if (arr.length < 4) return 0;
    const n = arr.length;
    let sx = 0, sy = 0, sxy = 0, sx2 = 0;
    for (let i = 0; i < n; i++) { sx += i; sy += arr[i]; sxy += i * arr[i]; sx2 += i * i; }
    return (n * sxy - sx * sy) / (n * sx2 - sx * sx);
  }

  function calcVolatility(arr) {
    if (arr.length < 3) return 0;
    const m = avg(arr);
    return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length);
  }

  function getState() { return { ...emotionalState }; }

  return { init, analyze, getState };
})();
