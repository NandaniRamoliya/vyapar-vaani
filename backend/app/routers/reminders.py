import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.database.db import get_db_connection
from app.models.schemas import ApiResponse, ReminderCreate
from app.services import reminders as rem

router = APIRouter(prefix="/api/reminders", tags=["Reminders"])


@router.get("", response_model=ApiResponse)
def list_reminders(status: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if status and status != "all":
            cursor.execute("SELECT * FROM reminders WHERE status = ?", (status,))
        else:
            cursor.execute("SELECT * FROM reminders")
        rows = [rem.with_details(cursor, r) for r in cursor.fetchall()]
    finally:
        conn.close()
    # pending first (soonest first), then completed (latest first)
    rows.sort(key=lambda r: (r["status"] != "pending", r["due_at"] if r["status"] == "pending" else ""))
    return ApiResponse(success=True, message="Reminders fetched", data=rows)


@router.get("/due", response_model=ApiResponse)
def due_reminders(now: Optional[str] = Query(None, description="Phone's local time, ISO")):
    """Pending reminders whose time has come. The app polls this and rings/speaks/notifies."""
    current = (now or datetime.now().strftime("%Y-%m-%dT%H:%M:%S"))[:19]
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM reminders WHERE status = 'pending'")
        rows = [rem.with_details(cursor, r) for r in cursor.fetchall()]
    finally:
        conn.close()
    due = sorted([r for r in rows if r["due_at"] <= current], key=lambda r: r["due_at"])
    return ApiResponse(success=True, message="Due reminders", data=due)


@router.post("", response_model=ApiResponse)
def create_reminder(reminder: ReminderCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    rem_id = f"rem_{uuid.uuid4().hex[:8]}"
    due_at = rem.due_from(reminder.reminder_date, reminder.reminder_time)
    try:
        cursor.execute(
            "INSERT INTO reminders (id, customer_id, customer_name, title, reminder_date, reminder_time, status, created_at, kind, due_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (rem_id, reminder.customer_id, reminder.customer_name, reminder.title, reminder.reminder_date,
             reminder.reminder_time, reminder.status, now, reminder.kind or "general", due_at),
        )
        conn.commit()
    finally:
        conn.close()
    return ApiResponse(success=True, message="Reminder created",
                       data={"id": rem_id, **reminder.model_dump(), "due_at": due_at, "created_at": now})


@router.patch("/{reminder_id}/toggle", response_model=ApiResponse)
def toggle_reminder_status(reminder_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT status FROM reminders WHERE id = ?", (reminder_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Reminder not found")
        new_status = "completed" if row["status"] == "pending" else "pending"
        cursor.execute("UPDATE reminders SET status = ? WHERE id = ?", (new_status, reminder_id))
        conn.commit()
    finally:
        conn.close()
    return ApiResponse(success=True, message=f"Reminder marked as {new_status}", data={"status": new_status})


@router.patch("/{reminder_id}/snooze", response_model=ApiResponse)
def snooze_reminder(reminder_id: str, minutes: int = Query(10, ge=1, le=24 * 60), now: Optional[str] = None):
    base = None
    if now:
        try:
            base = datetime.fromisoformat(now[:19])
        except ValueError:
            base = None
    fields = rem.snooze_fields(minutes, base)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE reminders SET due_at = ?, reminder_date = ?, reminder_time = ?, status = 'pending' WHERE id = ?",
            (fields["due_at"], fields["reminder_date"], fields["reminder_time"], reminder_id),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Reminder not found")
        conn.commit()
    finally:
        conn.close()
    return ApiResponse(success=True, message=f"Snoozed for {minutes} minutes", data=fields)


@router.delete("/{reminder_id}", response_model=ApiResponse)
def delete_reminder(reminder_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Reminder not found")
        conn.commit()
    finally:
        conn.close()
    return ApiResponse(success=True, message="Reminder deleted")
