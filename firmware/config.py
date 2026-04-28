# ============================================================
# DIPDoc Wearable Band — Configuration
# ESP32 MicroPython | Pin Assignments & Thresholds
# ============================================================

# ── GPIO Pin Assignments ──────────────────────────────────
class Pins:
    # Gas Sensor (MQ-135 / MQ-3) — Breath analysis
    GAS_SENSOR_ADC = 34          # ADC1_CH6

    # MEMS Microphone (INMP441) — I2S interface
    MIC_SCK  = 26                # I2S clock
    MIC_WS   = 25                # I2S word select
    MIC_SD   = 33                # I2S data

    # Bio-impedance (AD5933 via I2C)
    I2C_SDA  = 21                # I2C data
    I2C_SCL  = 22                # I2C clock

    # WS2812B RGB LED
    NEOPIXEL = 5                 # Data pin

    # Vibration Motor (PWM)
    VIBRATION = 18               # PWM-capable GPIO

    # Battery ADC
    BATTERY_ADC = 35             # ADC1_CH7


# ── Sensor Calibration ────────────────────────────────────
class SensorConfig:
    # Gas sensor
    GAS_BASELINE = 220           # Clean air ADC reading
    GAS_MAX      = 900           # Maximum expected reading
    GAS_WEIGHT   = 0.35          # Weight in deviation calc

    # Microphone
    MIC_RMS_BASELINE = 0.12      # Quiet ambient RMS
    MIC_RMS_MAX      = 1.5       # Max expected RMS
    MIC_COUGH_THRESHOLD = 0.6    # RMS threshold for cough
    MIC_WEIGHT = 0.30            # Weight in deviation calc

    # Bio-impedance
    IMPEDANCE_BASELINE = 510     # Normal body water impedance (Ω)
    IMPEDANCE_MIN = 200          # Minimum expected
    IMPEDANCE_MAX = 1000         # Maximum expected
    IMPEDANCE_WEIGHT = 0.35      # Weight in deviation calc

    # Moving average window
    MA_WINDOW = 10               # Samples for smoothing


# ── Deviation Thresholds ──────────────────────────────────
class Thresholds:
    WARNING_SCORE  = 40          # Deviation % to trigger warning
    CRITICAL_SCORE = 70          # Deviation % to trigger critical
    SCORE_MIN = 0
    SCORE_MAX = 100


# ── LED Configuration ────────────────────────────────────
class LEDConfig:
    NUM_PIXELS = 8               # Number of WS2812B LEDs
    BRIGHTNESS = 0.4             # Max brightness (0.0 - 1.0)

    # Muted Jewel Tone Colors (R, G, B)
    COLOR_EMERALD = (46, 204, 113)
    COLOR_AMBER   = (243, 156, 18)
    COLOR_CRIMSON  = (231, 76, 60)
    COLOR_OFF      = (0, 0, 0)

    # Breathing effect
    BREATH_PERIOD_MS = 2000      # Full breath cycle (ms)
    BREATH_MIN_BRIGHTNESS = 0.1  # Min brightness in cycle


# ── Haptic Configuration ──────────────────────────────────
class HapticConfig:
    # Gentle Thrum (Warning)
    THRUM_ON_MS   = 150
    THRUM_OFF_MS  = 300
    THRUM_CYCLES  = 2
    THRUM_INTENSITY = 0.5        # PWM duty (0.0 - 1.0)

    # Double Pulse (Critical)
    PULSE_ON_MS    = 100
    PULSE_GAP_MS   = 120
    PULSE_PAUSE_MS = 500
    PULSE_CYCLES   = 2
    PULSE_INTENSITY = 0.7


# ── BLE Configuration ────────────────────────────────────
class BLEConfig:
    DEVICE_NAME = "DIPDoc-Band"
    SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
    CHAR_STATUS_UUID = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
    CHAR_DATA_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

    BROADCAST_INTERVAL_MS = 500  # Data broadcast every 500ms
    ADV_INTERVAL_US = 250000     # BLE advertising interval


# ── System Configuration ──────────────────────────────────
class SystemConfig:
    MAIN_LOOP_MS = 100           # Main loop tick (ms)
    WATCHDOG_TIMEOUT_S = 30      # Watchdog timer (seconds)
    BATTERY_LOW_THRESHOLD = 15   # Battery % to enter low-power
    FIRMWARE_VERSION = "1.2.3"
    DEVICE_ID = "DIPDOC-BAND-001"
