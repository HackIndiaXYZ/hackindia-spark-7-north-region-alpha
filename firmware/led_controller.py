# ============================================================
# DIPDoc Wearable Band — WS2812B LED Controller
# Breathing light effect with Muted Jewel Tone palette
# ============================================================

from machine import Pin
import neopixel
import time
import math
from config import Pins, LEDConfig


class LEDController:
    """
    WS2812B NeoPixel LED Controller.
    Implements a 'breathing' light effect using sine wave PWM.
    
    Colors:
      - Emerald Pulse: Normal operations
      - Solid Amber: Minor deviation
      - Crimson Pulse + Vibration: Critical alert
    """

    def __init__(self):
        self.np = neopixel.NeoPixel(
            Pin(Pins.NEOPIXEL),
            LEDConfig.NUM_PIXELS
        )
        self.current_color = LEDConfig.COLOR_EMERALD
        self.target_color = LEDConfig.COLOR_EMERALD
        self.current_mode = 'normal'
        self.brightness = LEDConfig.BRIGHTNESS
        self._transition_progress = 1.0
        self._transition_speed = 0.05

        # Turn off all LEDs initially
        self.clear()

    def set_status(self, status):
        """
        Set LED mode based on health status.
        
        Args:
            status: 'Normal', 'Warning', or 'Critical'
        """
        status = status.lower()
        if status == self.current_mode:
            return

        self.current_mode = status

        if status == 'normal':
            self.target_color = LEDConfig.COLOR_EMERALD
        elif status == 'warning':
            self.target_color = LEDConfig.COLOR_AMBER
        elif status == 'critical':
            self.target_color = LEDConfig.COLOR_CRIMSON

        # Start color transition
        self._transition_progress = 0.0

    def update(self):
        """
        Call this every tick to update the LED effect.
        Handles breathing animation and color transitions.
        """
        # Color transition
        if self._transition_progress < 1.0:
            self._transition_progress = min(1.0,
                self._transition_progress + self._transition_speed)
            self.current_color = self._lerp_color(
                self.current_color, self.target_color,
                self._transition_progress
            )

        # Breathing effect (sine wave brightness modulation)
        t = time.ticks_ms()
        phase = (t % LEDConfig.BREATH_PERIOD_MS) / LEDConfig.BREATH_PERIOD_MS
        breath = math.sin(phase * math.pi * 2)

        # Map sine to brightness range
        min_b = LEDConfig.BREATH_MIN_BRIGHTNESS
        max_b = self.brightness
        breath_brightness = min_b + (max_b - min_b) * (0.5 + 0.5 * breath)

        # Apply to all pixels
        r = int(self.current_color[0] * breath_brightness)
        g = int(self.current_color[1] * breath_brightness)
        b = int(self.current_color[2] * breath_brightness)

        # Amber mode: solid (no breathing)
        if self.current_mode == 'warning':
            r = int(self.current_color[0] * self.brightness)
            g = int(self.current_color[1] * self.brightness)
            b = int(self.current_color[2] * self.brightness)

        for i in range(LEDConfig.NUM_PIXELS):
            self.np[i] = (r, g, b)

        self.np.write()

    def _lerp_color(self, c1, c2, t):
        """Linear interpolation between two RGB tuples."""
        return (
            int(c1[0] + (c2[0] - c1[0]) * t),
            int(c1[1] + (c2[1] - c1[1]) * t),
            int(c1[2] + (c2[2] - c1[2]) * t)
        )

    def clear(self):
        """Turn off all LEDs."""
        for i in range(LEDConfig.NUM_PIXELS):
            self.np[i] = LEDConfig.COLOR_OFF
        self.np.write()

    def flash(self, color, times=3, on_ms=100, off_ms=100):
        """Flash a color a number of times (blocking)."""
        r = int(color[0] * self.brightness)
        g = int(color[1] * self.brightness)
        b = int(color[2] * self.brightness)

        for _ in range(times):
            for i in range(LEDConfig.NUM_PIXELS):
                self.np[i] = (r, g, b)
            self.np.write()
            time.sleep_ms(on_ms)

            self.clear()
            time.sleep_ms(off_ms)

    def startup_sequence(self):
        """Play a startup animation."""
        colors = [
            LEDConfig.COLOR_EMERALD,
            LEDConfig.COLOR_AMBER,
            LEDConfig.COLOR_CRIMSON
        ]
        for color in colors:
            for i in range(LEDConfig.NUM_PIXELS):
                r = int(color[0] * self.brightness)
                g = int(color[1] * self.brightness)
                b = int(color[2] * self.brightness)
                self.np[i] = (r, g, b)
                self.np.write()
                time.sleep_ms(50)
            time.sleep_ms(200)
        self.clear()
        time.sleep_ms(300)
