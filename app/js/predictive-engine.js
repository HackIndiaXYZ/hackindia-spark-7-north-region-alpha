/**
 * DIPDoc Predictive Disease Forecasting Engine
 * Analyzes rolling vital history to predict health events 24-48h ahead.
 * Covers: Diabetic Shock, Cardiac Anomaly, Fall Risk, Stroke, Cognitive Decline
 */
const PredictiveEngine = (() => {
  const BUFFER_SIZE = 120; // ~2 min at 1s interval, simulates 48h window
  const history = [];
  let forecasts = [];
  let panelEl = null;

  // Baseline thresholds for trend analysis
  const THRESHOLDS = {
    diabeticShock: {
      glucoseDropRate: 8,     // mg/dL drop per reading window
      glucoseLow: 75,
      hydrationLow: 42,
      hrElevated: 95
    },
    cardiac: {
      hrVariabilityHigh: 18,
      hrSustainedHigh: 100,
      bpSystolicHigh: 145,
      hrIrregularRatio: 0.3
    },
    fallRisk: {
      stepsDropPercent: 60,
      activityLow: 30,
      balanceThreshold: 0.4
    },
    stroke: {
      bpSpikeThreshold: 155,
      hrAbnormal: 110,
      tempElevated: 37.8,
      combinedRiskThreshold: 2
    },
    cognitive: {
      sleepDropHours: 1.5,
      moodDeclineRate: 15,
      activityPatternChange: 0.35
    }
  };

  function init() {
    panelEl = document.getElementById('forecast-panel');
  }

  function addReading(data) {
    if (!data || !data.sensors) return;

    const reading = {
      ts: Date.now(),
      hr: data.sensors.heartRate,
      temp: data.sensors.temperature,
      spo2: data.sensors.spo2,
      hydration: data.sensors.hydration,
      bpSys: data.sensors.bpSystolic,
      bpDia: data.sensors.bpDiastolic,
      glucose: data.sensors.bloodGlucose || 95,
      steps: data.sensors.steps || 4200,
      mood: data.sensors.mood || 70,
      cognitive: data.sensors.cognitiveScore || 82,
      sleepHrs: data.sensors.sleepHours || 7,
      activity: data.sensors.activityScore || 60
    };

    history.push(reading);
    if (history.length > BUFFER_SIZE) history.shift();

    if (history.length >= 10) {
      forecasts = runForecasts();
      render();
    }
  }

  function runForecasts() {
    const results = [];
    const recent = history.slice(-20);
    const older = history.slice(-60, -20);

    // 1. Diabetic Shock Risk
    const glucoseTrend = calcTrend(recent.map(r => r.glucose));
    const avgHydration = avg(recent.map(r => r.hydration));
    const avgHR = avg(recent.map(r => r.hr));
    let diabeticRisk = 0;

    if (glucoseTrend < -2) diabeticRisk += 35;
    if (avg(recent.map(r => r.glucose)) < THRESHOLDS.diabeticShock.glucoseLow) diabeticRisk += 30;
    if (avgHydration < THRESHOLDS.diabeticShock.hydrationLow) diabeticRisk += 20;
    if (avgHR > THRESHOLDS.diabeticShock.hrElevated) diabeticRisk += 15;

    if (diabeticRisk > 15) {
      results.push({
        id: 'diabetic-shock',
        name: 'Diabetic Shock Risk',
        risk: clamp(diabeticRisk, 0, 95),
        timeHorizon: '24-36h',
        severity: diabeticRisk > 60 ? 'high' : diabeticRisk > 35 ? 'moderate' : 'low',
        factors: buildFactors([
          glucoseTrend < -2 && 'Declining blood glucose trend',
          avgHydration < 45 && `Low hydration (${Math.round(avgHydration)}%)`,
          avgHR > 95 && `Elevated heart rate (${Math.round(avgHR)} bpm)`
        ]),
        icon: '🩸'
      });
    }

    // 2. Cardiac Anomaly Risk
    const hrValues = recent.map(r => r.hr);
    const hrVariability = calcStdDev(hrValues);
    const bpAvg = avg(recent.map(r => r.bpSys));
    let cardiacRisk = 0;

    if (hrVariability > THRESHOLDS.cardiac.hrVariabilityHigh) cardiacRisk += 30;
    if (avgHR > THRESHOLDS.cardiac.hrSustainedHigh) cardiacRisk += 25;
    if (bpAvg > THRESHOLDS.cardiac.bpSystolicHigh) cardiacRisk += 25;
    const irregularBeats = hrValues.filter((v, i) => i > 0 && Math.abs(v - hrValues[i - 1]) > 12).length;
    if (irregularBeats / hrValues.length > THRESHOLDS.cardiac.hrIrregularRatio) cardiacRisk += 20;

    if (cardiacRisk > 15) {
      results.push({
        id: 'cardiac-anomaly',
        name: 'Cardiac Anomaly',
        risk: clamp(cardiacRisk, 0, 95),
        timeHorizon: '12-24h',
        severity: cardiacRisk > 60 ? 'high' : cardiacRisk > 35 ? 'moderate' : 'low',
        factors: buildFactors([
          hrVariability > 18 && `High HRV (${hrVariability.toFixed(1)})`,
          avgHR > 100 && `Sustained high HR (${Math.round(avgHR)} bpm)`,
          bpAvg > 145 && `Elevated BP (${Math.round(bpAvg)} mmHg)`
        ]),
        icon: '🫀'
      });
    }

    // 3. Fall Risk
    const stepsTrend = calcTrend(recent.map(r => r.steps));
    const avgActivity = avg(recent.map(r => r.activity));
    let fallRisk = 0;

    if (stepsTrend < -50) fallRisk += 30;
    if (avgActivity < THRESHOLDS.fallRisk.activityLow) fallRisk += 25;
    if (avg(recent.map(r => r.steps)) < 1500) fallRisk += 25;
    if (avgHR > 95 && avgActivity < 40) fallRisk += 20;

    if (fallRisk > 15) {
      results.push({
        id: 'fall-risk',
        name: 'Fall Risk Prediction',
        risk: clamp(fallRisk, 0, 95),
        timeHorizon: '24-48h',
        severity: fallRisk > 60 ? 'high' : fallRisk > 35 ? 'moderate' : 'low',
        factors: buildFactors([
          stepsTrend < -50 && 'Rapid decline in step count',
          avgActivity < 30 && 'Very low activity levels',
          avgHR > 95 && 'Elevated resting heart rate'
        ]),
        icon: '⚠️'
      });
    }

    // 4. Stroke Warning
    const tempAvg = avg(recent.map(r => r.temp));
    let strokeRisk = 0;
    let strokeSignals = 0;

    if (bpAvg > THRESHOLDS.stroke.bpSpikeThreshold) { strokeRisk += 30; strokeSignals++; }
    if (avgHR > THRESHOLDS.stroke.hrAbnormal) { strokeRisk += 20; strokeSignals++; }
    if (tempAvg > THRESHOLDS.stroke.tempElevated) { strokeRisk += 15; strokeSignals++; }
    if (hrVariability > 20) { strokeRisk += 15; strokeSignals++; }
    if (strokeSignals >= THRESHOLDS.stroke.combinedRiskThreshold) strokeRisk += 15;

    if (strokeRisk > 20) {
      results.push({
        id: 'stroke-warning',
        name: 'Stroke Warning',
        risk: clamp(strokeRisk, 0, 95),
        timeHorizon: '6-24h',
        severity: strokeRisk > 60 ? 'high' : strokeRisk > 35 ? 'moderate' : 'low',
        factors: buildFactors([
          bpAvg > 155 && `High blood pressure (${Math.round(bpAvg)} mmHg)`,
          avgHR > 110 && `Abnormal heart rate (${Math.round(avgHR)} bpm)`,
          tempAvg > 37.8 && `Elevated temperature (${tempAvg.toFixed(1)}°C)`,
          strokeSignals >= 2 && `${strokeSignals} concurrent risk signals`
        ]),
        icon: '🧠'
      });
    }

    // 5. Cognitive Decline
    const moodTrend = calcTrend(recent.map(r => r.mood));
    const cognitiveTrend = calcTrend(recent.map(r => r.cognitive));
    const sleepAvg = avg(recent.map(r => r.sleepHrs));
    let cognitiveRisk = 0;

    if (moodTrend < -3) cognitiveRisk += 25;
    if (cognitiveTrend < -2) cognitiveRisk += 30;
    if (sleepAvg < 5.5) cognitiveRisk += 25;
    if (avgActivity < 35) cognitiveRisk += 20;

    if (cognitiveRisk > 15) {
      results.push({
        id: 'cognitive-decline',
        name: 'Cognitive Decline Markers',
        risk: clamp(cognitiveRisk, 0, 95),
        timeHorizon: '48h+',
        severity: cognitiveRisk > 60 ? 'high' : cognitiveRisk > 35 ? 'moderate' : 'low',
        factors: buildFactors([
          moodTrend < -3 && 'Declining mood pattern',
          cognitiveTrend < -2 && 'Reduced cognitive score trend',
          sleepAvg < 5.5 && `Poor sleep average (${sleepAvg.toFixed(1)}h)`,
          avgActivity < 35 && 'Significantly reduced activity'
        ]),
        icon: '🧩'
      });
    }

    results.sort((a, b) => b.risk - a.risk);
    return results;
  }

  function render() {
    if (!panelEl) return;

    if (forecasts.length === 0) {
      panelEl.innerHTML = `
        <div class="forecast-empty">
          <div class="fe-icon">✓</div>
          <div class="fe-text">No risk events predicted in the next 48 hours</div>
          <div class="fe-sub">Continuously analyzing ${history.length} data points</div>
        </div>`;
      return;
    }

    panelEl.innerHTML = forecasts.map(f => `
      <div class="forecast-card severity-${f.severity}" id="fc-${f.id}">
        <div class="fc-header">
          <div class="fc-icon-wrap severity-${f.severity}">${f.icon}</div>
          <div class="fc-title-block">
            <span class="fc-name">${f.name}</span>
            <span class="fc-horizon">Predicted window: ${f.timeHorizon}</span>
          </div>
          <div class="fc-risk-badge severity-${f.severity}">${f.risk}%</div>
        </div>
        <div class="fc-bar-track">
          <div class="fc-bar-fill severity-${f.severity}" style="width:${f.risk}%"></div>
        </div>
        <div class="fc-factors">
          ${f.factors.map(fct => `<span class="fc-factor">${fct}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }

  // Utilities
  function avg(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function calcTrend(arr) {
    if (arr.length < 5) return 0;
    const n = arr.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i; sumY += arr[i]; sumXY += i * arr[i]; sumX2 += i * i;
    }
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  function calcStdDev(arr) {
    const m = avg(arr);
    const variance = arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }

  function buildFactors(items) {
    return items.filter(Boolean);
  }

  function getForecasts() { return forecasts; }
  function getHistorySize() { return history.length; }

  return { init, addReading, getForecasts, getHistorySize };
})();
