import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from app.models.schemas import Reminder, ReminderCreate, ApiResponse
from app.database.db import get_db_connection

router = APIRouter(prefix="/api/reminders", tags=["Reminders"])

@router.get("", response_model=ApiResponse)
def list_reminders(status: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if status and status != "all":
        cursor.execute("SELECT * FROM reminders WHERE status = ? ORDER BY reminder_date ASC, reminder_time ASC", (status,))
    else:
        cursor.execute("SELECT * FROM reminders ORDER BY reminder_date ASC, reminder_time ASC")
    rows = cursor.fetchall()
    reminders = [dict(r) for r in rows]
    conn.close()
    return ApiResponse(success=True, message="Reminders fetched", data=reminders)

@router.post("", response_model=ApiResponse)
def create_reminder(reminder: ReminderCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    rem_id = f"rem_{uuid.uuid4().hex[:8]}"

    cursor.execute('''
        INSERT INTO reminders (id, customer_id, customer_name, title, reminder_date, reminder_time, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (rem_id, reminder.customer_id, reminder.customer_name, reminder.title, reminder.reminder_date, reminder.reminder_time, reminder.status, now))
    conn.commit()
    conn.close()

    return ApiResponse(
        success=True,
        message="Reminder created successfully",
        data={"id": rem_id, **reminder.model_dump(), "created_at": now}
    )

@router.patch("/{reminder_id}/toggle", response_model=ApiResponse)
def toggle_reminder_status(reminder_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM reminders WHERE id = ?", (reminder_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Reminder not found")

    new_status = "completed" if row["status"] == "pending" else "pending"
    cursor.execute("UPDATE reminders SET status = ? WHERE id = ?", (new_status, reminder_id))
    conn.commit()
    conn.close()

    return ApiResponse(success=True, message=f"Reminder marked as {new_status}", data={"status": new_status})

@router.delete("/{reminder_id}", response_model=ApiResponse)
def delete_reminder(reminder_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Reminder not found")
    conn.commit()
    conn.close()

    return ApiResponse(success=True, message="Reminder deleted")
