import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.database import platform
from app.models.schemas import ApiResponse
from app.security import current_user

router = APIRouter(prefix="/api/auth", tags=["Login"])

# Simple brute-force protection: 8 failed attempts per login per 10 minutes
_FAILS: dict[str, deque] = defaultdict(deque)
_WINDOW, _MAX_FAILS = 600, 8


class LoginRequest(BaseModel):
    login: str = Field(..., min_length=1, max_length=80)
    password: str = Field(..., min_length=1, max_length=200)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=200)


def _public_user(u: dict) -> dict:
    shop = None
    if u.get("shop_id"):
        shop = {"id": u["shop_id"], "name": u.get("shop_name"), "city": u.get("shop_city")}
    return {"user": {"id": u["id"], "login": u["login"], "name": u.get("name"), "role": u["role"]}, "shop": shop}


@router.post("/login", response_model=ApiResponse)
def login(req: LoginRequest):
    key = req.login.strip().lower()
    attempts = _FAILS[key]
    now = time.time()
    while attempts and now - attempts[0] > _WINDOW:
        attempts.popleft()
    if len(attempts) >= _MAX_FAILS:
        raise HTTPException(status_code=429, detail="Too many wrong passwords. Try again in 10 minutes.")

    user = platform.authenticate(req.login, req.password)
    if not user:
        attempts.append(now)
        raise HTTPException(status_code=401, detail="Wrong login or password")
    if user["role"] == "shopkeeper":
        shop = platform.get_shop(user["shop_id"])
        if not shop or shop["status"] != "active":
            raise HTTPException(status_code=403, detail="This shop is paused. Please contact the VyaparVaani admin.")
    attempts.clear()
    token = platform.create_session(user["id"])
    me = platform.user_for_token(token)
    return ApiResponse(success=True, message="Logged in", data={"token": token, **_public_user(me)})


@router.get("/me", response_model=ApiResponse)
def me(user: dict = Depends(current_user)):
    return ApiResponse(success=True, message="Me", data=_public_user(user))


@router.post("/logout", response_model=ApiResponse)
def logout(request: Request):
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        platform.delete_session(auth[7:].strip())
    return ApiResponse(success=True, message="Logged out")


@router.post("/change-password", response_model=ApiResponse)
def change_password(req: ChangePasswordRequest, user: dict = Depends(current_user)):
    if not platform.change_password(user["id"], req.old_password, req.new_password):
        raise HTTPException(status_code=400, detail="Old password is wrong")
    return ApiResponse(success=True, message="Password changed")
