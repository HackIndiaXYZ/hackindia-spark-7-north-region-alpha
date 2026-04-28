# ============================================================
# DIPDoc Backend — SHAP Value Calculator
# Feature importance / contribution analysis
# ============================================================

import numpy as np


class SHAPEngine:
    """
    Calculates SHAP-like feature importance values for health deviations.
    
    For a hackathon context, this uses a deterministic weighted algorithm
    rather than a full tree-based SHAP computation. The output format
    matches what the frontend Chart.js expects.
    """

    # Feature definitions with baseline weights
    FEATURES = {
        'cough_detected': {
            'label': 'Cough detected',
            'base_weight': 0.25,
            'sensor_key': None,  # Boolean event
            'event_key': 'cough_detected'
        },
        'breath_quality': {
            'label': 'Breath gas level',
            'base_weight': 0.20,
            'sensor_key': 'breath_quality',
            'baseline_val': 92.0,
            'inverse': True  # Lower value = worse
        },
        'voice_stress': {
            'label': 'Voice strain',
            'base_weight': 0.15,
            'sensor_key': 'voice_stress',
            'baseline_val': 18.0,
            'inverse': False  # Higher value = worse
        },
        'hydration': {
            'label': 'Hydration drop',
            'base_weight': 0.20,
            'sensor_key': 'hydration',
            'baseline_val': 63.0,
            'inverse': True
        },
        'impedance': {
            'label': 'Impedance shift',
            'base_weight': 0.10,
            'sensor_key': 'impedance',
            'baseline_val': 510.0,
            'inverse': False
        },
        'mic_rms': {
            'label': 'Mic amplitude',
            'base_weight': 0.10,
            'sensor_key': 'mic_rms',
            'baseline_val': 0.12,
            'inverse': False
        }
    }

    def __init__(self):
        pass

    def compute(self, sensors, events, deviation_score=None):
        """
        Compute feature contributions (SHAP values) for a prediction.
        
        Args:
            sensors: Dict of current sensor readings
            events: Dict of detected events
            deviation_score: Overall deviation (optional, for scaling)
            
        Returns:
            list: Sorted list of feature contributions
        """
        contributions = []

        for feat_id, feat_info in self.FEATURES.items():
            contribution = 0.0

            if feat_info.get('event_key'):
                # Boolean event feature
                if events.get(feat_info['event_key'], False):
                    contribution = feat_info['base_weight'] * 100
                else:
                    contribution = feat_info['base_weight'] * 5  # Small residual
            else:
                # Continuous sensor feature
                sensor_key = feat_info['sensor_key']
                current_val = float(sensors.get(sensor_key, feat_info['baseline_val']))
                baseline_val = feat_info['baseline_val']

                # Calculate deviation percentage
                if feat_info.get('inverse'):
                    # Lower is worse (breath quality, hydration)
                    deviation = max(0, baseline_val - current_val) / baseline_val * 100
                else:
                    # Higher is worse (voice stress, impedance, mic)
                    deviation = max(0, current_val - baseline_val) / max(baseline_val, 1) * 100

                contribution = deviation * feat_info['base_weight']

            # Scale by overall deviation if provided
            if deviation_score and deviation_score > 0:
                scale = min(2.0, deviation_score / 50.0)
                contribution *= scale

            contributions.append({
                'feature': feat_info['label'],
                'feature_id': feat_id,
                'contribution': round(max(0, min(50, contribution)), 1),
                'direction': 'positive'  # Positive = pushes toward alert
            })

        # Sort by contribution (highest first)
        contributions.sort(key=lambda x: x['contribution'], reverse=True)

        # Calculate summary
        top_factor = contributions[0]['feature'] if contributions else 'Unknown'
        total = sum(c['contribution'] for c in contributions)

        return {
            'features': contributions,
            'top_factor': top_factor,
            'total_contribution': round(total, 1),
            'summary': f"Primary factor: {top_factor} "
                       f"({contributions[0]['contribution']}% contribution)"
                       if contributions else "No significant factors"
        }

    def compute_local(self, sensors, events, baseline_data=None):
        """
        Compute local SHAP values using actual baseline data.
        More accurate when personal baseline is available.
        
        Args:
            sensors: Current sensor readings
            events: Detected events
            baseline_data: Personal baseline from BaselineService
        """
        if not baseline_data:
            return self.compute(sensors, events)

        contributions = []

        for feat_id, feat_info in self.FEATURES.items():
            if feat_info.get('event_key'):
                if events.get(feat_info['event_key'], False):
                    contributions.append({
                        'feature': feat_info['label'],
                        'feature_id': feat_id,
                        'contribution': round(feat_info['base_weight'] * 80, 1),
                        'direction': 'positive'
                    })
                continue

            sensor_key = feat_info['sensor_key']
            bl = baseline_data.get(sensor_key, {})
            mean = bl.get('mean', feat_info['baseline_val'])
            std = bl.get('std', 10.0)
            current = float(sensors.get(sensor_key, mean))

            if std < 0.01:
                std = 1.0

            z_score = abs(current - mean) / std
            contribution = z_score * feat_info['base_weight'] * 20

            contributions.append({
                'feature': feat_info['label'],
                'feature_id': feat_id,
                'contribution': round(max(0, min(50, contribution)), 1),
                'direction': 'positive' if (
                    (feat_info.get('inverse') and current < mean) or
                    (not feat_info.get('inverse') and current > mean)
                ) else 'negative'
            })

        contributions.sort(key=lambda x: x['contribution'], reverse=True)

        top_factor = contributions[0]['feature'] if contributions else 'Unknown'

        return {
            'features': contributions,
            'top_factor': top_factor,
            'total_contribution': round(sum(c['contribution'] for c in contributions), 1),
            'summary': f"Based on personal baseline: {top_factor} is the primary factor"
        }
