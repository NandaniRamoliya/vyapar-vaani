import sqlite3
import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Any
from app.config import settings

def get_db_connection():
    conn = sqlite3.connect(settings.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Customers Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        business_notes TEXT,
        created_at TEXT NOT NULL
    )
    ''')

    # 2. Orders Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        customer_name TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
    ''')

    # 3. Reminders Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        customer_name TEXT,
        title TEXT NOT NULL,
        reminder_date TEXT NOT NULL,
        reminder_time TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
    ''')

    # 4. Voice Interactions Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS voice_interactions (
        id TEXT PRIMARY KEY,
        transcript TEXT NOT NULL,
        detected_intent TEXT NOT NULL,
        language TEXT NOT NULL,
        extracted_data TEXT NOT NULL,
        confirmation_required INTEGER NOT NULL DEFAULT 1,
        confirmation_prompt TEXT,
        spoken_response TEXT,
        execution_status TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    ''')

    # 5. Khata / Udhar Ledger Table
    # entry_type: 'credit'  -> goods given on udhar (customer owes more)
    #             'payment' -> money received / jama (customer owes less)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        entry_type TEXT NOT NULL CHECK (entry_type IN ('credit', 'payment')),
        amount REAL NOT NULL CHECK (amount > 0),
        note TEXT,
        source TEXT NOT NULL DEFAULT 'manual',
        order_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_ledger_customer ON ledger_entries(customer_id)')

    conn.commit()

    # Seed initial realistic data if customers is empty
    cursor.execute('SELECT COUNT(*) FROM customers')
    count = cursor.fetchone()[0]
    if count == 0:
        seed_sample_data(cursor)
        conn.commit()

    # Seed khata entries for the demo customers (also upgrades databases created
    # before the ledger existed, as long as the demo customers are still there).
    cursor.execute('SELECT COUNT(*) FROM ledger_entries')
    if cursor.fetchone()[0] == 0:
        cursor.execute("SELECT COUNT(*) FROM customers WHERE id IN ('cust_1', 'cust_2', 'cust_3', 'cust_4')")
        if cursor.fetchone()[0] == 4:
            seed_ledger_data(cursor)
            conn.commit()

    conn.close()

def seed_sample_data(cursor):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    customers_data = [
        ("cust_1", "Rahul Sharma", "+91 98765 43210", "Garment Wholesaler, Surat - Regular bulk buyer", now),
        ("cust_2", "Priya Patel", "+91 98234 56789", "Boutique Owner, Ahmedabad - High-end sarees", now),
        ("cust_3", "Suresh Verma", "+91 97123 45678", "Retailer, Rajkot - Casual wear distributor", now),
        ("cust_4", "Anjali Gupta", "+91 96543 21098", "Kurti Specialist, Vadodara", now),
    ]
    cursor.executemany(
        'INSERT INTO customers (id, name, phone, business_notes, created_at) VALUES (?, ?, ?, ?, ?)',
        customers_data
    )

    orders_data = [
        ("ord_1", "cust_1", "Rahul Sharma", "Cotton Shirts (L/XL)", 50, 25000.0, "confirmed", now),
        ("ord_2", "cust_2", "Priya Patel", "Chanderi Silk Sarees", 15, 45000.0, "pending", now),
        ("ord_3", "cust_3", "Suresh Verma", "Denim Jeans (Pack of 10)", 30, 24000.0, "delivered", now),
        ("ord_4", "cust_4", "Anjali Gupta", "Embroidered Kurtis", 40, 28000.0, "pending", now),
    ]
    cursor.executemany(
        'INSERT INTO orders (id, customer_id, customer_name, product_name, quantity, total_amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        orders_data
    )

    reminders_data = [
        ("rem_1", "cust_1", "Rahul Sharma", "Call Rahul to verify dispatch of 50 shirts", "2026-11-28", "11:00 AM", "pending", now),
        ("rem_2", "cust_2", "Priya Patel", "Send catalog for new festive collection", "2026-11-27", "04:30 PM", "pending", now),
        ("rem_3", "cust_3", "Suresh Verma", "Payment follow-up for October delivery", "2026-11-26", "02:00 PM", "completed", now),
    ]
    cursor.executemany(
        'INSERT INTO reminders (id, customer_id, customer_name, title, reminder_date, reminder_time, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        reminders_data
    )

    interactions_data = [
        ("int_seed_1", "Add an order for Rahul. 50 shirts, total 25000 rupees.", "create_order", "en-IN", 
         json.dumps({"customer_name": "Rahul Sharma", "product_name": "Cotton Shirts", "quantity": 50, "total_amount": 25000}), 
         1, "Saved Cotton Shirts order for Rahul.", "Your order has been saved successfully.", "executed", now)
    ]
    cursor.executemany(
        'INSERT INTO voice_interactions (id, transcript, detected_intent, language, extracted_data, confirmation_required, confirmation_prompt, spoken_response, execution_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        interactions_data
    )


def seed_ledger_data(cursor):
    def days_ago(n: int) -> str:
        return (datetime.now() - timedelta(days=n)).strftime("%Y-%m-%d %H:%M:%S")

    # Balances after seeding: Rahul ₹15,000 · Priya ₹8,500 · Anjali ₹4,000 · Suresh settled
    ledger_data = [
        ("led_seed_1", "cust_1", "Rahul Sharma", "credit", 25000.0, "50 Cotton Shirts on udhar", "manual", "ord_1", days_ago(18)),
        ("led_seed_2", "cust_1", "Rahul Sharma", "payment", 10000.0, "Part payment via UPI", "manual", None, days_ago(6)),
        ("led_seed_3", "cust_2", "Priya Patel", "credit", 8500.0, "Festive saree lot - pay after Diwali", "manual", None, days_ago(32)),
        ("led_seed_4", "cust_3", "Suresh Verma", "credit", 24000.0, "Denim jeans lot", "manual", "ord_3", days_ago(40)),
        ("led_seed_5", "cust_3", "Suresh Verma", "payment", 24000.0, "Full settlement - cash", "manual", None, days_ago(12)),
        ("led_seed_6", "cust_4", "Anjali Gupta", "credit", 6000.0, "Kurti sample set", "manual", None, days_ago(9)),
        ("led_seed_7", "cust_4", "Anjali Gupta", "payment", 2000.0, "Cash at counter", "manual", None, days_ago(3)),
    ]
    cursor.executemany(
        'INSERT INTO ledger_entries (id, customer_id, customer_name, entry_type, amount, note, source, order_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ledger_data
    )
