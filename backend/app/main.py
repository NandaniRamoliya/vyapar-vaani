import mimetypes
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.config import settings
from app.database.platform import init_platform
from app.routers import voice, orders, customers, reminders, dashboard, settings_router, khata, signatures, auth, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_platform()  # platform DB + every shop's own DB (demo shops on first start)
    yield

# Also when imported directly (tests, `python -c`), so the API works without the lifespan
init_platform()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,  # bearer tokens, no cookies: works with "*" and any Pages origin
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(dashboard.router)
app.include_router(voice.router)
app.include_router(orders.router)
app.include_router(customers.router)
app.include_router(reminders.router)
app.include_router(settings_router.router)
app.include_router(khata.router)
app.include_router(signatures.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "zero_key_ready": True
    }


# ---------------------------------------------------------------------------
# Serve the built web app (Docker / single-port mode). In development the Vite
# dev server serves the frontend instead and this block is skipped.
# ---------------------------------------------------------------------------
mimetypes.add_type("application/manifest+json", ".webmanifest")
STATIC_DIR = Path(os.getenv("STATIC_DIR", Path(__file__).resolve().parents[2] / "frontend" / "dist")).resolve()

if (STATIC_DIR / "index.html").is_file():
    if (STATIC_DIR / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_web_app(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = (STATIC_DIR / full_path).resolve()
        if full_path and candidate.is_file() and STATIC_DIR in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")  # single-page app
