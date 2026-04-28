# ============================================================
# DIPDoc Backend — Data Models
# Pydantic models for validation & serialization
# ============================================================

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class SensorReading(BaseModel):
    """Individual sensor reading from wearable."""
    breath_quality: float = Field(ge=0, le=100, description="Breath quality %")
    voice_stress: float = Field(ge=0, le=100, description="Voice stress index")
    hydration: float = Field(ge=0, le=100, description="Body water %")
    gas_raw: float = Field(ge=0, description="Gas sensor raw ADC")
    mic_rms: float = Field(ge=0, description="Microphone RMS amplitude")
    impedance: float = Field(ge=0, description="Bio-impedance Ω")


class SensorEvents(BaseModel):
    """Detected events from sensor analysis."""
    cough_detected: bool = False
    voice_strain: bool = False
    low_hydration: bool = False


class SyncPayload(BaseModel):
    """Payload received at /sync endpoint."""
    device_id: str
    timestamp: str
    local_status: str = "Normal"
    deviation_score: float = Field(ge=0, le=100)
    sensors: SensorReading
    events: SensorEvents
    symptoms: Optional[List[str]] = []
    battery: Optional[float] = None


class AnalyzeRequest(BaseModel):
    """Request to /analyze endpoint."""
    user_id: str = "default"
    sensors: SensorReading
    events: SensorEvents


class AnalyzeResponse(BaseModel):
    """Response from /analyze endpoint."""
    status: str
    deviation_score: float
    deviations: dict
    baseline: dict
    message: str


class ExplainRequest(BaseModel):
    """Request to /explain endpoint."""
    sensors: SensorReading
    events: SensorEvents
    deviation_score: float


class SHAPValue(BaseModel):
    """Single SHAP feature contribution."""
    feature: str
    contribution: float
    direction: str  # 'positive' or 'negative'


class ExplainResponse(BaseModel):
    """Response from /explain endpoint."""
    features: List[SHAPValue]
    top_factor: str
    summary: str


class ReportData(BaseModel):
    """Clinical report data."""
    patient_id: str
    generated_at: str
    status: str
    deviation_score: float
    sensors: SensorReading
    deviations: dict
    events: SensorEvents
    shap_features: List[SHAPValue]
    ai_advice: str
    baseline_period_days: int = 14


class HealthRecord(BaseModel):
    """Stored health data record."""
    id: Optional[int] = None
    device_id: str
    timestamp: datetime
    status: str
    deviation_score: float
    sensors: SensorReading
    events: SensorEvents
    encrypted_data: Optional[str] = None
