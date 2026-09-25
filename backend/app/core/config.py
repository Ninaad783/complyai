from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "ComplyAI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "complyai-super-secret-dev-key-2025"

    # AI Keys
    GOOGLE_API_KEY: Optional[str] = None

    # Model Settings (Verified compatible with Gemini API)
    GEMINI_MODEL: str = "gemini-2.5-flash"
    EMBEDDING_MODEL: str = "models/gemini-embedding-001"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    # Files
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50

    # JWT
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
