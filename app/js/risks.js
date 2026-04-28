/**
 * DIPDoc Risk Assessment & Diagnostic Engine
 * Analyzes vitals to calculate risk level and predict potential conditions.
 */
const RiskEngine = (() => {
  let factorsEl, recommendationsEl;
  let predictionPanel, doctorRec;

  const riskFactors = [
    { id: 'dehydration', name: 'Dehydration Risk', check: (s) => s.hydration < 50, desc: (s) => `Hydration at ${s.hydration}%` },
    { id: 'cardiac', name: 'Cardiac Stress', check: (s) => s.heartRate > 100 || s.heartRate < 50, desc: (s) => `Heart rate: ${s.heartRate} bpm` },
    { id: 'hypoxia', name: 'Low Oxygen', check: (s) => s.spo2 < 95, desc: (s) => `SpO2: ${s.spo2}%` },
    { id: 'fever', name: 'Temperature', check: (s) => s.temperature > 37.5, desc: (s) => `Temp: ${s.temperature}°C` }
  ];

  /* 
   * ── Diagnostic Prediction Matrix ────────────────────────
   * Mapped by vital source for clear traceability.
   */
  const conditionMatrix = {
    heartRate: [
      { name: 'Tachycardia', min: 100, max: 130, weight: 80, class: 'heart' },
      { name: 'Atrial Fibrillation', min: 110, max: 140, weight: 45, class: 'heart' },
      { name: 'Anxiety/Panic Attack', min: 95, max: 120, weight: 55, class: 'heart' },
      { name: 'Bradycardia', min: 0, max: 50, weight: 90, class: 'heart' }
    ],
    temperature: [
      { name: 'Viral Infection', min: 38, max: 40, weight: 75, class: 'temp' },
      { name: 'Heat Exhaustion', min: 37.8, max: 39, weight: 40, class: 'temp' },
      { name: 'Hypertension Crisis', min: 39, max: 42, weight: 65, class: 'temp' }
    ],
    spo2: [
      { name: 'Acute Hypoxia', min: 0, max: 93, weight: 85, class: 'oxy' },
      { name: 'Respiratory Distress', min: 0, max: 95, weight: 60, class: 'oxy' }
    ],
    hydration: [
      { name: 'Mild Dehydration', min: 0, max: 45, weight: 70, class: 'oxy' },
      { name: 'Electrolyte Imbalance', min: 0, max: 40, weight: 40, class: 'oxy' }
    ]
  };

  function init() {
    factorsEl = document.getElementById('risk-factors');
    recommendationsEl = document.getElementById('recommendations');
    predictionPanel = document.getElementById('prediction-panel');
    doctorRec = document.getElementById('doctor-recommendation');
  }

  function update(data) {
    if (!data || !data.sensors) return;
    const s = data.sensors;

    // Predict Conditions based on deviations
    const predictions = [];

    // Heart Rate Predictions
    conditionMatrix.heartRate.forEach(c => {
      if (s.heartRate >= c.min && s.heartRate <= c.max) {
        predictions.push({ ...c, source: 'Heart Rate Deviation' });
      }
    });

    // Temp Predictions
    conditionMatrix.temperature.forEach(c => {
      if (s.temperature >= c.min && s.temperature <= c.max) {
        predictions.push({ ...c, source: 'Temperature Deviation' });
      }
    });

    // Oxygen Predictions
    conditionMatrix.spo2.forEach(c => {
      if (s.spo2 >= c.min && s.spo2 <= c.max) {
        predictions.push({ ...c, source: 'SpO2 Deviation' });
      }
    });

    // Hydration Predictions
    conditionMatrix.hydration.forEach(c => {
      if (s.hydration >= c.min && s.hydration <= c.max) {
        predictions.push({ ...c, source: 'Hydration Deviation' });
      }
    });

    renderPredictions(predictions);
  }

  function renderPredictions(preds) {
    if (!predictionPanel) return;

    if (preds.length === 0) {
      predictionPanel.innerHTML = '<div class="prediction-empty">No significant deviations detected. Scanning vitals...</div>';
      if (doctorRec) doctorRec.style.display = 'none';
      return;
    }

    // Sort by confidence
    preds.sort((a, b) => b.weight - a.weight);

    predictionPanel.innerHTML = preds.map(p => `
      <div class="prediction-card ${p.class}">
        <div class="pc-source">${p.source}</div>
        <div class="pc-top">
          <span class="pc-name">${p.name}</span>
          <span class="pc-percent">${p.weight}%</span>
        </div>
        <div class="pc-bar-bg">
          <div class="pc-bar-fill" style="width: ${p.weight}%"></div>
        </div>
      </div>
    `).join('');

    // Logic: If any prediction is > 75%, or if multiple conditions found
    const urgent = preds.some(p => p.weight > 75) || preds.length > 2;
    if (doctorRec) doctorRec.style.display = urgent ? 'block' : 'none';
  }

  return { init, update };
})();
