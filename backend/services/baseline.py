# ============================================================
# DIPDoc Backend — 14-Day Personal Baseline Service
# Rolling baseline calculator with Z-score deviation detection
# ============================================================

import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict


class BaselineService:
    """
    Maintains a 14-day rolling personal baseline for each user.
    Compares current vitals against individual history using Z-scores.
    """

    def __init__(self, window_days=14):
        self.window_days = window_days
        # In-memory store: user_id -> list of records
        self._store = defaultdict(list)

    def add_record(self, user_id, record):
        """
        Add a health record to the baseline store.
        
        Args:
            user_id: Patient/device identifier
            record: Dict with sensor readings and timestamp
        """
        record['_stored_at'] = datetime.utcnow().isoformat()
        self._store[user_id].append(record)

        # Prune old records
        cutoff = datetime.utcnow() - timedelta(days=self.window_days)
        self._store[user_id] = [
            r for r in self._store[user_id]
            if datetime.fromisoformat(r.get('_stored_at', datetime.utcnow().isoformat())) > cutoff
        ]

    def get_baseline(self, user_id):
        """
        Calculate baseline statistics for a user.
        
        Returns:
            dict: Per-metric mean and stddev
        """
        records = self._store.get(user_id, [])

        metrics = ['breath_quality', 'voice_stress', 'hydration',
                    'gas_raw', 'mic_rms', 'impedance']

        baseline = {}

        for metric in metrics:
            values = []
            for r in records:
                sensors = r.get('sensors', {})
                if isinstance(sensors, dict) and metric in sensors:
                    values.append(float(sensors[metric]))

            if len(values) >= 3:
                arr = np.array(values)
                baseline[metric] = {
                    'mean': float(np.mean(arr)),
                    'std': float(np.std(arr)),
                    'min': float(np.min(arr)),
                    'max': float(np.max(arr)),
                    'samples': len(values)
                }
            else:
                # Default baseline when insufficient data
                baseline[metric] = self._default_baseline(metric)

        return baseline

    def analyze_deviation(self, user_id, current_sensors):
        """
        Compare current readings against personal baseline.
        
        Args:
            user_id: Patient ID
            current_sensors: Dict of current sensor readings
            
        Returns:
            dict: Deviation analysis with Z-scores and overall score
        """
        baseline = self.get_baseline(user_id)
        deviations = {}
        z_scores = []

        weights = {
            'breath_quality': 0.25,
            'voice_stress': 0.20,
            'hydration': 0.25,
            'gas_raw': 0.10,
            'mic_rms': 0.10,
            'impedance': 0.10
        }

        for metric, weight in weights.items():
            current_val = float(current_sensors.get(metric, 0))
            bl = baseline.get(metric, {})
            mean = bl.get('mean', current_val)
            std = bl.get('std', 1.0)

            # Avoid division by zero
            if std < 0.01:
                std = 1.0

            z = abs(current_val - mean) / std
            z_scores.append(z * weight)

            # Direction matters for some metrics
            if metric in ('voice_stress', 'gas_raw', 'mic_rms', 'impedance'):
                # Higher is worse
                direction = 'elevated' if current_val > mean else 'reduced'
            else:
                # Higher is better (breath_quality, hydration)
                direction = 'reduced' if current_val < mean else 'elevated'

            deviations[metric] = {
                'current': current_val,
                'baseline_mean': round(mean, 2),
                'baseline_std': round(std, 2),
                'z_score': round(z, 2),
                'direction': direction,
                'significant': z > 2.0
            }

        # Weighted overall deviation score
        overall_z = sum(z_scores)
        deviation_score = min(100, overall_z * 15)  # Scale to 0-100

        # Status classification
        if deviation_score >= 70:
            status = 'Critical'
        elif deviation_score >= 40:
            status = 'Warning'
        else:
            status = 'Normal'

        return {
            'status': status,
            'deviation_score': round(deviation_score, 1),
            'deviations': deviations,
            'baseline': baseline,
            'record_count': len(self._store.get(user_id, []))
        }

    def _default_baseline(self, metric):
        """Default baseline values when no history exists."""
        defaults = {
            'breath_quality': {'mean': 92.0, 'std': 5.0, 'min': 80.0, 'max': 100.0, 'samples': 0},
            'voice_stress':   {'mean': 18.0, 'std': 8.0, 'min': 5.0,  'max': 40.0,  'samples': 0},
            'hydration':      {'mean': 63.0, 'std': 4.0, 'min': 55.0, 'max': 72.0,  'samples': 0},
            'gas_raw':        {'mean': 220.0,'std': 30.0,'min': 150.0,'max': 350.0,  'samples': 0},
            'mic_rms':        {'mean': 0.12, 'std': 0.04,'min': 0.05, 'max': 0.25,   'samples': 0},
            'impedance':      {'mean': 510.0,'std': 20.0,'min': 460.0,'max': 560.0,  'samples': 0}
        }
        return defaults.get(metric, {'mean': 0, 'std': 1, 'min': 0, 'max': 100, 'samples': 0})

    def get_record_count(self, user_id):
        """Get number of stored records for user."""
        return len(self._store.get(user_id, []))

    def clear(self, user_id=None):
        """Clear stored records."""
        if user_id:
            self._store.pop(user_id, None)
        else:
            self._store.clear()
