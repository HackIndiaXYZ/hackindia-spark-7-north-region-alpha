/**
 * DIPDoc Cloud Sync — Supabase Integration Layer
 * Handles real-time sync, critical flag push, and caregiver notifications.
 * Works in simulated mode when no Supabase credentials are provided.
 */
const CloudSync = (() => {
  let isConnected = false;
  let isSimulated = true;
  let supabaseClient = null;
  let syncTextEl, syncStatusEl, syncBar;
  let syncCount = 0;
  let lastSyncTime = null;
  let onCriticalCallbacks = [];

  // ── Supabase Config (replace with real credentials) ────
  const SUPABASE_URL = '';
  const SUPABASE_ANON_KEY = '';

  function init() {
    syncTextEl = document.getElementById('cloud-sync-text');
    syncStatusEl = document.getElementById('cloud-sync-status');
    syncBar = document.getElementById('cloud-sync-bar');

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      initSupabase();
    } else {
      initSimulated();
    }
  }

  // ── Simulated Cloud ────────────────────────────────────
  function initSimulated() {
    isSimulated = true;
    isConnected = true;
    updateUI('Supabase: Simulated', '● Sim', 'var(--amber)');
    console.log('[CloudSync] Running in simulated mode');
  }

  // ── Real Supabase ──────────────────────────────────────
  async function initSupabase() {
    try {
      // Dynamic import of Supabase
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      isSimulated = false;
      isConnected = true;
      updateUI('Supabase: Connected', '● Live', 'var(--emerald)');

      // Subscribe to real-time changes
      supabaseClient
        .channel('health-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'health_data' }, (payload) => {
          console.log('[CloudSync] Real-time update:', payload);
          if (payload.new && payload.new.status === 'Critical') {
            onCriticalCallbacks.forEach(fn => fn(payload.new));
          }
        })
        .subscribe();

      console.log('[CloudSync] Supabase connected');
    } catch (err) {
      console.warn('[CloudSync] Supabase init failed:', err);
      initSimulated();
    }
  }

  // ── Sync Data to Cloud ─────────────────────────────────
  async function syncData(data) {
    if (!data) return;

    syncCount++;
    lastSyncTime = new Date();

    if (isSimulated) {
      // Simulate cloud push
      updateUI(`Cloud: Synced (${syncCount})`, '↑ Synced', 'var(--emerald)');

      // If critical, trigger caregiver notification
      if (data.localStatus === 'Critical') {
        triggerCriticalPush(data);
      }
      return;
    }

    // Real Supabase push
    try {
      const { error } = await supabaseClient.from('health_data').insert({
        device_id: data.deviceId,
        status: data.localStatus,
        deviation_score: data.deviationScore,
        breath_quality: data.sensors.breathQuality,
        voice_stress: data.sensors.voiceStress,
        hydration: data.sensors.hydration,
        gas_raw: data.sensors.gasRaw,
        mic_rms: data.sensors.micRMS,
        impedance: data.sensors.impedance,
        cough_detected: data.events.coughDetected,
        timestamp: data.timestamp
      });

      if (error) throw error;

      updateUI(`Supabase: Synced (${syncCount})`, '● Live', 'var(--emerald)');

      if (data.localStatus === 'Critical') {
        triggerCriticalPush(data);
      }
    } catch (err) {
      console.warn('[CloudSync] Push failed:', err);
      updateUI('Cloud: Sync Failed', '● Error', 'var(--crimson)');
    }
  }

  // ── Critical Push to Caregiver ─────────────────────────
  function triggerCriticalPush(data) {
    console.log('[CloudSync] 🚨 CRITICAL FLAG — Pushing to caregiver');
    onCriticalCallbacks.forEach(fn => fn(data));

    if (!isSimulated && supabaseClient) {
      supabaseClient.from('caregiver_alerts').insert({
        patient_device: data.deviceId,
        alert_type: 'Critical',
        deviation_score: data.deviationScore,
        message: `Critical deviation detected: ${data.deviationScore}% — Immediate attention needed`,
        sensors: JSON.stringify(data.sensors),
        timestamp: data.timestamp
      }).then(({ error }) => {
        if (error) console.warn('[CloudSync] Caregiver alert push failed:', error);
      });
    }
  }

  // ── UI Update ──────────────────────────────────────────
  function updateUI(text, status, color) {
    if (syncTextEl) syncTextEl.textContent = text;
    if (syncStatusEl) {
      syncStatusEl.textContent = status;
      syncStatusEl.style.color = color;
    }
  }

  // ── Events ─────────────────────────────────────────────
  function onCritical(callback) {
    onCriticalCallbacks.push(callback);
  }

  function getStatus() {
    return { isConnected, isSimulated, syncCount, lastSyncTime };
  }

  return { init, syncData, onCritical, getStatus };
})();
