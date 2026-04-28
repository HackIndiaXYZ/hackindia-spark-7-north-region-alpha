# ============================================================
# DIPDoc Backend — Gemini AI Service
# Hybrid mock + live Gemini 2.0 Flash integration
# ============================================================

import os
import random


class GeminiService:
    """
    Translates raw sensor data into elder-friendly health advice.
    Supports mock mode (hardcoded logic) and live Gemini API.
    """

    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY', '')
        self._client = None
        self._model = None

        if self.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self._model = genai.GenerativeModel('gemini-2.0-flash')
                print("[GeminiService] Live mode — API configured")
            except Exception as e:
                print(f"[GeminiService] API init failed: {e}")
                self._model = None
        else:
            print("[GeminiService] Mock mode — No API key")

    # ── Mock Advice Engine ─────────────────────────────────
    MOCK_ADVICE = {
        'Normal': [
            "Your vitals look great today. Keep staying hydrated and maintain your routine.",
            "All readings are within normal range. You're doing wonderfully!",
            "Everything looks stable. Remember to take a short walk if you feel up to it.",
            "Your breath quality is excellent. Emerald pulse active — all systems normal.",
            "No concerns detected. Your body is functioning well today."
        ],
        'Warning': [
            "Your hydration is slightly low. Please drink a glass of water now.",
            "We noticed some vocal strain. Try to rest your voice for a while.",
            "Your breath readings show a minor change. Open a window for fresh air.",
            "Hydration has dipped below normal. A warm cup of herbal tea would help.",
            "Minor deviation detected. Nothing urgent, but stay rested and hydrated."
        ],
        'Critical': [
            "Your hydration is critically low. Please drink water immediately and sit down.",
            "A cough pattern was detected with low hydration. Please rest and drink fluids now.",
            "Multiple vitals show significant deviation. Please contact your caregiver.",
            "Critical alert: Voice stress and breath quality need attention. Rest and stay calm.",
            "Your body water percentage is very low. Drink water now and alert your caregiver."
        ]
    }

    def get_advice(self, sensors, events, status='Normal', use_live=False):
        """
        Get health advice based on sensor data.
        
        Args:
            sensors: Dict of sensor readings
            events: Dict of detected events
            status: Current health status
            use_live: Force live API call
            
        Returns:
            dict: {advice: str, source: 'mock'|'live'}
        """
        if use_live and self._model:
            return self._live_advice(sensors, events, status)
        else:
            return self._mock_advice(sensors, events, status)

    def _mock_advice(self, sensors, events, status):
        """Generate advice using hardcoded medical logic."""
        # Context-aware mock
        advice = None

        if status == 'Critical':
            if events.get('cough_detected') and events.get('low_hydration'):
                advice = "A cough pattern was detected alongside low hydration. Please drink water immediately, sit down, and alert your caregiver."
            elif events.get('low_hydration'):
                advice = "Your body water is critically low. Please drink a full glass of water right now and rest."
            elif events.get('cough_detected'):
                advice = "Persistent cough detected. Please sit in a comfortable position and take slow, deep breaths."
            elif events.get('voice_strain'):
                advice = "Your voice shows significant stress. Please stop talking and rest your voice completely."

        elif status == 'Warning':
            if events.get('low_hydration'):
                advice = "Your hydration is dropping. Please drink a glass of water or warm tea soon."
            elif events.get('voice_strain'):
                advice = "We notice some vocal strain. Try to speak less and drink warm water."
            elif sensors.get('breath_quality', 100) < 70:
                advice = "Your breath quality has decreased slightly. Try opening a window for fresh air."

        if not advice:
            pool = self.MOCK_ADVICE.get(status, self.MOCK_ADVICE['Normal'])
            advice = random.choice(pool)

        return {
            'advice': advice,
            'source': 'mock',
            'status': status
        }

    def _live_advice(self, sensors, events, status):
        """Generate advice using Gemini API."""
        prompt = f"""You are a caring health advisor for an elderly person. Based on these sensor readings, 
give ONE simple, large-print sentence of advice. Be warm, calm, and specific.

Sensor Data:
- Breath Quality: {sensors.get('breath_quality', 'N/A')}% (normal: 85-100%)
- Voice Stress Index: {sensors.get('voice_stress', 'N/A')} (normal: 0-25)
- Hydration (Body Water): {sensors.get('hydration', 'N/A')}% (normal: 55-70%)
- Deviation Score: {status}
- Cough Detected: {'Yes' if events.get('cough_detected') else 'No'}
- Voice Strain: {'Yes' if events.get('voice_strain') else 'No'}
- Low Hydration: {'Yes' if events.get('low_hydration') else 'No'}

Respond with ONLY the advice sentence. No bullets, no headers. Under 30 words."""

        try:
            response = self._model.generate_content(
                prompt,
                generation_config={
                    'temperature': 0.3,
                    'max_output_tokens': 100
                }
            )
            advice = response.text.strip()
            return {
                'advice': advice,
                'source': 'live',
                'status': status
            }
        except Exception as e:
            print(f"[GeminiService] API error: {e}")
            # Fallback to mock
            result = self._mock_advice(sensors, events, status)
            result['source'] = 'mock (fallback)'
            return result

    def is_live_available(self):
        """Check if live API is configured."""
        return self._model is not None
