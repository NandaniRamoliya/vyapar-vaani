import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from app.models.schemas import Customer, CustomerCreate, ApiResponse
from app.database.db import get_db_connection

router = APIRouter(prefix="/api/customers", tags=["Customers"])

@router.get("", response_model=ApiResponse)
def list_customers(search: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if search:
        cursor.execute("SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name ASC", (f"%{search}%", f"%{search}%"))
    else:
        cursor.execute("SELECT * FROM customers ORDER BY created_at DESC")
    rows = cursor.fetchall()
    customers = [dict(r) for r in rows]
    conn.close()
    return ApiResponse(success=True, message="Customers fetched", data=customers)

@router.post("", response_model=ApiResponse)
def create_customer(customer: CustomerCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cust_id = f"cust_{uuid.uuid4().hex[:8]}"

    cursor.execute('''
        INSERT INTO customers (id, name, phone, business_notes, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (cust_id, customer.name, customer.phone, customer.business_notes, now))
    conn.commit()
    conn.close()

    return ApiResponse(
        success=True,
        message="Customer added successfully",
        data={"id": cust_id, **customer.model_dump(), "created_at": now}
    )

@router.get("/{customer_id}", response_model=ApiResponse)
def get_customer_details(customer_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
    customer_row = cursor.fetchone()
    if not customer_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Customer not found")

    cursor.execute("SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC", (customer_id,))
    order_rows = cursor.fetchall()
    conn.close()

    return ApiResponse(
        success=True,
        message="Customer details fetched",
        data={
            "customer": dict(customer_row),
            "orders": [dict(o) for o in order_rows]
        }
    )
