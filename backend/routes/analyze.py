# ============================================================
# DIPDoc Backend — /analyze Route
# Compares vitals against 14-day Personal Baseline
# ============================================================

from flask import Blueprint, request, jsonify

analyze_bp = Blueprint('analyze', __name__)

baseline_service = None
gemini_service = None


def init_analyze(bl_service, gem_service):
    global baseline_service, gemini_service
    baseline_service = bl_service
    gemini_service = gem_service


@analyze_bp.route('/analyze', methods=['POST'])
def analyze_vitals():
    """
    POST /analyze
    
    Compares current vitals against 14-day Personal Baseline.
    Uses weighted Z-score algorithm.
    
    Body: {
        user_id: str,
        sensors: {breath_quality, voice_stress, hydration, ...},
        events: {cough_detected, voice_strain, low_hydration}
    }
    
    Returns: {
        status, deviation_score, deviations, baseline, message
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON payload'}), 400

        user_id = data.get('user_id', 'default')
        sensors = data.get('sensors', {})
        events = data.get('events', {})

        if not baseline_service:
            return jsonify({'error': 'Baseline service not initialized'}), 500

        # Run deviation analysis
        result = baseline_service.analyze_deviation(user_id, sensors)

        # Get AI advice
        advice = ''
        if gemini_service:
            advice_result = gemini_service.get_advice(
                sensors, events, result['status']
            )
            advice = advice_result['advice']

        return jsonify({
            'status': result['status'],
            'deviation_score': result['deviation_score'],
            'deviations': result['deviations'],
            'baseline': result['baseline'],
            'record_count': result['record_count'],
            'advice': advice,
            'message': f"Analysis complete — {result['status']} "
                       f"({result['deviation_score']}% deviation)"
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
