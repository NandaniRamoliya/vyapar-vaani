import json
import uuid
from datetime import datetime
from typing import Any, Optional
from app.database.db import get_db_connection
from app.models.schemas import DashboardStats

class BusinessService:

    @staticmethod
    def get_dashboard_stats() -> DashboardStats:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM customers")
        total_customers = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*), COALESCE(SUM(total_amount), 0) FROM orders")
        row = cursor.fetchone()
        total_orders = row[0]
        total_revenue = float(row[1])

        cursor.execute("SELECT COUNT(*) FROM orders WHERE status = 'pending'")
        pending_orders = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM reminders WHERE status = 'pending'")
        today_reminders = cursor.fetchone()[0]

        # Recent activities
        recent_activity = []
        
        # Recent orders
        cursor.execute("SELECT id, customer_name, product_name, total_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 4")
        for ord_row in cursor.fetchall():
            recent_activity.append({
                "type": "order",
                "id": ord_row["id"],
                "title": f"Order: {ord_row['product_name']} for {ord_row['customer_name']}",
                "subtitle": f"₹{ord_row['total_amount']:,.0f} • Status: {ord_row['status'].title()}",
                "timestamp": ord_row["created_at"],
            })

        # Recent voice interactions
        cursor.execute("SELECT id, transcript, detected_intent, execution_status, created_at FROM voice_interactions ORDER BY created_at DESC LIMIT 3")
        for v_row in cursor.fetchall():
            recent_activity.append({
                "type": "voice",
                "id": v_row["id"],
                "title": f"Voice Command: {v_row['detected_intent'].replace('_', ' ').title()}",
                "subtitle": f'"{v_row["transcript"]}"',
                "timestamp": v_row["created_at"],
            })

        # Sort recent activity by timestamp desc
        recent_activity.sort(key=lambda x: x["timestamp"], reverse=True)

        conn.close()

        return DashboardStats(
            total_customers=total_customers,
            total_orders=total_orders,
            total_revenue=total_revenue,
            pending_orders=pending_orders,
            today_reminders=today_reminders,
            recent_activity=recent_activity[:6]
        )

    @staticmethod
    def execute_confirmed_action(intent: str, data: dict[str, Any], language: str = "en-IN") -> tuple[dict[str, Any], str]:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        result = {}
        spoken_response = ""

        if intent == "create_order":
            customer_name = data.get("customer_name", "Valued Customer")
            product_name = data.get("product_name", "Assorted Goods")
            quantity = int(data.get("quantity", 1))
            total_amount = float(data.get("total_amount", 0.0))

            # Match or create customer
            cursor.execute("SELECT id FROM customers WHERE LOWER(name) LIKE LOWER(?) LIMIT 1", (f"%{customer_name}%",))
            cust_row = cursor.fetchone()
            if cust_row:
                customer_id = cust_row["id"]
            else:
                customer_id = f"cust_{uuid.uuid4().hex[:8]}"
                cursor.execute(
                    "INSERT INTO customers (id, name, phone, business_notes, created_at) VALUES (?, ?, ?, ?, ?)",
                    (customer_id, customer_name, "+91 98000 00000", "Added from Voice Order", now)
                )

            order_id = f"ord_{uuid.uuid4().hex[:8]}"
            cursor.execute(
                "INSERT INTO orders (id, customer_id, customer_name, product_name, quantity, total_amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (order_id, customer_id, customer_name, product_name, quantity, total_amount, "confirmed", now)
            )
            conn.commit()

            result = {
                "order_id": order_id,
                "customer_name": customer_name,
                "product_name": product_name,
                "quantity": quantity,
                "total_amount": total_amount,
                "status": "confirmed",
                "created_at": now
            }

            if "gu" in language:
                spoken_response = f"તમારો ઓર્ડર સફળતાપૂર્વક સેવ થઈ ગયો છે! {customer_name} માટે {quantity} {product_name} કન્ફર્મ થયા છે."
            elif "hi" in language:
                spoken_response = f"आपका ऑर्डर सफलतापूर्वक सेव हो गया है! {customer_name} के लिए {quantity} {product_name} कन्फर्म हो चुके हैं।"
            else:
                spoken_response = f"Your order has been saved successfully. Confirmed {quantity} {product_name} for {customer_name} worth rupees {int(total_amount)}."

        elif intent == "create_reminder":
            customer_name = data.get("customer_name", "Rahul Sharma")
            title = data.get("title", f"Follow up with {customer_name}")
            reminder_date = data.get("reminder_date", datetime.now().strftime("%Y-%m-%d"))
            reminder_time = data.get("reminder_time", "11:00 AM")

            rem_id = f"rem_{uuid.uuid4().hex[:8]}"
            cursor.execute(
                "INSERT INTO reminders (id, customer_id, customer_name, title, reminder_date, reminder_time, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (rem_id, None, customer_name, title, reminder_date, reminder_time, "pending", now)
            )
            conn.commit()

            result = {
                "reminder_id": rem_id,
                "title": title,
                "reminder_date": reminder_date,
                "reminder_time": reminder_time,
                "status": "pending"
            }

            if "gu" in language:
                spoken_response = f"રિમાઇન્ડર સેવ થઈ ગયું છે. તમને {reminder_time} વાગ્યે યાદ કરાવવામાં આવશે."
            elif "hi" in language:
                spoken_response = f"रिमाइंडर सेव हो चुका है। आपको {reminder_time} बजे याद दिलाया जाएगा।"
            else:
                spoken_response = f"Reminder has been created successfully for {reminder_date} at {reminder_time}."

        elif intent == "add_customer":
            name = data.get("name", "New Customer")
            phone = data.get("phone", "+91 98000 00000")
            notes = data.get("business_notes", "Added via Voice")

            cust_id = f"cust_{uuid.uuid4().hex[:8]}"
            cursor.execute(
                "INSERT INTO customers (id, name, phone, business_notes, created_at) VALUES (?, ?, ?, ?, ?)",
                (cust_id, name, phone, notes, now)
            )
            conn.commit()

            result = {
                "customer_id": cust_id,
                "name": name,
                "phone": phone
            }

            if "gu" in language:
                spoken_response = f"નવા ગ્રાહક {name} ની વિગતો સફળતાપૂર્વક સેવ થઈ ગઈ છે."
            elif "hi" in language:
                spoken_response = f"नए ग्राहक {name} की जानकारी सफलतापूर्वक सेव हो गई है।"
            else:
                spoken_response = f"Customer {name} has been added to your records."

        conn.close()
        return result, spoken_response
