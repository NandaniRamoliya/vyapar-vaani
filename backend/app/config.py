import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


def _data_dir() -> str:
    if os.getenv("DATA_DIR"):
        return os.getenv("DATA_DIR")
    # Older setups only had DATABASE_PATH; keep their data folder
    legacy = os.getenv("DATABASE_PATH")
    if legacy and os.path.dirname(legacy):
        return os.path.dirname(legacy)
    return "data"


class Settings(BaseModel):
    PROJECT_NAME: str = "VyaparVaani"
    VERSION: str = "2.0.0"
    DESCRIPTION: str = "Voice khata for Indian shops: English, Hindi and Gujarati, customer voice signatures, multi-shop"

    # Storage: one platform DB (shops, users, sessions) + one SQLite file per shop (data isolation)
    DATA_DIR: str = _data_dir()
    # Pre-2.0 single-shop database, migrated into the demo shop on first start if present
    LEGACY_DATABASE_PATH: str = os.getenv("DATABASE_PATH", "vyapar_vaani.db")

    # First admin account (created once). Change the password after first login.
    ADMIN_LOGIN: str = os.getenv("ADMIN_LOGIN", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin@123")
    # Create two demo shops (with demo logins) on first start
    SEED_DEMO: bool = os.getenv("SEED_DEMO", "true").lower() == "true"
    SESSION_DAYS: int = int(os.getenv("SESSION_DAYS", "30"))

    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    # Comma-separated origins allowed to call the API (e.g. your GitHub Pages site). "*" = any.
    CORS_ORIGINS: list[str] = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]

    @property
    def platform_db(self) -> str:
        return str(Path(self.DATA_DIR) / "platform.db")

    def shop_db(self, shop_id: str) -> str:
        return str(Path(self.DATA_DIR) / "shops" / f"{shop_id}.db")


settings = Settings()
