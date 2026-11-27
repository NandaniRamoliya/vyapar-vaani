import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    PROJECT_NAME: str = "VyaparVaani AI"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Multilingual Voice-First Business Assistant for Indian Small Businesses"
    
    # Zero-key by default: if no key is supplied, pure deterministic mock NLP runs flawlessly
    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY", None)
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY", None)
    
    # Storage settings
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "vyapar_vaani.db")
    
    # Fallback / Mock Mode
    MOCK_MODE: bool = os.getenv("MOCK_MODE", "true").lower() == "true" or not bool(os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY"))
    
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    CORS_ORIGINS: list[str] = ["*"]

settings = Settings()
