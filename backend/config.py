# ============================================================
# DIPDoc Backend — Configuration
# ============================================================

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration."""

    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dipdoc-secret-key-change-in-prod')
    DEBUG = os.getenv('FLASK_DEBUG', 'true').lower() == 'true'

    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')

    # Gemini AI
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    GEMINI_MODEL = 'gemini-2.0-flash'

    # Encryption
    E2EE_MASTER_KEY = os.getenv('E2EE_MASTER_KEY', 'dipdoc-e2ee-master-default-key!!')

    # Database (in-memory for hackathon)
    BASELINE_WINDOW_DAYS = 14

    # Server
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5001))
