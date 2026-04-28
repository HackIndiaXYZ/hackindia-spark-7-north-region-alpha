# ============================================================
# DIPDoc Wearable Band — Haptic Feedback Controller
# Gentle Thrum (Warning) & Double Pulse (Critical)
# ============================================================

from machine import Pin, PWM
import time
from config import Pins, HapticConfig


class HapticController:
    """
    Vibration motor controller via PWM.
    Elder-friendly patterns designed to NOT startle the user.
    
    Patterns:
      - Gentle Thrum: Soft, slow pulse for warnings
      - Double Pulse: Two quick vibrations for critical alerts
    """

    def __init__(self):
        self.pin = Pin(Pins.VIBRATION, Pin.OUT)
        self.pwm = PWM(self.pin)
        self.pwm.freq(200)  # 200 Hz vibration frequency
        self.pwm.duty(0)     # Start off
        self._is_vibrating = False
        self._last_pattern_time = 0
        self._cooldown_ms = 5000  # Min gap between patterns

    def _set_intensity(self, intensity):
        """Set vibration intensity (0.0 - 1.0)."""
        duty = int(intensity * 1023)
        self.pwm.duty(duty)

    def _off(self):
        """Turn off vibration."""
        self.pwm.duty(0)

    def gentle_thrum(self):
        """
        Warning pattern: Soft, slow pulses.
        Feels like a gentle tap, not a jarring buzz.
        Non-blocking version available via update().
        """
        now = time.ticks_ms()
        if time.ticks_diff(now, self._last_pattern_time) < self._cooldown_ms:
            return

        self._last_pattern_time = now
        self._is_vibrating = True

        for _ in range(HapticConfig.THRUM_CYCLES):
            # Ramp up gently
            for i in range(0, 10):
                self._set_intensity(HapticConfig.THRUM_INTENSITY * i / 10)
                time.sleep_ms(HapticConfig.THRUM_ON_MS // 10)

            # Ramp down
            for i in range(10, 0, -1):
                self._set_intensity(HapticConfig.THRUM_INTENSITY * i / 10)
                time.sleep_ms(HapticConfig.THRUM_ON_MS // 10)

            self._off()
            time.sleep_ms(HapticConfig.THRUM_OFF_MS)

        self._is_vibrating = False

    def double_pulse(self):
        """
        Critical pattern: Two quick, distinct vibrations.
        Stronger than thrum but still controlled.
        """
        now = time.ticks_ms()
        if time.ticks_diff(now, self._last_pattern_time) < self._cooldown_ms:
            return

        self._last_pattern_time = now
        self._is_vibrating = True

        for _ in range(HapticConfig.PULSE_CYCLES):
            # Pulse 1
            self._set_intensity(HapticConfig.PULSE_INTENSITY)
            time.sleep_ms(HapticConfig.PULSE_ON_MS)
            self._off()
            time.sleep_ms(HapticConfig.PULSE_GAP_MS)

            # Pulse 2
            self._set_intensity(HapticConfig.PULSE_INTENSITY)
            time.sleep_ms(HapticConfig.PULSE_ON_MS)
            self._off()
            time.sleep_ms(HapticConfig.PULSE_PAUSE_MS)

        self._is_vibrating = False

    def vibrate_for_status(self, status):
        """
        Trigger appropriate haptic pattern based on status.
        
        Args:
            status: 'Normal', 'Warning', or 'Critical'
        """
        status = status.lower()
        if status == 'warning':
            self.gentle_thrum()
        elif status == 'critical':
            self.double_pulse()
        # Normal: no vibration

    def stop(self):
        """Stop all vibration."""
        self._off()
        self._is_vibrating = False

    def is_vibrating(self):
        """Check if currently vibrating."""
        return self._is_vibrating

    def deinit(self):
        """Clean up PWM."""
        self._off()
        self.pwm.deinit()
