from fastapi import Depends
from app.security import shop_user
from fastapi import APIRouter, HTTPException
from app.models.schemas import ApiResponse, LedgerEntryCreate
from app.database.db import get_db_connection
from app.services import khata, signatures

router = APIRouter(prefix="/api/khata", tags=["Khata / Udhar Ledger"], dependencies=[Depends(shop_user)])


@router.get("", response_model=ApiResponse)
def khata_summary():
    """Every customer's udhar balance (highest dues first) plus shop-level totals."""
    conn = get_db_connection()
    try:
        data = khata.list_accounts(conn.cursor())
    finally:
        conn.close()
    return ApiResponse(success=True, message="Khata summary fetched", data=data)


@router.get("/{customer_id}", response_model=ApiResponse)
def customer_ledger(customer_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Customer not found")
        entries = khata.get_ledger(cursor, customer_id)
        sigs = signatures.signatures_for_entries(cursor, [e["id"] for e in entries])
        for e in entries:
            e["signature"] = sigs.get(e["id"])
        data = {
            "customer": dict(row),
            **khata.get_balance(cursor, customer_id),
            "entries": entries,
        }
    finally:
        conn.close()
    return ApiResponse(success=True, message="Customer ledger fetched", data=data)


@router.post("/entries", response_model=ApiResponse)
def create_entry(entry: LedgerEntryCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if entry.customer_id:
            cursor.execute("SELECT id, name FROM customers WHERE id = ?", (entry.customer_id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Customer not found")
            customer_id, customer_name = row["id"], row["name"]
        elif entry.customer_name and entry.customer_name.strip():
            customer_id, customer_name = khata.get_or_create_customer(cursor, entry.customer_name, note="Added from Khata")
        else:
            raise HTTPException(status_code=422, detail="customer_id or customer_name is required")

        saved = khata.add_entry(
            cursor, customer_id, customer_name, entry.entry_type, entry.amount,
            note=(entry.note or "").strip(), source="manual",
        )
        balance = khata.get_balance(cursor, customer_id)["balance"]
        conn.commit()
    finally:
        conn.close()
    return ApiResponse(success=True, message="Khata entry saved", data={**saved, "balance": balance})


@router.delete("/entries/{entry_id}", response_model=ApiResponse)
def delete_entry(entry_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM voice_signatures WHERE entry_id = ?", (entry_id,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail="This entry carries the customer's voice signature and cannot be deleted. Add a payment entry to balance it.",
            )
        cursor.execute("DELETE FROM ledger_entries WHERE id = ?", (entry_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Khata entry not found")
        conn.commit()
    finally:
        conn.close()
    return ApiResponse(success=True, message="Khata entry deleted")
