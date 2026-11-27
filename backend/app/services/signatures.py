"""
Voice Signatures: the customer's own voice, attached to a khata entry as proof.

Tamper evidence (no keys, no blockchain): every signature stores
    audio_sha256 = SHA-256(audio bytes)
    chain_hash   = SHA-256(prev_chain_hash | entry_id | customer_id | amount | created_at | audio_sha256)
so changing a recording, changing the amount of a signed entry, or deleting a signature
breaks the chain from that point on.
"""
import hashlib
import uuid
from datetime import datetime
from typing import Any, Optional

GENESIS = "0" * 64
MAX_AUDIO_BYTES = 3 * 1024 * 1024  # ~3 MB is minutes of opus audio; a signature is a few seconds
ALLOWED_MIME_PREFIXES = ("audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/aac")


def _chain(prev: str, entry_id: str, customer_id: str, amount: float, created_at: str, audio_sha: str) -> str:
    payload = f"{prev}|{entry_id}|{customer_id}|{amount:.2f}|{created_at}|{audio_sha}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _last_chain_hash(cursor) -> str:
    cursor.execute("SELECT chain_hash FROM voice_signatures ORDER BY created_at DESC, rowid DESC LIMIT 1")
    row = cursor.fetchone()
    return row["chain_hash"] if row else GENESIS


def public_meta(row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "entry_id": row["entry_id"],
        "customer_id": row["customer_id"],
        "customer_name": row["customer_name"],
        "amount": row["amount"],
        "phrase": row["phrase"],
        "language": row["language"],
        "duration_ms": row["duration_ms"],
        "audio_sha256": row["audio_sha256"],
        "chain_hash": row["chain_hash"],
        "created_at": row["created_at"],
        "audio_url": f"/api/signatures/{row['id']}/audio",
    }


def create_signature(cursor, entry_id: str, audio: bytes, mime_type: str,
                     duration_ms: Optional[int], phrase: str, language: str) -> dict[str, Any]:
    if not audio:
        raise ValueError("Empty recording")
    if len(audio) > MAX_AUDIO_BYTES:
        raise ValueError("Recording is too large")
    base_mime = (mime_type or "").split(";")[0].strip().lower()
    if not base_mime.startswith(ALLOWED_MIME_PREFIXES):
        raise ValueError(f"Unsupported audio type: {mime_type}")

    cursor.execute("SELECT * FROM ledger_entries WHERE id = ?", (entry_id,))
    entry = cursor.fetchone()
    if not entry:
        raise LookupError("Khata entry not found")
    cursor.execute("SELECT id FROM voice_signatures WHERE entry_id = ?", (entry_id,))
    if cursor.fetchone():
        raise FileExistsError("This entry already has a voice signature")

    sig_id = f"sig_{uuid.uuid4().hex[:12]}"
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    audio_sha = hashlib.sha256(audio).hexdigest()
    prev = _last_chain_hash(cursor)
    chain_hash = _chain(prev, entry_id, entry["customer_id"], float(entry["amount"]), created_at, audio_sha)

    cursor.execute(
        "INSERT INTO voice_signatures (id, entry_id, customer_id, customer_name, amount, phrase, language, mime_type, "
        "audio, duration_ms, audio_sha256, prev_chain_hash, chain_hash, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (sig_id, entry_id, entry["customer_id"], entry["customer_name"], float(entry["amount"]), phrase, language,
         mime_type, audio, duration_ms, audio_sha, prev, chain_hash, created_at),
    )
    cursor.execute("SELECT * FROM voice_signatures WHERE id = ?", (sig_id,))
    return public_meta(cursor.fetchone())


def signatures_for_entries(cursor, entry_ids: list[str]) -> dict[str, dict[str, Any]]:
    if not entry_ids:
        return {}
    marks = ",".join("?" * len(entry_ids))
    cursor.execute(
        f"SELECT id, entry_id, customer_id, customer_name, amount, phrase, language, duration_ms, audio_sha256, "
        f"chain_hash, created_at FROM voice_signatures WHERE entry_id IN ({marks})",
        entry_ids,
    )
    return {r["entry_id"]: public_meta(r) for r in cursor.fetchall()}


def signatures_for_customer(cursor, customer_id: str, limit: int = 3) -> list[dict[str, Any]]:
    cursor.execute(
        "SELECT id, entry_id, customer_id, customer_name, amount, phrase, language, duration_ms, audio_sha256, "
        "chain_hash, created_at FROM voice_signatures WHERE customer_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?",
        (customer_id, limit),
    )
    return [public_meta(r) for r in cursor.fetchall()]


def verify_chain(cursor) -> dict[str, Any]:
    """Recompute every hash from the stored audio and the live ledger rows."""
    cursor.execute(
        "SELECT s.*, l.customer_id AS l_customer_id, l.amount AS l_amount "
        "FROM voice_signatures s LEFT JOIN ledger_entries l ON l.id = s.entry_id "
        "ORDER BY s.created_at ASC, s.rowid ASC"
    )
    prev = GENESIS
    count = 0
    for r in cursor.fetchall():
        count += 1
        problems = []
        if r["l_customer_id"] is None:
            problems.append("khata entry was deleted")
        elif abs(float(r["l_amount"]) - float(r["amount"])) > 0.001 or r["l_customer_id"] != r["customer_id"]:
            problems.append("khata entry was edited after signing")
        if hashlib.sha256(r["audio"]).hexdigest() != r["audio_sha256"]:
            problems.append("recording was altered")
        if r["prev_chain_hash"] != prev:
            problems.append("a signature before this one was removed or changed")
        expected = _chain(prev, r["entry_id"], r["customer_id"], float(r["amount"]), r["created_at"], r["audio_sha256"])
        if expected != r["chain_hash"]:
            problems.append("signature record was modified")
        if problems:
            return {"valid": False, "checked": count, "broken_at": r["id"], "customer_name": r["customer_name"],
                    "problems": problems}
        prev = r["chain_hash"]
    return {"valid": True, "checked": count, "head": prev}
