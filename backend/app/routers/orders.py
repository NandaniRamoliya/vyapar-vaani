from fastapi import Depends
from app.security import shop_user
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import Order, OrderCreate, ApiResponse
from app.database.db import get_db_connection
from app.services import khata

router = APIRouter(prefix="/api/orders", tags=["Orders"], dependencies=[Depends(shop_user)])

@router.get("", response_model=ApiResponse)
def list_orders(status: Optional[str] = None, search: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM orders WHERE 1=1"
    params = []

    if status and status != "all":
        query += " AND status = ?"
        params.append(status)

    if search:
        query += " AND (customer_name LIKE ? OR product_name LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    query += " ORDER BY created_at DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    orders = [dict(r) for r in rows]
    conn.close()

    return ApiResponse(success=True, message="Orders fetched", data=orders)

@router.post("", response_model=ApiResponse)
def create_manual_order(order: OrderCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    order_id = f"ord_{uuid.uuid4().hex[:8]}"

    # Link to the customer book ("Rahul" -> Rahul Sharma), creating the customer if new
    customer_id, customer_name = order.customer_id, order.customer_name
    if not customer_id and customer_name.strip():
        customer_id, customer_name = khata.get_or_create_customer(cursor, customer_name, note="Added from a bill")
    cursor.execute('''
        INSERT INTO orders (id, customer_id, customer_name, product_name, quantity, total_amount, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (order_id, customer_id, customer_name, order.product_name, order.quantity, order.total_amount, order.status, now))
    if order.payment_mode == "udhar" and order.total_amount > 0 and customer_id:
        khata.add_entry(cursor, customer_id, customer_name, "credit", order.total_amount,
                        note=f"Bill: {order.quantity} {order.product_name}", source="order", order_id=order_id)
    conn.commit()
    conn.close()

    return ApiResponse(
        success=True, 
        message="Order created successfully", 
        data={"id": order_id, **order.model_dump(), "customer_id": customer_id, "customer_name": customer_name, "created_at": now}
    )

@router.patch("/{order_id}/status", response_model=ApiResponse)
def update_order_status(order_id: str, status: str = Query(..., pattern="^(pending|confirmed|delivered|cancelled)$")):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Order not found")
    conn.commit()
    conn.close()

    return ApiResponse(success=True, message=f"Order status updated to {status}")

@router.delete("/{order_id}", response_model=ApiResponse)
def delete_order(order_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT s.id FROM voice_signatures s JOIN ledger_entries l ON l.id = s.entry_id WHERE l.order_id = ?",
        (order_id,),
    )
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=409, detail="This udhar order has the customer's voice signature and cannot be deleted.")
    cursor.execute("DELETE FROM orders WHERE id = ?", (order_id,))
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Order not found")
    # An order sold on udhar also wrote a khata entry; undoing the order must undo that too
    cursor.execute("DELETE FROM ledger_entries WHERE order_id = ? AND source = 'order'", (order_id,))
    conn.commit()
    conn.close()

    return ApiResponse(success=True, message="Order deleted")
