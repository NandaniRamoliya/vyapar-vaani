"""
Vaani: the conversational layer on top of the NLP parser.

The server is stateless; the phone keeps a small `context` dict and sends it with
every utterance:
    {"last_customer": "Rahul Sharma",                      # for "uska kitna baaki?"
     "pending": {"intent", "data", "missing"},              # half-finished request
     "last_action": {"type": "ledger"|"order", "id": ...}}  # for "galti ho gayi, hata do"

This lets the agent behave like a person at the counter: ask one follow-up question
instead of failing, remember who you were just talking about, and undo a mistake.
"""
import re
from datetime import datetime
from typing import Any, Optional

from app.database.db import get_db_connection
from app.services import khata, signatures
from app.services.indic import best_name_match, has_indic, name_candidates, normalize_numbers, to_display_name
from app.services.nlp_parser import NLPParser, _contains_any
from app.services.replies import first_name, human_date, join_names, money, say
from app.services.when import human_when, parse_when, to_fields

ENTRY_INTENTS = ("add_udhar", "record_payment")
NAME_INTENTS = ENTRY_INTENTS + ("check_balance", "play_proof", "create_order")

PRONOUNS = [
    "his", "her", "him", "them", "same", "uska", "uski", "uske", "usko", "use", "unka", "unki", "unke", "unko",
    "iska", "iski", "isko", "aur", "and also",
    "उसका", "उसकी", "उसके", "उसको", "उसे", "उनका", "उनकी", "उनको", "उन्हें", "इसका", "इसको", "और",
    "એનું", "એના", "એની", "એને", "તેનું", "તેના", "તેને", "એમનું", "એમના", "એમને", "એણે", "તેણે", "બીજા",
]
HISAAB_WORDS = ["hisaab", "hisab", "हिसाब", "હિસાબ"]
# "aur 500" / "Priya ke liye bhi": repeat the last khata action
CONTINUE_WORDS = ["aur", "and", "also", "bhi", "too", "same", "again", "phir se", "और", "भी", "फिर से",
                  "પણ", "બીજા", "વધુ", "ફરી"]


def _required_slots(intent: str) -> list[str]:
    if intent in ENTRY_INTENTS:
        return ["customer_name", "amount"]
    if intent == "create_order":
        return ["customer_name", "total_amount"]
    if intent in ("check_balance", "play_proof"):
        return ["customer_name"]
    if intent == "add_customer":
        return ["name"]
    return []


def _missing(intent: str, data: dict) -> list[str]:
    slots = _required_slots(intent)
    if data.get("settle"):
        slots = [s for s in slots if s != "amount"]  # "pura hisaab clear": amount = pending balance
    return [s for s in slots if not data.get(s)]


def _bare_name(text: str) -> Optional[str]:
    """A short reply like "Rahul" / "राहुल" / "રાહુલભાઈ" answering 'whose khata?'."""
    words = [w for w in text.split() if not re.search(r"\d", w)]
    if not words or len(words) > 3:
        return None
    for w in words:
        cands = name_candidates(w)
        if cands:
            cand = cands[-1]  # suffix-stripped form
            if cand.lower() in ("ji", "bhai", "ben", "sir", "madam"):
                continue
            return to_display_name(cand) if has_indic(cand) else cand.capitalize()
    return None


class VoiceAgent:

    @classmethod
    def handle(cls, transcript: str, language: str = "en-IN", context: Optional[dict] = None,
               client_time: Optional[str] = None) -> dict[str, Any]:
        raw = transcript.strip()
        cls._now = cls._parse_client_time(client_time)
        text = normalize_numbers(raw)
        ctx = dict(context or {})
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT name FROM customers")
            customers = [r["name"] for r in cursor.fetchall()]
            result = cls._understand(raw, text, language, ctx, customers)
            cls._respond(cursor, result, text, language, ctx, customers)
        finally:
            conn.close()
        result["context"] = ctx
        return result

    _now: Optional[datetime] = None

    @staticmethod
    def _parse_client_time(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value[:19]).replace(second=0, microsecond=0)
        except ValueError:
            return None

    # ---------------------------------------------------------------- understanding
    @classmethod
    def _understand(cls, raw: str, text: str, language: str, ctx: dict, customers: list[str]) -> dict[str, Any]:
        pending = ctx.get("pending")
        guess = NLPParser.detect_intent(text)

        if pending and guess in ("unknown", pending.get("intent")):
            # Follow-up answer: fill only the slots we asked for
            data = dict(pending.get("data") or {})
            for slot in pending.get("missing") or []:
                if slot in ("amount", "total_amount"):
                    amount = NLPParser.extract_amount(text)
                    if amount:
                        data[slot] = amount
                elif slot == "customer_name":
                    name = best_name_match(text, customers) or NLPParser.extract_khata_name(text) or _bare_name(text)
                    if name:
                        data["customer_name"] = name
                elif slot == "name":  # new customer: "એનું નામ નંદની છે" / "Nandini"
                    name = NLPParser.extract_new_customer_name(text) or _bare_name(text)
                    if name:
                        data["name"] = name
            result = {"intent": pending["intent"], "extracted_data": data}
        elif guess == "unknown" and ctx.get("last_entry") and _contains_any(text.lower(), text, CONTINUE_WORDS):
            # "aur 500 likho" / "Priya ke liye bhi": same action, new amount or new customer
            last = ctx["last_entry"]
            amount = NLPParser.extract_amount(text)
            name = best_name_match(text, customers)
            result = {"intent": last["intent"], "extracted_data": {
                "customer_name": name or last.get("customer_name"),
                "amount": amount or (last.get("amount") if name else None),
                "note": raw[:140],
            }}
        else:
            parsed = NLPParser.parse(text, language)
            result = {"intent": parsed["intent"], "extracted_data": dict(parsed["extracted_data"]),
                      "spoken_response": parsed["spoken_response"],
                      "confirmation_prompt": parsed["confirmation_prompt"]}
            result["extracted_data"].pop("missing", None)
            if result["intent"] in ENTRY_INTENTS:
                result["extracted_data"]["note"] = raw[:140]

        intent = result["intent"]
        data = result["extracted_data"]

        # "Rahul ka hisaab" is a balance question, not the shop's daily summary
        if intent == "show_business_summary" and _contains_any(text.lower(), text, HISAAB_WORDS):
            known = best_name_match(text, customers)
            if known:
                intent = result["intent"] = "check_balance"
                data.clear()
                data["customer_name"] = known

        if intent in NAME_INTENTS or intent == "create_reminder":
            known = best_name_match(text, customers)
            if known:
                data["customer_name"] = known
            elif intent != "create_reminder" and not data.get("customer_name") and ctx.get("last_customer") and _contains_any(text.lower(), text, PRONOUNS):
                data["customer_name"] = ctx["last_customer"]
            elif data.get("customer_name") and has_indic(data["customer_name"]):
                data["customer_name"] = to_display_name(data["customer_name"])

        return result

    # ---------------------------------------------------------------- responding
    @classmethod
    def _respond(cls, cursor, result: dict, text: str, language: str, ctx: dict, customers: list[str]) -> None:
        intent = result["intent"]
        data = result["extracted_data"]
        result.setdefault("confirmation_prompt", "")
        result["confirmation_required"] = False

        missing = _missing(intent, data)
        if missing:
            ctx["pending"] = {"intent": intent, "data": data, "missing": missing}
            data["missing"] = missing
            slot = missing[0]
            first = first_name(data.get("customer_name") or "")
            if slot == "name":
                result["spoken_response"] = say("ask_customer_name", language)
            elif slot == "customer_name":
                result["spoken_response"] = say("ask_name", language)
            elif slot == "total_amount":
                result["spoken_response"] = say("ask_total", language)
            else:
                result["spoken_response"] = say("ask_amount", language, first=first)
            return
        ctx["pending"] = None

        handler = getattr(cls, f"_on_{intent}", None)
        if handler:
            handler(cursor, result, text, language, ctx)
        elif intent == "unknown":
            result["spoken_response"] = say("unknown", language)
        # other intents (reminders, add_customer, list_orders...) keep the parser's reply

        if data.get("customer_name") and intent in NAME_INTENTS and data.get("found") is not False:
            ctx["last_customer"] = data["customer_name"]

    # -- khata entries --------------------------------------------------------
    @classmethod
    def _entry(cls, cursor, result, text, language, ctx):
        data = result["extracted_data"]
        intent = result["intent"]
        row = khata.resolve_customer(cursor, data["customer_name"])
        if data.get("settle") and not data.get("amount"):
            pending = khata.get_balance(cursor, row["id"])["balance"] if row else 0.0
            if pending <= 0:
                result["spoken_response"] = say("balance_zero", language, name=row["name"] if row else data["customer_name"])
                return
            data["amount"] = pending
        amount = float(data["amount"])
        if row:
            current = khata.get_balance(cursor, row["id"])["balance"]
            data.update({"customer_id": row["id"], "customer_name": row["name"], "phone": row["phone"] or "",
                         "is_new_customer": False})
        else:
            current = 0.0
            data.update({"is_new_customer": True})
        new = current + (amount if intent == "add_udhar" else -amount)
        data["current_balance"] = current
        data["new_balance"] = new
        data["entry_type"] = "credit" if intent == "add_udhar" else "payment"

        key = "confirm_udhar" if intent == "add_udhar" else "confirm_payment"
        prompt = say(key, language, name=data["customer_name"], amt=money(amount), new=money(new))
        if data["is_new_customer"]:
            prompt = say("new_customer_note", language, name=data["customer_name"]) + prompt
        result["confirmation_prompt"] = result["spoken_response"] = prompt
        result["confirmation_required"] = True
        ctx["last_entry"] = {"intent": intent, "customer_name": data["customer_name"], "amount": amount}

    _on_add_udhar = _entry
    _on_record_payment = _entry

    @classmethod
    def _on_create_order(cls, cursor, result, text, language, ctx):
        data = result["extracted_data"]
        row = khata.resolve_customer(cursor, data["customer_name"])
        if row:
            data["customer_name"] = row["name"]
        prompt = NLPParser.order_prompt(data, language)
        result["confirmation_prompt"] = result["spoken_response"] = prompt
        result["confirmation_required"] = True

    # -- questions ------------------------------------------------------------
    @classmethod
    def _on_check_balance(cls, cursor, result, text, language, ctx):
        data = result["extracted_data"]
        row = khata.resolve_customer(cursor, data["customer_name"])
        if not row:
            data["found"] = False
            result["spoken_response"] = say("not_found", language, name=data["customer_name"])
            return
        bal = khata.get_balance(cursor, row["id"])
        proofs = signatures.signatures_for_customer(cursor, row["id"], limit=3)
        data.update({"found": True, "customer_id": row["id"], "customer_name": row["name"],
                     "phone": row["phone"] or "", **bal,
                     "recent_entries": khata.get_ledger(cursor, row["id"])[:3], "proofs": proofs})
        name = row["name"]
        if bal["balance"] > 0:
            spoken = say("balance_due", language, name=name, bal=money(bal["balance"]))
            if bal["last_payment_at"]:
                spoken += say("last_payment", language, date=human_date(bal["last_payment_at"], language))
            if proofs:
                spoken += say("has_proof", language)
        elif bal["balance"] == 0:
            spoken = say("balance_zero", language, name=name)
        else:
            spoken = say("balance_advance", language, name=name, bal=money(-bal["balance"]))
        result["spoken_response"] = spoken

    @classmethod
    def _on_list_dues(cls, cursor, result, text, language, ctx):
        summary = khata.list_accounts(cursor)
        top = [a for a in summary["accounts"] if a["balance"] > 0][:5]
        result["extracted_data"]["khata_summary"] = {
            "total_outstanding": summary["total_outstanding"],
            "customers_with_dues": summary["customers_with_dues"],
            "top": [{k: a[k] for k in ("customer_id", "customer_name", "phone", "balance", "days_since_payment", "never_paid")}
                    for a in top],
        }
        if not top:
            result["spoken_response"] = say("dues_none", language)
            return
        top_txt = join_names([f"{a['customer_name']} {money(a['balance'])}" for a in top[:3]], language)
        result["spoken_response"] = say("dues_list", language, n=summary["customers_with_dues"],
                                        total=money(summary["total_outstanding"]), top=top_txt)

    @classmethod
    def _on_play_proof(cls, cursor, result, text, language, ctx):
        data = result["extracted_data"]
        row = khata.resolve_customer(cursor, data["customer_name"])
        if not row:
            data["found"] = False
            result["spoken_response"] = say("not_found", language, name=data["customer_name"])
            return
        proofs = signatures.signatures_for_customer(cursor, row["id"], limit=3)
        bal = khata.get_balance(cursor, row["id"])["balance"]
        data.update({"found": True, "customer_id": row["id"], "customer_name": row["name"],
                     "phone": row["phone"] or "", "balance": bal, "proofs": proofs})
        if not proofs:
            result["spoken_response"] = say("proof_none", language, name=row["name"])
            return
        p = proofs[0]
        result["spoken_response"] = say("proof_intro", language, first=first_name(row["name"]),
                                        date=human_date(p["created_at"], language), amt=money(p["amount"]))

    @classmethod
    def _on_show_business_summary(cls, cursor, result, text, language, ctx):
        today = datetime.now().strftime("%Y-%m-%d")
        cursor.execute(
            "SELECT COUNT(*), COALESCE(SUM(total_amount), 0) FROM orders WHERE created_at LIKE ? AND status != 'cancelled'",
            (f"{today}%",),
        )
        orders, sales = cursor.fetchone()
        cursor.execute(
            "SELECT COALESCE(SUM(CASE WHEN entry_type='credit' THEN amount END), 0), "
            "COALESCE(SUM(CASE WHEN entry_type='payment' THEN amount END), 0) FROM ledger_entries WHERE created_at LIKE ?",
            (f"{today}%",),
        )
        given, collected = cursor.fetchone()
        cursor.execute("SELECT COUNT(*) FROM orders WHERE status = 'pending'")
        pending_orders = cursor.fetchone()[0]
        summary = khata.list_accounts(cursor)
        chase = sorted([a for a in summary["accounts"] if a["balance"] > 0],
                       key=lambda a: (-(a["days_since_payment"] or 0), -a["balance"]))[:2]

        result["extracted_data"]["stats"] = {
            "total_revenue": float(sales), "total_orders": orders, "pending_orders": pending_orders,
            "collected_today": float(collected), "udhar_given_today": float(given),
            "total_outstanding": summary["total_outstanding"],
            "chase": [{"customer_name": a["customer_name"], "balance": a["balance"], "phone": a["phone"],
                       "days_since_payment": a["days_since_payment"]} for a in chase],
        }
        spoken = say("hisaab", language, sales=money(float(sales)), orders=orders, given=money(float(given)),
                     collected=money(float(collected)), pending=money(summary["total_outstanding"]))
        if chase:
            spoken += say("hisaab_chase", language, who=join_names(
                [f"{a['customer_name']} ({money(a['balance'])})" for a in chase], language))
        result["spoken_response"] = spoken

    # -- undo -----------------------------------------------------------------
    @classmethod
    def _on_undo_last(cls, cursor, result, text, language, ctx):
        action = ctx.get("last_action") or {}
        data = result["extracted_data"]
        what = None
        if action.get("type") == "ledger":
            cursor.execute("SELECT * FROM ledger_entries WHERE id = ?", (action.get("id"),))
            row = cursor.fetchone()
            if row:
                cursor.execute("SELECT id FROM voice_signatures WHERE entry_id = ?", (row["id"],))
                if cursor.fetchone():
                    result["spoken_response"] = say("undo_signed", language)
                    return
                kind = {"credit": "udhar", "payment": "jama"}[row["entry_type"]]
                what = f"{row['customer_name']} {money(row['amount'])} {kind}"
        elif action.get("type") == "order":
            cursor.execute("SELECT * FROM orders WHERE id = ?", (action.get("id"),))
            row = cursor.fetchone()
            if row:
                cursor.execute(
                    "SELECT s.id FROM voice_signatures s JOIN ledger_entries l ON l.id = s.entry_id WHERE l.order_id = ?",
                    (row["id"],))
                if cursor.fetchone():
                    result["spoken_response"] = say("undo_signed", language)
                    return
                what = f"{row['customer_name']}: {row['quantity']} {row['product_name']} {money(row['total_amount'])}"
        if not what:
            result["spoken_response"] = say("undo_nothing", language)
            return
        data.update({"target_type": action["type"], "target_id": action["id"], "description": what})
        result["confirmation_prompt"] = result["spoken_response"] = say("undo_confirm", language, what=what)
        result["confirmation_required"] = True

    # -- customers & reminders ------------------------------------------------
    @classmethod
    def _on_add_customer(cls, cursor, result, text, language, ctx):
        data = result["extracted_data"]
        cursor.execute("SELECT name FROM customers WHERE LOWER(name) = LOWER(?)", (data["name"],))
        if cursor.fetchone():
            result["spoken_response"] = say("customer_exists", language, name=data["name"])
            return
        data.setdefault("phone", "")
        data.setdefault("business_notes", "Added by voice")
        phone_part = f" ({data['phone']})" if data.get("phone") else ""
        result["confirmation_prompt"] = result["spoken_response"] = say(
            "confirm_customer", language, name=data["name"], phone_part=phone_part)
        result["confirmation_required"] = True

    @classmethod
    def _on_create_reminder(cls, cursor, result, text, language, ctx):
        data = result["extracted_data"]
        due = parse_when(text, cls._now)
        data.update(to_fields(due))
        row = khata.resolve_customer(cursor, data.get("customer_name")) if data.get("customer_name") else None
        name = row["name"] if row else data.get("customer_name")
        if row:
            data.update({"customer_id": row["id"], "customer_name": row["name"], "phone": row["phone"] or ""})
            ctx["last_customer"] = row["name"]
        kind = data.get("kind", "general")
        if kind in ("payment", "call") and name:
            title = say(f"rem_title_{kind}", language, name=name)
            if kind == "payment" and row:
                bal = khata.get_balance(cursor, row["id"])["balance"]
                if bal > 0:
                    title += say("rem_balance", language, bal=money(bal))
        else:
            title = data.get("task") or text
        data["title"] = title
        when = human_when(due, language, cls._now)
        data["when_text"] = when
        result["confirmation_prompt"] = result["spoken_response"] = say(
            "confirm_reminder", language, when=when, title=title)
        result["confirmation_required"] = True

    # -- small talk -----------------------------------------------------------
    @classmethod
    def _on_greet(cls, cursor, result, text, language, ctx):
        result["spoken_response"] = say("greet", language)

    @classmethod
    def _on_thanks(cls, cursor, result, text, language, ctx):
        result["spoken_response"] = say("thanks", language)

    @classmethod
    def _on_help(cls, cursor, result, text, language, ctx):
        result["spoken_response"] = say("help", language)
