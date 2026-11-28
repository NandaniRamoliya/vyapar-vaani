"""
Who is calling, and which shop's data may they touch.

Dependencies are `async` on purpose: the shop selection is stored in a ContextVar in the
request's own task, and FastAPI copies that context into the worker thread that runs the
(sync) endpoint. A shopkeeper can therefore only ever open their own shop's database.
"""
from typing import Any

from fastapi import Depends, HTTPException, Request

from app.database import platform
from app.database.db import use_shop


def _token(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    return auth[7:].strip() if auth.lower().startswith("bearer ") else ""


async def current_user(request: Request) -> dict[str, Any]:
    user = platform.user_for_token(_token(request))
    if not user:
        raise HTTPException(status_code=401, detail="Please log in again")
    if user["role"] == "shopkeeper" and user.get("shop_status") != "active":
        raise HTTPException(status_code=403, detail="This shop is paused. Please contact the VyaparVaani admin.")
    return user


async def shop_user(user: dict = Depends(current_user)) -> dict[str, Any]:
    if user["role"] != "shopkeeper" or not user.get("shop_id"):
        raise HTTPException(status_code=403, detail="Only shop accounts can open shop data")
    use_shop(user["shop_id"])
    return user


async def admin_user(user: dict = Depends(current_user)) -> dict[str, Any]:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return user
