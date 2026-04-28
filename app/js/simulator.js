/**
 * DIPDoc Hardware Simulator v2
 * Generates realistic health data including extended sensors for
 * Predictive Forecasting, Digital Twin, and Emotion Detection.
 */
const DIPSimulator = (() => {
  let mode = 'normal';
  let isRunning = false;
  let intervalId = null;
  let listeners = [];
  let tickCount = 0;

  // Configuration for different data modes
  const levels = {
    normal: {
      hr: [65, 80], temp: [36.4, 36.8], spo2: [96, 99], hydration: [60, 70],
      bpSys: [115, 130], bpDia: [70, 82],
      glucose: [88, 105], steps: [3800, 5200], mood: [65, 85],
      cognitive: [75, 90], sleepHrs: [6.5, 8], activityScore: [50, 75],
      voiceSentiment: [60, 90], socialActivity: [55, 80],
      score: 12
    },
    warning: {
      hr: [85, 95], temp: [37.2, 37.8], spo2: [94, 96], hydration: [45, 55],
      bpSys: [135, 150], bpDia: [82, 95],
      glucose: [72, 88], steps: [1200, 2800], mood: [40, 60],
      cognitive: [55, 72], sleepHrs: [4.5, 6], activityScore: [25, 45],
      voiceSentiment: [35, 55], socialActivity: [25, 45],
      score: 48
    },
    critical: {
      hr: [105, 125], temp: [38.2, 39.5], spo2: [88, 92], hydration: [35, 45],
      bpSys: [150, 175], bpDia: [90, 105],
      glucose: [55, 72], steps: [300, 900], mood: [20, 40],
      cognitive: [35, 55], sleepHrs: [2.5, 4.5], activityScore: [10, 30],
      voiceSentiment: [15, 40], socialActivity: [10, 30],
      score: 82
    }
  };

  function getRandom(min, max) {
    return Math.random() * (max - min) + min;
  }

  function generatePacket() {
    tickCount++;
    const config = levels[mode];

    const heartRate = Math.round(getRandom(...config.hr));
    const temperature = parseFloat(getRandom(...config.temp).toFixed(1));
    const spo2 = Math.round(getRandom(...config.spo2));
    const hydration = Math.round(getRandom(...config.hydration));
    const deviationScore = config.score + Math.round(getRandom(-5, 5));

    let status = 'Stable';
    if (deviationScore > 75) status = 'Critical';
    else if (deviationScore > 40) status = 'Warning';

    return {
      timestamp: new Date().toISOString(),
      patientId: 'MR_SHARMA_2026',
      localStatus: status,
      deviationScore: Math.max(0, Math.min(100, deviationScore)),
      sensors: {
        heartRate,
        temperature,
        spo2,
        hydration,
        breathQuality: Math.round(getRandom(60, 95)),
        bpSystolic: Math.round(getRandom(...config.bpSys)),
        bpDiastolic: Math.round(getRandom(...config.bpDia)),
        // Extended sensors for novelty features
        bloodGlucose: Math.round(getRandom(...config.glucose)),
        steps: Math.round(getRandom(...config.steps)),
        mood: Math.round(getRandom(...config.mood)),
        cognitiveScore: Math.round(getRandom(...config.cognitive)),
        sleepHours: parseFloat(getRandom(...config.sleepHrs).toFixed(1)),
        sleepMins: Math.round(getRandom(0, 55)),
        activityScore: Math.round(getRandom(...config.activityScore)),
        voiceSentiment: Math.round(getRandom(...config.voiceSentiment)),
        socialActivity: Math.round(getRandom(...config.socialActivity))
      },
      battery: Math.max(5, 100 - Math.floor(tickCount / 10))
    };
  }

  function start(speedMs = 1000) {
    if (isRunning) return;
    isRunning = true;
    intervalId = setInterval(() => {
      const data = generatePacket();
      listeners.forEach(callback => callback(data));
    }, speedMs);
  }

  function stop() {
    clearInterval(intervalId);
    isRunning = false;
  }

  function onData(callback) {
    listeners.push(callback);
  }

  function setMode(newMode) {
    if (levels[newMode]) mode = newMode;
  }

  return { start, stop, onData, setMode, getMode: () => mode };
})();
