from datetime import datetime, timedelta
from typing import Any, Optional

from app.services import khata


def due_from(reminder_date: str, reminder_time: str) -> str:
    """Older rows only have '2026-11-28' + '11:00 AM'."""
    for fmt in ("%Y-%m-%d %I:%M %p", "%Y-%m-%d %H:%M", "%Y-%m-%d %I %p"):
        try:
            return datetime.strptime(f"{reminder_date} {reminder_time.strip().upper()}", fmt).strftime("%Y-%m-%dT%H:%M:%S")
        except ValueError:
            continue
    return f"{reminder_date}T10:00:00"


def with_details(cursor, row) -> dict[str, Any]:
    """Reminder + what you need to act on it: phone number and current udhar balance."""
    r = dict(row)
    r["due_at"] = r.get("due_at") or due_from(r["reminder_date"], r["reminder_time"])
    r["kind"] = r.get("kind") or "general"
    cust = None
    if r.get("customer_id"):
        cursor.execute("SELECT * FROM customers WHERE id = ?", (r["customer_id"],))
        cust = cursor.fetchone()
    elif r.get("customer_name"):
        cust = khata.resolve_customer(cursor, r["customer_name"])
    r["phone"] = (cust["phone"] if cust else "") or ""
    r["balance"] = khata.get_balance(cursor, cust["id"])["balance"] if cust else None
    if cust:
        r["customer_id"], r["customer_name"] = cust["id"], cust["name"]
    return r


def snooze_fields(minutes: int, now: Optional[datetime] = None) -> dict[str, str]:
    due = (now or datetime.now()).replace(second=0, microsecond=0) + timedelta(minutes=minutes)
    return {
        "due_at": due.strftime("%Y-%m-%dT%H:%M:%S"),
        "reminder_date": due.strftime("%Y-%m-%d"),
        "reminder_time": due.strftime("%I:%M %p"),
    }
