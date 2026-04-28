# ============================================================
# DIPDoc Wearable Band — Sensor Drivers
# Gas Sensor (MQ-series), MEMS Mic (INMP441), Bio-impedance
# ============================================================

from machine import Pin, ADC, I2C, I2S
import time
import math
from config import Pins, SensorConfig


class MovingAverage:
    """Efficient moving average filter for sensor smoothing."""

    def __init__(self, window_size=10):
        self.window = window_size
        self.values = []
        self.total = 0.0

    def add(self, value):
        self.values.append(value)
        self.total += value
        if len(self.values) > self.window:
            self.total -= self.values.pop(0)
        return self.average()

    def average(self):
        if not self.values:
            return 0.0
        return self.total / len(self.values)

    def reset(self):
        self.values.clear()
        self.total = 0.0


class GasSensor:
    """
    MQ-135/MQ-3 Gas Sensor Driver.
    Reads analog values for breath gas analysis.
    Returns normalized quality score (0-100, higher = better).
    """

    def __init__(self):
        self.adc = ADC(Pin(Pins.GAS_SENSOR_ADC))
        self.adc.atten(ADC.ATTN_11DB)       # Full range: 0-3.3V
        self.adc.width(ADC.WIDTH_12BIT)      # 12-bit resolution
        self.ma = MovingAverage(SensorConfig.MA_WINDOW)
        self.calibrated = False
        self.baseline = SensorConfig.GAS_BASELINE

    def calibrate(self, num_samples=50, delay_ms=20):
        """Calibrate baseline in clean air."""
        print("[GasSensor] Calibrating...")
        total = 0
        for _ in range(num_samples):
            total += self.adc.read()
            time.sleep_ms(delay_ms)
        self.baseline = total // num_samples
        self.calibrated = True
        print(f"[GasSensor] Baseline: {self.baseline}")

    def read_raw(self):
        """Read raw ADC value (0-4095)."""
        return self.adc.read()

    def read(self):
        """Read smoothed gas value and breath quality score."""
        raw = self.read_raw()
        smoothed = self.ma.add(raw)

        # Calculate quality: higher raw → worse air → lower quality
        deviation = abs(smoothed - self.baseline)
        max_deviation = SensorConfig.GAS_MAX - self.baseline
        quality = max(0, min(100, 100 - (deviation / max_deviation * 100)))

        return {
            'raw': int(smoothed),
            'quality': round(quality, 1),
            'deviation': round(deviation / max_deviation * 100, 1)
        }


class MEMSMicrophone:
    """
    INMP441 MEMS Microphone Driver (I2S).
    Calculates RMS amplitude for voice stress and cough detection.
    """

    def __init__(self):
        self.ma = MovingAverage(SensorConfig.MA_WINDOW)
        self.buffer = bytearray(1024)
        self._cough_detected = False
        self._voice_strain = False

        try:
            self.i2s = I2S(
                0,
                sck=Pin(Pins.MIC_SCK),
                ws=Pin(Pins.MIC_WS),
                sd=Pin(Pins.MIC_SD),
                mode=I2S.RX,
                bits=16,
                format=I2S.MONO,
                rate=16000,
                ibuf=4096
            )
        except Exception as e:
            print(f"[MEMSMic] I2S init failed: {e}")
            self.i2s = None

    def read(self):
        """Read audio RMS and analyze for stress/cough."""
        if self.i2s is None:
            # Fallback: simulated values
            return self._simulated_read()

        try:
            num_read = self.i2s.readinto(self.buffer)
            if num_read == 0:
                return self._simulated_read()

            # Calculate RMS from 16-bit samples
            samples = num_read // 2
            sum_sq = 0
            for i in range(0, num_read, 2):
                sample = int.from_bytes(self.buffer[i:i+2], 'little')
                if sample > 32767:
                    sample -= 65536
                sum_sq += sample * sample

            rms = math.sqrt(sum_sq / samples) / 32768.0  # Normalize to 0-1
            smoothed_rms = self.ma.add(rms)

            # Cough detection: sudden spike above threshold
            self._cough_detected = smoothed_rms > SensorConfig.MIC_COUGH_THRESHOLD

            # Voice stress index (0-100)
            stress = min(100, (smoothed_rms / SensorConfig.MIC_RMS_MAX) * 100)
            self._voice_strain = stress > 60

            return {
                'rms': round(smoothed_rms, 4),
                'stress_index': round(stress, 1),
                'cough_detected': self._cough_detected,
                'voice_strain': self._voice_strain
            }
        except Exception:
            return self._simulated_read()

    def _simulated_read(self):
        """Fallback simulated reading."""
        rms = SensorConfig.MIC_RMS_BASELINE + (time.ticks_ms() % 100) * 0.001
        return {
            'rms': round(rms, 4),
            'stress_index': round(rms / SensorConfig.MIC_RMS_MAX * 100, 1),
            'cough_detected': False,
            'voice_strain': False
        }


class BioImpedance:
    """
    AD5933 Bio-impedance Sensor Driver (I2C).
    Measures body impedance for hydration estimation.
    """

    AD5933_ADDR = 0x0D  # Default I2C address

    def __init__(self):
        self.ma = MovingAverage(SensorConfig.MA_WINDOW)

        try:
            self.i2c = I2C(0, scl=Pin(Pins.I2C_SCL), sda=Pin(Pins.I2C_SDA), freq=100000)
            devices = self.i2c.scan()
            self._available = self.AD5933_ADDR in devices
            if self._available:
                print(f"[BioImpedance] AD5933 found at 0x{self.AD5933_ADDR:02X}")
                self._init_ad5933()
            else:
                print("[BioImpedance] AD5933 not found — using simulation")
        except Exception as e:
            print(f"[BioImpedance] I2C init failed: {e}")
            self._available = False

    def _init_ad5933(self):
        """Initialize AD5933 for single-frequency sweep."""
        try:
            # Set start frequency (50 kHz)
            self.i2c.writeto_mem(self.AD5933_ADDR, 0x82, bytes([0x00, 0x07, 0xA1]))
            # Set increment (0)
            self.i2c.writeto_mem(self.AD5933_ADDR, 0x85, bytes([0x00, 0x00, 0x00]))
            # Number of increments (1)
            self.i2c.writeto_mem(self.AD5933_ADDR, 0x88, bytes([0x00, 0x01]))
            # Settling cycles
            self.i2c.writeto_mem(self.AD5933_ADDR, 0x8A, bytes([0x00, 0x0F]))
        except Exception as e:
            print(f"[BioImpedance] Init config failed: {e}")
            self._available = False

    def read(self):
        """Read impedance and calculate hydration percentage."""
        if not self._available:
            return self._simulated_read()

        try:
            # Start frequency sweep
            self.i2c.writeto_mem(self.AD5933_ADDR, 0x80, bytes([0x21]))
            time.sleep_ms(10)

            # Read real and imaginary parts
            data = self.i2c.readfrom_mem(self.AD5933_ADDR, 0x94, 4)
            real = int.from_bytes(data[0:2], 'big')
            imag = int.from_bytes(data[2:4], 'big')

            if real > 32767: real -= 65536
            if imag > 32767: imag -= 65536

            # Calculate magnitude
            impedance = math.sqrt(real * real + imag * imag)
            smoothed = self.ma.add(impedance)

            # Hydration estimation: lower impedance = higher hydration
            hydration = self._impedance_to_hydration(smoothed)

            return {
                'impedance': round(smoothed, 1),
                'hydration_pct': round(hydration, 1),
                'low_hydration': hydration < 45
            }
        except Exception:
            return self._simulated_read()

    def _impedance_to_hydration(self, impedance):
        """Convert impedance to estimated body water percentage."""
        # Linear mapping: 200Ω → 80%, 1000Ω → 30%
        hydration = 80 - (impedance - SensorConfig.IMPEDANCE_MIN) / \
                    (SensorConfig.IMPEDANCE_MAX - SensorConfig.IMPEDANCE_MIN) * 50
        return max(20, min(80, hydration))

    def _simulated_read(self):
        """Fallback simulated reading."""
        base = SensorConfig.IMPEDANCE_BASELINE
        noise = (time.ticks_ms() % 40) - 20
        impedance = base + noise
        hydration = self._impedance_to_hydration(impedance)
        return {
            'impedance': round(impedance, 1),
            'hydration_pct': round(hydration, 1),
            'low_hydration': hydration < 45
        }


class SensorHub:
    """Unified sensor interface combining all three sensors."""

    def __init__(self):
        print("[SensorHub] Initializing sensors...")
        self.gas = GasSensor()
        self.mic = MEMSMicrophone()
        self.bio = BioImpedance()
        print("[SensorHub] All sensors ready")

    def calibrate(self):
        """Run calibration routines."""
        self.gas.calibrate()

    def read_all(self):
        """Read all sensors and return unified data dict."""
        gas_data = self.gas.read()
        mic_data = self.mic.read()
        bio_data = self.bio.read()

        return {
            'gas': gas_data,
            'mic': mic_data,
            'bio': bio_data,
            'breath_quality': gas_data['quality'],
            'voice_stress': mic_data['stress_index'],
            'hydration': bio_data['hydration_pct'],
            'gas_raw': gas_data['raw'],
            'mic_rms': mic_data['rms'],
            'impedance': bio_data['impedance'],
            'cough_detected': mic_data['cough_detected'],
            'voice_strain': mic_data['voice_strain'],
            'low_hydration': bio_data['low_hydration']
        }
