from fastapi import APIRouter
from app.config import settings
from app.models.schemas import ApiResponse

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("", response_model=ApiResponse)
def get_settings_status():
    return ApiResponse(
        success=True,
        message="System settings retrieved",
        data={
            "app_name": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "mock_mode": settings.MOCK_MODE,
            "zero_key_ready": True,
            "active_ai_provider": "Offline Deterministic Multilingual NLP" if settings.MOCK_MODE else "Cloud LLM",
            "supported_languages": [
                {"code": "en-IN", "name": "English (India)", "native": "English"},
                {"code": "hi-IN", "name": "Hindi", "native": "हिन्दी"},
                {"code": "gu-IN", "name": "Gujarati", "native": "ગુજરાતી"}
            ],
            "database_type": "SQLite Persistent Fallback"
        }
    )
