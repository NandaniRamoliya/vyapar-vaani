"""
Platform database: shops, user accounts and login sessions.

Shop data (customers, khata, voice signatures...) never lives here. Each shop has its own
SQLite file (app/database/db.py), so one shop's data cannot leak into another's queries.

Security notes
* Passwords: PBKDF2-HMAC-SHA256, 240k iterations, per-user random salt. Plain passwords are
  never stored; an admin can only *reset* a password (the new one is shown once).
* Sessions: random 256-bit tokens; only their SHA-256 is stored, with an expiry.
"""
import hashlib
import hmac
import secrets
import shutil
import sqlite3
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

from app.config import settings
from app.database.db import init_db

PBKDF2_ITERATIONS = 240_000
DEMO_SHOPS = [
    # id, shop name, city, owner, login, password, seed profile
    ("shop_nandani", "Nandani Textiles", "Surat, Gujarat", "Nandani Ramoliya", "nandani", "nandani@123", "textile"),
    ("shop_patel", "Patel Kirana Store", "Ahmedabad, Gujarat", "Mahesh Patel", "patel", "patel@123", "kirana"),
]


def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def connect() -> sqlite3.Connection:
    Path(settings.platform_db).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.platform_db)
    conn.row_factory = sqlite3.Row
    return conn


# --------------------------------------------------------------------------- passwords & tokens
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PBKDF2_ITERATIONS).hex()
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _algo, iterations, salt, digest = stored.split("$")
        test = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iterations)).hex()
        return hmac.compare_digest(test, digest)
    except (ValueError, AttributeError):
        return False


def generate_password() -> str:
    # easy to read out over the phone: no 0/O, 1/l confusion
    alphabet = "abcdefghjkmnpqrstuvwxyz23456789"
    return "".join(secrets.choice(alphabet) for _ in range(4)) + "-" + "".join(secrets.choice(alphabet) for _ in range(4))


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# --------------------------------------------------------------------------- setup
def init_platform() -> None:
    conn = connect()
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS shops (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            city TEXT,
            owner_name TEXT,
            phone TEXT,
            status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            login TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('admin', 'shopkeeper')),
            shop_id TEXT REFERENCES shops(id),
            name TEXT,
            created_at TEXT NOT NULL,
            last_login_at TEXT
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
        """
    )
    cur.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
    if cur.fetchone()[0] == 0:
        cur.execute(
            "INSERT INTO users (id, login, password_hash, role, shop_id, name, created_at) VALUES (?, ?, ?, 'admin', NULL, ?, ?)",
            (f"usr_{uuid.uuid4().hex[:10]}", settings.ADMIN_LOGIN, hash_password(settings.ADMIN_PASSWORD), "Platform admin", _now()),
        )
    conn.commit()

    cur.execute("SELECT COUNT(*) FROM shops")
    no_shops = cur.fetchone()[0] == 0
    conn.close()

    if no_shops and settings.SEED_DEMO:
        _migrate_legacy_database()
        for shop_id, name, city, owner, login, password, seed in DEMO_SHOPS:
            create_shop(name, city, owner, login, password=password, seed=seed, shop_id=shop_id)

    # Bring every shop database up to the current schema
    conn = connect()
    shop_ids = [r["id"] for r in conn.execute("SELECT id FROM shops")]
    conn.close()
    for sid in shop_ids:
        init_db(settings.shop_db(sid))


def _migrate_legacy_database() -> None:
    """Pre-2.0 kept one shop in a single file; it becomes the first demo shop's database."""
    candidates = [Path(settings.LEGACY_DATABASE_PATH), Path(settings.DATA_DIR) / Path(settings.LEGACY_DATABASE_PATH).name]
    legacy = next((c for c in candidates if c.is_file()), None)
    target = Path(settings.shop_db(DEMO_SHOPS[0][0]))
    if legacy and not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(legacy, target)


# --------------------------------------------------------------------------- shops & users
def create_shop(name: str, city: str, owner_name: str, login: str, password: Optional[str] = None,
                phone: str = "", seed: Optional[str] = None, shop_id: Optional[str] = None) -> dict[str, Any]:
    """Creates the shop, its own empty database, and the owner's login. Returns the one-time password."""
    login = login.strip().lower()
    if not login or not name.strip():
        raise ValueError("Shop name and login are required")
    plain = password or generate_password()
    if len(plain) < 6:
        raise ValueError("Password must be at least 6 characters")
    shop_id = shop_id or f"shop_{uuid.uuid4().hex[:10]}"
    conn = connect()
    try:
        if conn.execute("SELECT 1 FROM users WHERE login = ?", (login,)).fetchone():
            raise ValueError("That login is already taken")
        conn.execute(
            "INSERT INTO shops (id, name, city, owner_name, phone, status, created_at) VALUES (?, ?, ?, ?, ?, 'active', ?)",
            (shop_id, name.strip(), city.strip(), owner_name.strip(), phone.strip(), _now()),
        )
        conn.execute(
            "INSERT INTO users (id, login, password_hash, role, shop_id, name, created_at) VALUES (?, ?, ?, 'shopkeeper', ?, ?, ?)",
            (f"usr_{uuid.uuid4().hex[:10]}", login, hash_password(plain), shop_id, owner_name.strip(), _now()),
        )
        conn.commit()
    finally:
        conn.close()
    init_db(settings.shop_db(shop_id), seed=seed)
    return {"shop": get_shop(shop_id), "login": login, "password": plain}


def get_shop(shop_id: str) -> Optional[dict[str, Any]]:
    conn = connect()
    row = conn.execute("SELECT * FROM shops WHERE id = ?", (shop_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def list_shops() -> list[dict[str, Any]]:
    conn = connect()
    rows = conn.execute(
        "SELECT s.*, u.login AS owner_login, u.last_login_at FROM shops s "
        "LEFT JOIN users u ON u.shop_id = s.id AND u.role = 'shopkeeper' ORDER BY s.created_at"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_shop(shop_id: str, **fields) -> Optional[dict[str, Any]]:
    allowed = {k: v for k, v in fields.items() if k in ("name", "city", "owner_name", "phone", "status") and v is not None}
    if allowed.get("status") not in (None, "active", "suspended"):
        raise ValueError("status must be 'active' or 'suspended'")
    conn = connect()
    if allowed:
        sets = ", ".join(f"{k} = ?" for k in allowed)
        conn.execute(f"UPDATE shops SET {sets} WHERE id = ?", (*allowed.values(), shop_id))
        if allowed.get("status") == "suspended":  # sign everyone in that shop out
            conn.execute("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE shop_id = ?)", (shop_id,))
        conn.commit()
    conn.close()
    return get_shop(shop_id)


def reset_shop_password(shop_id: str) -> Optional[dict[str, str]]:
    conn = connect()
    user = conn.execute("SELECT id, login FROM users WHERE shop_id = ? AND role = 'shopkeeper'", (shop_id,)).fetchone()
    if not user:
        conn.close()
        return None
    plain = generate_password()
    conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(plain), user["id"]))
    conn.execute("DELETE FROM sessions WHERE user_id = ?", (user["id"],))
    conn.commit()
    conn.close()
    return {"login": user["login"], "password": plain}


def change_password(user_id: str, old: str, new: str) -> bool:
    if len(new) < 6:
        raise ValueError("New password must be at least 6 characters")
    conn = connect()
    row = conn.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row or not verify_password(old, row["password_hash"]):
        conn.close()
        return False
    conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(new), user_id))
    conn.commit()
    conn.close()
    return True


# --------------------------------------------------------------------------- sessions
def authenticate(login: str, password: str) -> Optional[dict[str, Any]]:
    conn = connect()
    row = conn.execute("SELECT * FROM users WHERE login = ?", (login.strip().lower(),)).fetchone()
    conn.close()
    if not row or not verify_password(password, row["password_hash"]):
        return None
    return dict(row)


def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    expires = (datetime.now() + timedelta(days=settings.SESSION_DAYS)).strftime("%Y-%m-%d %H:%M:%S")
    conn = connect()
    conn.execute("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
                 (_token_hash(token), user_id, _now(), expires))
    conn.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (_now(), user_id))
    conn.execute("DELETE FROM sessions WHERE expires_at < ?", (_now(),))
    conn.commit()
    conn.close()
    return token


def user_for_token(token: str) -> Optional[dict[str, Any]]:
    if not token:
        return None
    conn = connect()
    row = conn.execute(
        "SELECT u.id, u.login, u.role, u.shop_id, u.name, s.expires_at, sh.name AS shop_name, sh.city AS shop_city, "
        "sh.status AS shop_status FROM sessions s JOIN users u ON u.id = s.user_id "
        "LEFT JOIN shops sh ON sh.id = u.shop_id WHERE s.token_hash = ?",
        (_token_hash(token),),
    ).fetchone()
    conn.close()
    if not row or row["expires_at"] < _now():
        return None
    return dict(row)


def delete_session(token: str) -> None:
    conn = connect()
    conn.execute("DELETE FROM sessions WHERE token_hash = ?", (_token_hash(token),))
    conn.commit()
    conn.close()
