# ============================================================
# DIPDoc Backend — /explain Route
# Generates SHAP values for detected deviations
# ============================================================

from flask import Blueprint, request, jsonify

explain_bp = Blueprint('explain', __name__)

shap_engine = None
baseline_service = None


def init_explain(shap_svc, bl_service):
    global shap_engine, baseline_service
    shap_engine = shap_svc
    baseline_service = bl_service


@explain_bp.route('/explain', methods=['POST'])
def explain_deviation():
    """
    POST /explain
    
    Generate SHAP values (feature importance) for the detected deviation.
    Returns sorted feature contributions for the app's charts.
    
    Body: {
        sensors: {breath_quality, voice_stress, hydration, ...},
        events: {cough_detected, voice_strain, low_hydration},
        deviation_score: float,
        user_id: str (optional, for personal baseline)
    }
    
    Returns: {
        features: [{feature, contribution, direction}, ...],
        top_factor: str,
        summary: str
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON payload'}), 400

        sensors = data.get('sensors', {})
        events = data.get('events', {})
        deviation_score = data.get('deviation_score', None)
        user_id = data.get('user_id', None)

        if not shap_engine:
            return jsonify({'error': 'SHAP engine not initialized'}), 500

        # Use personal baseline if available
        if user_id and baseline_service:
            baseline_data = baseline_service.get_baseline(user_id)
            result = shap_engine.compute_local(sensors, events, baseline_data)
        else:
            result = shap_engine.compute(sensors, events, deviation_score)

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
