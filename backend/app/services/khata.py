"""
Khata / Udhar ledger service.

Every customer balance is derived from `ledger_entries`:
    balance = SUM(credit) - SUM(payment)
A positive balance means the customer owes the shop money (udhar / baaki).
A negative balance means the customer has paid in advance.
"""
import uuid
from datetime import datetime
from typing import Any, Optional


def format_inr(amount: float) -> str:
    """Indian digit grouping: 122000 -> '1,22,000'."""
    negative = amount < 0
    n = int(round(abs(amount)))
    s = str(n)
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        s = ",".join(groups) + "," + tail
    return ("-" if negative else "") + s


def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def resolve_customer(cursor, spoken_name: Optional[str]):
    """Match a spoken (often first-name only) customer to an existing customer row."""
    if not spoken_name or not spoken_name.strip():
        return None
    name = spoken_name.strip()

    cursor.execute("SELECT * FROM customers WHERE LOWER(name) = LOWER(?) LIMIT 1", (name,))
    row = cursor.fetchone()
    if row:
        return row

    first = name.split()[0]
    # First name match ("Rahul" -> "Rahul Sharma"), then surname match ("Sharma" -> "Rahul Sharma")
    for pattern in (f"{first} %", f"{first}%", f"% {first}%"):
        cursor.execute(
            "SELECT * FROM customers WHERE LOWER(name) LIKE LOWER(?) ORDER BY created_at ASC LIMIT 1",
            (pattern,),
        )
        row = cursor.fetchone()
        if row:
            return row
    return None


def get_or_create_customer(cursor, spoken_name: str, note: str = "Added from Voice Khata") -> tuple[str, str]:
    row = resolve_customer(cursor, spoken_name)
    if row:
        return row["id"], row["name"]
    cust_id = f"cust_{uuid.uuid4().hex[:8]}"
    clean_name = spoken_name.strip().title() or "Walk-in Customer"
    cursor.execute(
        "INSERT INTO customers (id, name, phone, business_notes, created_at) VALUES (?, ?, ?, ?, ?)",
        (cust_id, clean_name, "", note, _now()),
    )
    return cust_id, clean_name


def get_balance(cursor, customer_id: str) -> dict[str, Any]:
    cursor.execute(
        """
        SELECT
            COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount END), 0) AS total_credit,
            COALESCE(SUM(CASE WHEN entry_type = 'payment' THEN amount END), 0) AS total_paid,
            MAX(created_at) AS last_entry_at,
            MAX(CASE WHEN entry_type = 'payment' THEN created_at END) AS last_payment_at,
            COUNT(*) AS entry_count
        FROM ledger_entries WHERE customer_id = ?
        """,
        (customer_id,),
    )
    r = cursor.fetchone()
    total_credit = float(r["total_credit"])
    total_paid = float(r["total_paid"])
    return {
        "balance": total_credit - total_paid,
        "total_credit": total_credit,
        "total_paid": total_paid,
        "last_entry_at": r["last_entry_at"],
        "last_payment_at": r["last_payment_at"],
        "entry_count": r["entry_count"],
    }


def _days_since(ts: Optional[str]) -> Optional[int]:
    if not ts:
        return None
    try:
        return (datetime.now() - datetime.strptime(ts, "%Y-%m-%d %H:%M:%S")).days
    except ValueError:
        return None


def list_accounts(cursor) -> dict[str, Any]:
    """All customers with their khata balance, highest dues first."""
    cursor.execute(
        """
        SELECT
            c.id, c.name, c.phone,
            COALESCE(SUM(CASE WHEN l.entry_type = 'credit' THEN l.amount END), 0) AS total_credit,
            COALESCE(SUM(CASE WHEN l.entry_type = 'payment' THEN l.amount END), 0) AS total_paid,
            MAX(l.created_at) AS last_entry_at,
            MAX(CASE WHEN l.entry_type = 'payment' THEN l.created_at END) AS last_payment_at,
            MIN(CASE WHEN l.entry_type = 'credit' THEN l.created_at END) AS first_credit_at,
            COUNT(l.id) AS entry_count
        FROM customers c
        LEFT JOIN ledger_entries l ON l.customer_id = c.id
        GROUP BY c.id
        """
    )
    accounts = []
    for r in cursor.fetchall():
        balance = float(r["total_credit"]) - float(r["total_paid"])
        # "Due since": last payment if any, otherwise the first udhar entry
        due_since = r["last_payment_at"] or r["first_credit_at"]
        accounts.append({
            "customer_id": r["id"],
            "customer_name": r["name"],
            "phone": r["phone"] or "",
            "balance": balance,
            "total_credit": float(r["total_credit"]),
            "total_paid": float(r["total_paid"]),
            "last_entry_at": r["last_entry_at"],
            "last_payment_at": r["last_payment_at"],
            "days_since_payment": _days_since(due_since) if balance > 0 else None,
            "never_paid": r["last_payment_at"] is None,
            "entry_count": r["entry_count"],
        })
    accounts.sort(key=lambda a: (-a["balance"], a["customer_name"]))

    month_prefix = datetime.now().strftime("%Y-%m")
    cursor.execute(
        "SELECT COALESCE(SUM(amount), 0) FROM ledger_entries WHERE entry_type = 'payment' AND created_at LIKE ?",
        (f"{month_prefix}%",),
    )
    collected_this_month = float(cursor.fetchone()[0])

    with_dues = [a for a in accounts if a["balance"] > 0]
    return {
        "total_outstanding": sum(a["balance"] for a in with_dues),
        "customers_with_dues": len(with_dues),
        "collected_this_month": collected_this_month,
        "accounts": accounts,
    }


def get_ledger(cursor, customer_id: str) -> list[dict[str, Any]]:
    """Entries oldest-first with a running balance, returned newest-first for display."""
    cursor.execute(
        "SELECT * FROM ledger_entries WHERE customer_id = ? ORDER BY created_at ASC, rowid ASC",
        (customer_id,),
    )
    running = 0.0
    entries = []
    for r in cursor.fetchall():
        running += r["amount"] if r["entry_type"] == "credit" else -r["amount"]
        e = dict(r)
        e["running_balance"] = running
        entries.append(e)
    entries.reverse()
    return entries


def add_entry(
    cursor,
    customer_id: str,
    customer_name: str,
    entry_type: str,
    amount: float,
    note: str = "",
    source: str = "manual",
    order_id: Optional[str] = None,
) -> dict[str, Any]:
    if entry_type not in ("credit", "payment"):
        raise ValueError("entry_type must be 'credit' or 'payment'")
    if amount <= 0:
        raise ValueError("amount must be positive")
    entry_id = f"led_{uuid.uuid4().hex[:10]}"
    now = _now()
    cursor.execute(
        "INSERT INTO ledger_entries (id, customer_id, customer_name, entry_type, amount, note, source, order_id, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (entry_id, customer_id, customer_name, entry_type, float(amount), note, source, order_id, now),
    )
    return {
        "id": entry_id,
        "customer_id": customer_id,
        "customer_name": customer_name,
        "entry_type": entry_type,
        "amount": float(amount),
        "note": note,
        "source": source,
        "order_id": order_id,
        "created_at": now,
    }
