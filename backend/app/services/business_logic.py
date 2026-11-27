import json
import uuid
from datetime import datetime
from typing import Any, Optional
from app.database.db import get_db_connection
from app.models.schemas import DashboardStats
from app.services import khata
from app.services.khata import format_inr

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

        # Recent khata entries
        cursor.execute("SELECT id, customer_name, entry_type, amount, created_at FROM ledger_entries ORDER BY created_at DESC LIMIT 3")
        for l_row in cursor.fetchall():
            is_credit = l_row["entry_type"] == "credit"
            recent_activity.append({
                "type": "khata",
                "id": l_row["id"],
                "title": f"{'Udhar given to' if is_credit else 'Payment from'} {l_row['customer_name']}",
                "subtitle": f"{'+' if is_credit else '-'}₹{format_inr(l_row['amount'])} • Khata",
                "timestamp": l_row["created_at"],
            })

        # Sort recent activity by timestamp desc
        recent_activity.sort(key=lambda x: x["timestamp"], reverse=True)

        khata_summary = khata.list_accounts(cursor)

        conn.close()

        return DashboardStats(
            total_customers=total_customers,
            total_orders=total_orders,
            total_revenue=total_revenue,
            pending_orders=pending_orders,
            today_reminders=today_reminders,
            total_outstanding=khata_summary["total_outstanding"],
            customers_with_dues=khata_summary["customers_with_dues"],
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

            payment_mode = data.get("payment_mode", "paid")

            # Match or create customer ("Rahul" -> existing "Rahul Sharma")
            cust_row = khata.resolve_customer(cursor, customer_name)
            customer_phone = ""
            if cust_row:
                customer_id = cust_row["id"]
                customer_name = cust_row["name"]
                customer_phone = cust_row["phone"] or ""
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

            khata_balance = None
            if payment_mode == "udhar" and total_amount > 0:
                khata.add_entry(
                    cursor, customer_id, customer_name, "credit", total_amount,
                    note=f"Order: {quantity} {product_name}", source="order", order_id=order_id,
                )
                khata_balance = khata.get_balance(cursor, customer_id)["balance"]
            conn.commit()

            result = {
                "order_id": order_id,
                "customer_id": customer_id,
                "customer_name": customer_name,
                "phone": customer_phone,
                "product_name": product_name,
                "quantity": quantity,
                "total_amount": total_amount,
                "payment_mode": payment_mode,
                "khata_balance": khata_balance,
                "status": "confirmed",
                "created_at": now
            }

            if "gu" in language:
                spoken_response = f"તમારો ઓર્ડર સફળતાપૂર્વક સેવ થઈ ગયો છે! {customer_name} માટે {quantity} {product_name} કન્ફર્મ થયા છે."
            elif "hi" in language:
                spoken_response = f"आपका ऑर्डर सफलतापूर्वक सेव हो गया है! {customer_name} के लिए {quantity} {product_name} कन्फर्म हो चुके हैं।"
            else:
                spoken_response = f"Your order has been saved successfully. Confirmed {quantity} {product_name} for {customer_name} worth rupees {int(total_amount)}."
            if khata_balance is not None and "gu" not in language and "hi" not in language:
                spoken_response += f" Added to {customer_name}'s khata. Total udhar is now rupees {format_inr(khata_balance)}."

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

        elif intent in ("add_udhar", "record_payment"):
            entry_type = "credit" if intent == "add_udhar" else "payment"
            amount = float(data.get("amount") or 0)
            if amount <= 0 or not data.get("customer_name"):
                conn.close()
                raise ValueError("Khata entry needs a customer name and a positive amount")
            customer_id, customer_name = khata.get_or_create_customer(cursor, data["customer_name"])
            entry = khata.add_entry(
                cursor, customer_id, customer_name, entry_type, amount,
                note=data.get("note", ""), source="voice",
            )
            bal = khata.get_balance(cursor, customer_id)
            cursor.execute("SELECT phone FROM customers WHERE id = ?", (customer_id,))
            phone = (cursor.fetchone() or {"phone": ""})["phone"] or ""
            conn.commit()

            result = {
                "entry": entry,
                "customer_id": customer_id,
                "customer_name": customer_name,
                "phone": phone,
                "entry_type": entry_type,
                "amount": amount,
                "balance": bal["balance"],
            }
            spoken_response = BusinessService._khata_saved_spoken(entry_type, customer_name, amount, bal["balance"], language)

        conn.close()
        return result, spoken_response

    # ------------------------------------------------------------------ khata voice helpers
    @staticmethod
    def _balance_phrase(name: str, balance: float, language: str) -> str:
        if "gu" in language:
            if balance > 0:
                return f"{name} પાસે ₹{format_inr(balance)} બાકી છે."
            return f"{name} નું ખાતું ચોખ્ખું છે." if balance == 0 else f"{name} એ ₹{format_inr(-balance)} એડવાન્સ આપ્યા છે."
        if "hi" in language:
            if balance > 0:
                return f"{name} का ₹{format_inr(balance)} बाकी है।"
            return f"{name} का खाता साफ़ है।" if balance == 0 else f"{name} ने ₹{format_inr(-balance)} एडवांस दिए हैं।"
        if balance > 0:
            return f"{name} owes you rupees {format_inr(balance)}."
        if balance == 0:
            return f"{name}'s khata is fully settled. Nothing is pending."
        return f"{name} has paid rupees {format_inr(-balance)} in advance."

    @staticmethod
    def _khata_saved_spoken(entry_type: str, name: str, amount: float, balance: float, language: str) -> str:
        bal_phrase = BusinessService._balance_phrase(name, balance, language)
        if "gu" in language:
            head = f"₹{format_inr(amount)} {'ઉધાર લખાઈ ગયા' if entry_type == 'credit' else 'જમા થઈ ગયા'}."
        elif "hi" in language:
            head = f"₹{format_inr(amount)} {'उधार लिख दिए' if entry_type == 'credit' else 'जमा कर लिए'}।"
        elif entry_type == "credit":
            head = f"Added rupees {format_inr(amount)} udhar to {name}'s khata."
        else:
            head = f"Received rupees {format_inr(amount)} from {name}. Payment recorded."
        return f"{head} {bal_phrase}"

    @staticmethod
    def enrich_khata(parsed: dict[str, Any], language: str = "en-IN") -> None:
        """Fill khata intents with live balances so the merchant hears real numbers before confirming."""
        intent = parsed["intent"]
        data = parsed["extracted_data"]
        if intent not in ("add_udhar", "record_payment", "check_balance", "list_dues"):
            return
        if data.get("missing"):
            return

        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            if intent == "list_dues":
                summary = khata.list_accounts(cursor)
                top = [a for a in summary["accounts"] if a["balance"] > 0][:5]
                data["khata_summary"] = {
                    "total_outstanding": summary["total_outstanding"],
                    "customers_with_dues": summary["customers_with_dues"],
                    "top": [
                        {"customer_id": a["customer_id"], "customer_name": a["customer_name"], "phone": a["phone"],
                         "balance": a["balance"], "days_since_payment": a["days_since_payment"],
                         "never_paid": a["never_paid"]}
                        for a in top
                    ],
                }
                if not top:
                    parsed["spoken_response"] = "Nobody owes you anything right now. All khatas are settled!"
                else:
                    names = ", ".join(f"{a['customer_name']} rupees {format_inr(a['balance'])}" for a in top[:3])
                    parsed["spoken_response"] = (
                        f"{summary['customers_with_dues']} customers owe you a total of rupees "
                        f"{format_inr(summary['total_outstanding'])}. Highest dues: {names}."
                    )
                return

            row = khata.resolve_customer(cursor, data.get("customer_name"))

            if intent == "check_balance":
                if not row:
                    data["found"] = False
                    parsed["spoken_response"] = f"I could not find a customer named {data.get('customer_name')} in your khata book."
                    return
                bal = khata.get_balance(cursor, row["id"])
                data.update({
                    "found": True,
                    "customer_id": row["id"],
                    "customer_name": row["name"],
                    "phone": row["phone"] or "",
                    **bal,
                    "recent_entries": khata.get_ledger(cursor, row["id"])[:3],
                })
                spoken = BusinessService._balance_phrase(row["name"], bal["balance"], language)
                if bal["last_payment_at"] and bal["balance"] > 0 and "gu" not in language and "hi" not in language:
                    spoken += f" Last payment was on {bal['last_payment_at'][:10]}."
                parsed["spoken_response"] = spoken
                return

            # add_udhar / record_payment: show before -> after so the merchant can verify
            amount = float(data["amount"])
            if row:
                current = khata.get_balance(cursor, row["id"])["balance"]
                data.update({"customer_id": row["id"], "customer_name": row["name"], "phone": row["phone"] or "", "is_new_customer": False})
            else:
                current = 0.0
                data.update({"customer_name": data["customer_name"].title(), "is_new_customer": True})
            delta = amount if intent == "add_udhar" else -amount
            data["current_balance"] = current
            data["new_balance"] = current + delta

            name = data["customer_name"]
            new_tag = " (new customer)" if data["is_new_customer"] else ""
            if intent == "add_udhar":
                prompt = (f"Add ₹{format_inr(amount)} udhar to {name}'s khata{new_tag}? "
                          f"Balance goes from ₹{format_inr(current)} to ₹{format_inr(current + delta)}. Say yes to save.")
            else:
                prompt = (f"Record ₹{format_inr(amount)} received from {name}{new_tag}? "
                          f"Balance goes from ₹{format_inr(current)} to ₹{format_inr(current + delta)}. Say yes to save.")
            parsed["confirmation_prompt"] = prompt
            parsed["spoken_response"] = prompt
        finally:
            conn.close()
