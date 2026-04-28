# ============================================================
# DIPDoc Wearable Band — Physiological Deviation Score
# Weighted algorithm combining Gas + Audio + Impedance
# ============================================================

from config import SensorConfig, Thresholds


class DeviationEngine:
    """
    Calculates a Physiological Deviation Score (0-100%).
    Instead of raw values, this measures HOW FAR the patient
    has deviated from their personal baseline.
    
    Score > 70% → Critical
    Score > 40% → Warning
    Score ≤ 40% → Normal
    """

    def __init__(self):
        # Personal baseline (updated over time)
        self.baseline = {
            'gas_raw': SensorConfig.GAS_BASELINE,
            'mic_rms': SensorConfig.MIC_RMS_BASELINE,
            'impedance': SensorConfig.IMPEDANCE_BASELINE
        }

        # Weights must sum to 1.0
        self.weights = {
            'gas': SensorConfig.GAS_WEIGHT,       # 0.35
            'mic': SensorConfig.MIC_WEIGHT,        # 0.30
            'impedance': SensorConfig.IMPEDANCE_WEIGHT  # 0.35
        }

        # History for baseline adaptation
        self.history = {
            'gas_raw': [],
            'mic_rms': [],
            'impedance': []
        }
        self.history_max = 1000  # ~8 minutes at 500ms intervals
        self.last_status = 'Normal'

    def calculate(self, sensor_data):
        """
        Calculate the Physiological Deviation Score.
        
        Args:
            sensor_data: Dict from SensorHub.read_all()
            
        Returns:
            dict: {
                'score': int (0-100),
                'status': str ('Normal'|'Warning'|'Critical'),
                'components': dict of individual deviations
            }
        """
        # Extract raw values
        gas_raw = sensor_data.get('gas_raw', self.baseline['gas_raw'])
        mic_rms = sensor_data.get('mic_rms', self.baseline['mic_rms'])
        impedance = sensor_data.get('impedance', self.baseline['impedance'])

        # Calculate individual deviation percentages
        gas_dev = self._calc_deviation(
            gas_raw, self.baseline['gas_raw'],
            SensorConfig.GAS_MAX - SensorConfig.GAS_BASELINE
        )

        mic_dev = self._calc_deviation(
            mic_rms, self.baseline['mic_rms'],
            SensorConfig.MIC_RMS_MAX - SensorConfig.MIC_RMS_BASELINE
        )

        imp_dev = self._calc_deviation(
            impedance, self.baseline['impedance'],
            SensorConfig.IMPEDANCE_MAX - SensorConfig.IMPEDANCE_BASELINE
        )

        # Weighted combination
        score = (
            gas_dev * self.weights['gas'] +
            mic_dev * self.weights['mic'] +
            imp_dev * self.weights['impedance']
        )

        # Boost score if multiple sensors deviate AND events detected
        if sensor_data.get('cough_detected', False):
            score = min(100, score * 1.2)  # 20% boost for cough

        if sensor_data.get('low_hydration', False) and gas_dev > 30:
            score = min(100, score * 1.15)  # 15% boost for compound

        # Clamp
        score = max(Thresholds.SCORE_MIN, min(Thresholds.SCORE_MAX, int(score)))

        # Triage
        if score >= Thresholds.CRITICAL_SCORE:
            status = 'Critical'
        elif score >= Thresholds.WARNING_SCORE:
            status = 'Warning'
        else:
            status = 'Normal'

        self.last_status = status

        # Update history (for baseline adaptation in normal state)
        if status == 'Normal':
            self._update_history(gas_raw, mic_rms, impedance)

        return {
            'score': score,
            'status': status,
            'components': {
                'gas_deviation': round(gas_dev, 1),
                'mic_deviation': round(mic_dev, 1),
                'impedance_deviation': round(imp_dev, 1)
            }
        }

    def _calc_deviation(self, current, baseline, max_range):
        """Calculate percentage deviation from baseline."""
        if max_range == 0:
            return 0.0
        deviation = abs(current - baseline) / max_range * 100
        return min(100.0, deviation)

    def _update_history(self, gas, mic, impedance):
        """Update rolling history and adapt baseline."""
        for key, val in [('gas_raw', gas), ('mic_rms', mic), ('impedance', impedance)]:
            self.history[key].append(val)
            if len(self.history[key]) > self.history_max:
                self.history[key].pop(0)

            # Slowly adapt baseline (exponential moving average)
            if len(self.history[key]) > 50:
                alpha = 0.01  # Slow adaptation rate
                self.baseline[key] = (
                    self.baseline[key] * (1 - alpha) + val * alpha
                )

    def get_status(self):
        """Get current status string."""
        return self.last_status

    def get_baseline(self):
        """Get current personal baseline values."""
        return dict(self.baseline)
