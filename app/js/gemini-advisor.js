/**
 * DIPDoc Gemini Advisor v2
 * Hybrid: Mock advisor (offline) + Gemini 2.0 Flash (live toggle).
 */
const GeminiAdvisor = (() => {
  let isLive = false;
  let apiKey = '';
  let adviceTextEl, adviceSourceEl, adviceCard;
  let lastAdvice = '';

  const mockAdvice = {
    Normal: [
      'Your vitals look great today. Keep staying hydrated and maintain your routine.',
      'All readings are within normal range. You\'re doing wonderfully today!',
      'Everything looks stable. Remember to take a short walk if you feel up to it.',
      'Your breath quality is excellent. Keep up the good hydration habits!',
      'No concerns detected. Your body is functioning well today.'
    ],
    Warning: [
      'Your hydration is slightly low. Please drink a glass of water now.',
      'We noticed some vocal strain. Try to rest your voice for a while.',
      'Your breath readings show a minor change. Open a window for fresh air.',
      'Hydration has dipped below normal. A warm cup of herbal tea would help.',
      'Minor deviation detected. Nothing urgent, but stay rested and hydrated.'
    ],
    Critical: [
      'Your hydration is critically low. Please drink water immediately and sit down.',
      'A cough pattern was detected with low hydration. Please rest and drink fluids now.',
      'Multiple vitals show significant deviation. Please contact your caregiver or doctor.',
      'Critical alert: Voice stress and breath quality need attention. Rest and stay calm.',
      'Your body water percentage is very low. Drink water now and alert your caregiver.'
    ]
  };

  function getRandomAdvice(status) {
    const pool = mockAdvice[status] || mockAdvice.Normal;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  async function callGeminiAPI(data) {
    if (!apiKey) return '⚠️ No API key configured. Please add your Gemini API key to go live.';

    const prompt = `You are a caring health advisor for an elderly person. Based on the following sensor readings, give ONE simple sentence of advice. Be warm, calm, and specific.

Sensor Data:
- Heart Rate: ${data.sensors.heartRate} bpm (normal: 60-100)
- Blood Pressure: ${data.sensors.bpSystolic}/${data.sensors.bpDiastolic} mmHg
- SpO2: ${data.sensors.spo2}% (normal: 95-100%)
- Temperature: ${data.sensors.temperature}°C (normal: 36.1-37.2)
- Breath Quality: ${data.sensors.breathQuality}% (normal: 85-100%)
- Hydration: ${data.sensors.hydration}% (normal: 55-70%)
- Deviation Score: ${data.deviationScore}%
- Status: ${data.localStatus}

Respond with ONLY the advice sentence. Keep it under 30 words.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 100 }
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const result = await response.json();
      return result.candidates?.[0]?.content?.parts?.[0]?.text || getRandomAdvice(data.localStatus);
    } catch (err) {
      console.warn('[GeminiAdvisor] API call failed:', err.message);
      return getRandomAdvice(data.localStatus) + ' (Offline mode)';
    }
  }

  function init() {
    adviceTextEl = document.getElementById('advice-text');
    adviceSourceEl = document.getElementById('advice-source');
    adviceCard = document.getElementById('advice-card');

    const toggle = document.getElementById('gemini-live-toggle');
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        isLive = e.target.checked;
        updateSourceLabel();
        if (isLive && !apiKey) {
          apiKey = prompt('Enter your Gemini API Key:') || '';
          if (!apiKey) {
            e.target.checked = false;
            isLive = false;
          }
        }
      });
    }
  }

  function updateSourceLabel() {
    if (!adviceSourceEl) return;
    if (isLive) {
      adviceSourceEl.innerHTML = 'Mode: <span class="live">🟢 Gemini Live</span>';
    } else {
      adviceSourceEl.innerHTML = 'Mode: <span class="mock">⚡ Mock</span>';
    }
  }

  let updateThrottle = null;
  async function update(data) {
    if (!adviceTextEl || !data) return;
    if (updateThrottle) return;
    updateThrottle = setTimeout(() => { updateThrottle = null; }, 3000);

    // Update card border color
    if (adviceCard) {
      adviceCard.className = 'ai-insight-banner';
      if (data.localStatus === 'Warning') adviceCard.classList.add('warning');
      if (data.localStatus === 'Critical') adviceCard.classList.add('critical');
    }

    let advice;
    if (isLive) {
      adviceTextEl.textContent = 'Thinking...';
      advice = await callGeminiAPI(data);
    } else {
      advice = getRandomAdvice(data.localStatus);
    }

    if (advice !== lastAdvice) {
      lastAdvice = advice;
      adviceTextEl.style.opacity = '0';
      setTimeout(() => {
        adviceTextEl.textContent = advice;
        adviceTextEl.style.opacity = '1';
        adviceTextEl.style.transition = 'opacity 0.5s ease';
      }, 200);
    }
  }

  function setApiKey(key) { apiKey = key; }

  return { init, update, setApiKey };
})();
