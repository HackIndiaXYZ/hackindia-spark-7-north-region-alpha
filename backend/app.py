# ============================================================
# DIPDoc Backend — Flask Application Factory
# Main entry point with SocketIO, CORS, and blueprint registration
# ============================================================

from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
from config import Config

# Services
from services.baseline import BaselineService
from services.shap_engine import SHAPEngine
from services.gemini_service import GeminiService
from services.encryption import E2EEncryption

# Routes
from routes.sync import sync_bp, init_sync
from routes.analyze import analyze_bp, init_analyze
from routes.explain import explain_bp, init_explain
from routes.report import report_bp, init_report


def create_app():
    """Application factory."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # ── CORS ──────────────────────────────────────────────
    CORS(app, resources={r"/*": {"origins": Config.CORS_ORIGINS}})

    # ── SocketIO ──────────────────────────────────────────
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

    # ── Initialize Services ───────────────────────────────
    baseline_service = BaselineService(window_days=Config.BASELINE_WINDOW_DAYS)
    shap_engine = SHAPEngine()
    gemini_service = GeminiService(api_key=Config.GEMINI_API_KEY)
    encryption_service = E2EEncryption(master_key=Config.E2EE_MASTER_KEY)

    # ── Inject Services into Routes ───────────────────────
    init_sync(baseline_service, encryption_service)
    init_analyze(baseline_service, gemini_service)
    init_explain(shap_engine, baseline_service)
    init_report(baseline_service, shap_engine, gemini_service)

    # ── Register Blueprints ───────────────────────────────
    app.register_blueprint(sync_bp)
    app.register_blueprint(analyze_bp)
    app.register_blueprint(explain_bp)
    app.register_blueprint(report_bp)

    # ── Health Check ──────────────────────────────────────
    @app.route('/')
    def health():
        return jsonify({
            'service': 'DIPDoc Backend API',
            'version': '1.0.0',
            'status': 'healthy',
            'endpoints': {
                'POST /sync': 'Receive wearable + symptom data',
                'POST /analyze': 'Compare against 14-day baseline',
                'POST /explain': 'Generate SHAP feature importance',
                'GET /report/<user_id>': 'Generate clinical report'
            },
            'gemini_live': gemini_service.is_live_available(),
            'encryption': 'AES-256-GCM + PBKDF2'
        })

    # ── SocketIO Events ───────────────────────────────────
    @socketio.on('connect')
    def handle_connect():
        print('[SocketIO] Client connected')

    @socketio.on('disconnect')
    def handle_disconnect():
        print('[SocketIO] Client disconnected')

    @socketio.on('sensor_data')
    def handle_sensor_data(data):
        """Real-time sensor data via WebSocket."""
        device_id = data.get('device_id', 'unknown')
        sensors = data.get('sensors', {})
        events = data.get('events', {})

        # Store & analyze
        baseline_service.add_record(device_id, {
            'sensors': sensors,
            'events': events,
            'timestamp': data.get('timestamp', ''),
            'status': data.get('local_status', 'Normal'),
            'deviation_score': data.get('deviation_score', 0)
        })

        result = baseline_service.analyze_deviation(device_id, sensors)

        # Broadcast to all connected dashboards
        socketio.emit('analysis_update', {
            'device_id': device_id,
            'status': result['status'],
            'deviation_score': result['deviation_score'],
            'deviations': result['deviations']
        })

        # If critical, broadcast alert
        if result['status'] == 'Critical':
            socketio.emit('critical_alert', {
                'device_id': device_id,
                'deviation_score': result['deviation_score'],
                'message': f"Critical deviation: {result['deviation_score']}%"
            })

    # ── Error Handlers ────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Endpoint not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    return app, socketio


# ── Entry Point ───────────────────────────────────────────
if __name__ == '__main__':
    app, socketio = create_app()
    print("\n" + "=" * 50)
    print("  DIPDoc Backend API v1.0")
    print(f"  Running on http://{Config.HOST}:{Config.PORT}")
    print("=" * 50 + "\n")
    socketio.run(app, host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
