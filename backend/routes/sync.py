# ============================================================
# DIPDoc Backend — /sync Route
# Receives JSON from mobile app (Symptoms + Wearable Data)
# ============================================================

from flask import Blueprint, request, jsonify

sync_bp = Blueprint('sync', __name__)

# Will be injected by app factory
baseline_service = None
encryption_service = None


def init_sync(bl_service, enc_service):
    global baseline_service, encryption_service
    baseline_service = bl_service
    encryption_service = enc_service


@sync_bp.route('/sync', methods=['POST'])
def sync_data():
    """
    POST /sync
    
    Receives sensor + symptom data from the mobile app.
    Stores in baseline and optionally encrypts for cloud push.
    
    Body: {
        device_id, timestamp, local_status, deviation_score,
        sensors: {breath_quality, voice_stress, hydration, ...},
        events: {cough_detected, voice_strain, low_hydration},
        symptoms: ["cough", "fatigue", ...]
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON payload'}), 400

        device_id = data.get('device_id', 'unknown')
        sensors = data.get('sensors', {})
        events = data.get('events', {})
        status = data.get('local_status', 'Normal')

        # Store in baseline
        if baseline_service:
            baseline_service.add_record(device_id, {
                'sensors': sensors,
                'events': events,
                'status': status,
                'timestamp': data.get('timestamp', ''),
                'deviation_score': data.get('deviation_score', 0)
            })

        # If critical, encrypt and prepare for cloud push
        encrypted_data = None
        if status == 'Critical' and encryption_service:
            encrypted_data = encryption_service.create_shared_access(
                {'sensors': sensors, 'events': events, 'status': status},
                user_id=device_id,
                caregiver_id=f"caregiver-{device_id}"
            )

        return jsonify({
            'status': 'ok',
            'message': 'Data synced successfully',
            'records_stored': baseline_service.get_record_count(device_id) if baseline_service else 0,
            'encrypted': encrypted_data is not None,
            'critical_pushed': status == 'Critical'
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
