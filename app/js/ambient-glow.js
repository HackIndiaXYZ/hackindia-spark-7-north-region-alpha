/**
 * DIPDoc Ambient Glow Engine
 * Controls the global background pulse based on device status.
 * Critical: 4-second Navy ↔ Crimson pulse
 */
const AmbientGlow = (() => {
  let glowLayer = null;
  let currentState = 'normal';

  function init() {
    glowLayer = document.getElementById('ambient-glow-layer');
    setState('normal');
  }

  function setState(state) {
    if (!glowLayer) return;
    currentState = state;

    // Remove all state classes
    glowLayer.classList.remove('active', 'critical', 'warning');

    switch (state) {
      case 'critical':
        glowLayer.classList.add('active', 'critical');
        break;
      case 'warning':
        glowLayer.classList.add('active', 'warning');
        break;
      case 'normal':
      default:
        // No glow in normal state
        break;
    }
  }

  function getState() {
    return currentState;
  }

  return { init, setState, getState };
})();
