from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query

from app.database.db import get_db_connection
from app.models.schemas import ApiResponse
from app.services import khata, reminders as rem
from app.services.business_logic import BusinessService

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=ApiResponse)
def get_dashboard_statistics():
    stats = BusinessService.get_dashboard_stats()
    return ApiResponse(success=True, message="Dashboard statistics retrieved", data=stats.model_dump())


@router.get("/today", response_model=ApiResponse)
def today(now: Optional[str] = Query(None, description="Phone's local time, ISO")):
    """Everything a shopkeeper wants at a glance, as plain numbers and names."""
    current = (now or datetime.now().strftime("%Y-%m-%dT%H:%M:%S"))[:19]
    day = current[:10]
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*), COALESCE(SUM(total_amount), 0) FROM orders WHERE created_at LIKE ? AND status != 'cancelled'", (f"{day}%",))
        orders_today, sales_today = cur.fetchone()
        cur.execute(
            "SELECT COALESCE(SUM(CASE WHEN entry_type='credit' THEN amount END), 0), "
            "COALESCE(SUM(CASE WHEN entry_type='payment' THEN amount END), 0) FROM ledger_entries WHERE created_at LIKE ?",
            (f"{day}%",),
        )
        udhar_today, collected_today = cur.fetchone()
        summary = khata.list_accounts(cur)
        top = [a for a in summary["accounts"] if a["balance"] > 0][:4]

        cur.execute("SELECT * FROM reminders WHERE status = 'pending'")
        pending = [rem.with_details(cur, r) for r in cur.fetchall()]
        todays = sorted([r for r in pending if r["due_at"][:10] <= day], key=lambda r: r["due_at"])

        events = []
        cur.execute("SELECT customer_name, entry_type, amount, created_at FROM ledger_entries ORDER BY created_at DESC LIMIT 6")
        for r in cur.fetchall():
            events.append({"type": "udhar" if r["entry_type"] == "credit" else "payment", "customer_name": r["customer_name"],
                           "amount": r["amount"], "created_at": r["created_at"]})
        cur.execute("SELECT customer_name, total_amount, created_at, product_name, quantity FROM orders ORDER BY created_at DESC LIMIT 4")
        for r in cur.fetchall():
            events.append({"type": "order", "customer_name": r["customer_name"], "amount": r["total_amount"],
                           "created_at": r["created_at"], "detail": f"{r['quantity']} × {r['product_name']}"})
        events.sort(key=lambda e: e["created_at"], reverse=True)
    finally:
        conn.close()

    return ApiResponse(success=True, message="Today", data={
        "sales_today": float(sales_today), "orders_today": orders_today,
        "collected_today": float(collected_today), "udhar_today": float(udhar_today),
        "total_outstanding": summary["total_outstanding"], "customers_with_dues": summary["customers_with_dues"],
        "top_dues": [{k: a[k] for k in ("customer_id", "customer_name", "phone", "balance", "days_since_payment", "never_paid")} for a in top],
        "reminders": todays[:6], "overdue_count": len([r for r in todays if r["due_at"] < current]),
        "recent": events[:6],
    })
