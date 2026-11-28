from fastapi import Depends
from app.security import shop_user
from fastapi import APIRouter
from app.config import settings
from app.models.schemas import ApiResponse

router = APIRouter(prefix="/api/settings", tags=["Settings"], dependencies=[Depends(shop_user)])

@router.get("", response_model=ApiResponse)
def get_settings_status():
    return ApiResponse(
        success=True,
        message="System settings retrieved",
        data={
            "app_name": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "zero_key_ready": True,
            "active_ai_provider": "Offline Deterministic Multilingual NLP (zero-key, no cloud LLM)",
            "supported_languages": [
                {"code": "en-IN", "name": "English (India)", "native": "English"},
                {"code": "hi-IN", "name": "Hindi", "native": "हिन्दी"},
                {"code": "gu-IN", "name": "Gujarati", "native": "ગુજરાતી"}
            ],
            "database_type": "SQLite, one file per shop"
        }
    )
