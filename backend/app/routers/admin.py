"""Platform admin: create shops and their logins, pause shops, reset passwords, see how shops are doing."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.database import platform
from app.database.db import get_db_connection, shop_context
from app.models.schemas import ApiResponse
from app.security import admin_user
from app.services import khata

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(admin_user)])


class ShopCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    city: str = ""
    owner_name: str = ""
    phone: str = ""
    login: str = Field(..., min_length=3, max_length=60, pattern=r"^[A-Za-z0-9._@+-]+$")
    password: Optional[str] = Field(None, min_length=6, max_length=200)
    with_demo_data: bool = False


class ShopUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(active|suspended)$")


def _shop_stats(shop_id: str) -> dict:
    """Counts only. The admin sees how a shop is doing, not its customers' details."""
    with shop_context(shop_id):
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            summary = khata.list_accounts(cur)
            count = lambda sql: cur.execute(sql).fetchone()[0]
            last = cur.execute(
                "SELECT MAX(t) FROM (SELECT MAX(created_at) t FROM voice_interactions UNION ALL "
                "SELECT MAX(created_at) FROM ledger_entries UNION ALL SELECT MAX(created_at) FROM orders)"
            ).fetchone()[0]
            return {
                "customers": len(summary["accounts"]),
                "orders": count("SELECT COUNT(*) FROM orders"),
                "outstanding": summary["total_outstanding"],
                "voice_commands": count("SELECT COUNT(*) FROM voice_interactions"),
                "voice_signatures": count("SELECT COUNT(*) FROM voice_signatures"),
                "last_activity": last,
            }
        finally:
            conn.close()


@router.get("/overview", response_model=ApiResponse)
def overview():
    shops = platform.list_shops()
    stats = [_shop_stats(s["id"]) for s in shops]
    return ApiResponse(success=True, message="Platform overview", data={
        "shops": len(shops),
        "active_shops": sum(1 for s in shops if s["status"] == "active"),
        "customers": sum(s["customers"] for s in stats),
        "outstanding": sum(s["outstanding"] for s in stats),
        "voice_commands": sum(s["voice_commands"] for s in stats),
        "voice_signatures": sum(s["voice_signatures"] for s in stats),
    })


@router.get("/shops", response_model=ApiResponse)
def shops():
    return ApiResponse(success=True, message="Shops", data=[{**s, "stats": _shop_stats(s["id"])} for s in platform.list_shops()])


@router.post("/shops", response_model=ApiResponse)
def create_shop(req: ShopCreate):
    try:
        created = platform.create_shop(req.name, req.city, req.owner_name, req.login, password=req.password,
                                       phone=req.phone, seed="kirana" if req.with_demo_data else None)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    # The password is returned once so the admin can hand it over; it is stored only as a hash.
    return ApiResponse(success=True, message="Shop created", data=created)


@router.patch("/shops/{shop_id}", response_model=ApiResponse)
def update_shop(shop_id: str, req: ShopUpdate):
    if not platform.get_shop(shop_id):
        raise HTTPException(status_code=404, detail="Shop not found")
    return ApiResponse(success=True, message="Shop updated", data=platform.update_shop(shop_id, **req.model_dump()))


@router.post("/shops/{shop_id}/reset-password", response_model=ApiResponse)
def reset_password(shop_id: str):
    creds = platform.reset_shop_password(shop_id)
    if not creds:
        raise HTTPException(status_code=404, detail="Shop not found")
    return ApiResponse(success=True, message="Password reset", data=creds)
