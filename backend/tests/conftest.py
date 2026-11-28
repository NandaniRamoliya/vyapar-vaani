"""
Test setup: a throw-away data folder, the platform DB with the two demo shops, and an
authenticated client for the Nandani Textiles demo shop.
"""
import os
import shutil
import tempfile

_DATA = tempfile.mkdtemp(prefix="vaani_test_")
os.environ["DATA_DIR"] = _DATA
os.environ["SEED_DEMO"] = "true"
os.environ["DATABASE_PATH"] = os.path.join(_DATA, "no_legacy.db")

from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.database.db import init_db  # noqa: E402
from app.main import app  # noqa: E402

DEMO_SHOP = "shop_nandani"


def login(client: TestClient, login: str, password: str) -> str:
    r = client.post("/api/auth/login", json={"login": login, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["data"]["token"]


def shop_client(user: str = "nandani", password: str = "nandani@123") -> TestClient:
    c = TestClient(app)
    c.headers["Authorization"] = f"Bearer {login(c, user, password)}"
    return c


def reset_demo_shop(shop_id: str = DEMO_SHOP, seed: str = "textile") -> None:
    """Fresh demo data for one shop (accounts and sessions are untouched)."""
    path = settings.shop_db(shop_id)
    if os.path.exists(path):
        os.remove(path)
    init_db(path, seed=seed)


def pytest_sessionfinish(session, exitstatus):
    shutil.rmtree(_DATA, ignore_errors=True)
