"""Round-3 behaviour: loanwords, synonyms, follow-ups, continuations, real reminders."""
import os
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient


from app.main import app  # noqa: F401
from conftest import DEMO_SHOP, reset_demo_shop, shop_client
from app.services.nlp_parser import NLPParser
from app.services.when import parse_when


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    reset_demo_shop()
    yield


client = shop_client()
NOW = datetime(2026, 11, 28, 18, 0)


class Chat:
    def __init__(self, lang="en-IN"):
        self.lang, self.ctx = lang, {}

    def say(self, text, lang=None, client_time=None):
        body = {"transcript": text, "language": lang or self.lang, "context": self.ctx}
        if client_time:
            body["client_time"] = client_time
        d = client.post("/api/voice/process", json=body).json()["data"]
        self.ctx = d["context"]
        return d

    def yes(self, d):
        r = client.post("/api/voice/confirm", json={"interaction_id": d["interaction_id"], "confirmed": True})
        assert r.status_code == 200, r.text
        return r.json()["data"]


def balance(name):
    return next(a["balance"] for a in client.get("/api/khata").json()["data"]["accounts"] if a["customer_name"] == name)


# ---------------------------------------------------------------- the screenshot conversation
def test_gujarati_new_customer_with_follow_up_name():
    chat = Chat("gu-IN")
    d = chat.say("નવો કસ્ટમર ઉમેરો")                      # "add new customer" (no name)
    assert d["intent"] == "add_customer" and d["confirmation_required"] is False
    assert chat.ctx["pending"]["missing"] == ["name"]
    d = chat.say("એનું નામ નંદની છે")                      # "her name is Nandini"
    assert d["intent"] == "add_customer" and d["confirmation_required"] is True
    assert d["extracted_data"]["name"] == "Nandani"
    chat.yes(d)
    names = [c["name"] for c in client.get("/api/customers").json()["data"]]
    assert "Nandani" in names and "Amit Shah" not in names


def test_loanword_customer_in_gujarati_script():
    d = Chat("gu-IN").say("એડ ન્યૂ કસ્ટમર નેમ કવિતા")         # English words written in Gujarati
    assert d["intent"] == "add_customer"
    assert d["extracted_data"]["name"] == "Kavita"


def test_existing_customer_is_not_duplicated():
    d = Chat().say("add new customer Rahul Sharma")
    assert d["confirmation_required"] is False and "already" in d["spoken_response"]


# ---------------------------------------------------------------- same meaning, different words
@pytest.mark.parametrize("text", [
    "Rahul deposited 2000", "Rahul deposite 2000", "Rahul ne 2000 add money kiya",
    "राहुल ने 2000 डिपॉजिट किए", "રાહુલે 2000 ડિપોઝિટ કર્યા", "Rahul ne 2000 jama kiye", "Rahul paid 2000",
])
def test_deposit_synonyms_all_mean_payment(text):
    r = NLPParser.parse(text)
    assert r["intent"] == "record_payment" and r["extracted_data"]["amount"] == 2000


@pytest.mark.parametrize("text", ["Priya 3000 ka maal le gayi", "Priya took 3000", "પ્રિયા 3000 નો માલ લઈ ગઈ"])
def test_took_goods_means_udhar(text):
    assert NLPParser.parse(text)["intent"] == "add_udhar"


def test_settle_full_balance():
    chat = Chat()
    pending = balance("Anjali Gupta")
    d = chat.say("Anjali ne pura hisaab clear kar diya")
    assert d["intent"] == "record_payment" and d["extracted_data"]["amount"] == pending
    chat.yes(d)
    assert balance("Anjali Gupta") == 0


# ---------------------------------------------------------------- context
def test_continue_same_action_for_another_customer_and_amount():
    chat = Chat()
    chat.say("Priya ko 1000 udhar likho")
    d = chat.say("Suresh ke liye bhi")                   # same action, same amount, new customer
    assert d["intent"] == "add_udhar"
    assert d["extracted_data"]["customer_name"] == "Suresh Verma" and d["extracted_data"]["amount"] == 1000
    d = chat.say("aur 500")                               # same customer, new amount
    assert d["extracted_data"]["customer_name"] == "Suresh Verma" and d["extracted_data"]["amount"] == 500


# ---------------------------------------------------------------- reminders that actually fire
@pytest.mark.parametrize("text,expected", [
    ("remind me in 2 minutes", NOW + timedelta(minutes=2)),
    ("दस मिनट बाद याद दिलाना", NOW + timedelta(minutes=10)),
    ("કાલે સાંજે 5 વાગ્યે", datetime(2026, 11, 29, 17, 0)),
    ("kal subah 10 baje", datetime(2026, 11, 29, 10, 0)),
    ("5 baje", datetime(2026, 11, 29, 17, 0)),         # 5 pm already passed today
])
def test_when(text, expected):
    from app.services.indic import normalize_numbers
    assert parse_when(normalize_numbers(text), NOW) == expected


def test_voice_reminder_uses_phone_clock_and_becomes_due():
    chat = Chat("hi-IN")
    phone_now = "2026-11-28T18:00:00"
    d = chat.say("2 मिनट बाद राहुल से पैसे लेने हैं याद दिलाना", client_time=phone_now)
    assert d["intent"] == "create_reminder" and d["confirmation_required"] is True
    data = d["extracted_data"]
    assert data["due_at"] == "2026-11-28T18:02:00"
    assert data["customer_name"] == "Rahul Sharma" and data["kind"] == "payment"
    assert "Rahul Sharma से पैसे लेने हैं" in data["title"]
    rid = chat.yes(d)["executed_result"]["reminder_id"]

    not_yet = client.get("/api/reminders/due", params={"now": "2026-11-28T18:01:00"}).json()["data"]
    assert rid not in [r["id"] for r in not_yet]
    due = client.get("/api/reminders/due", params={"now": "2026-11-28T18:02:30"}).json()["data"]
    hit = next(r for r in due if r["id"] == rid)
    assert hit["phone"] and hit["balance"] > 0          # ready for "Call" / "WhatsApp" buttons

    client.patch(f"/api/reminders/{rid}/snooze", params={"minutes": 10, "now": "2026-11-28T18:03:00"})
    due = client.get("/api/reminders/due", params={"now": "2026-11-28T18:05:00"}).json()["data"]
    assert rid not in [r["id"] for r in due]
    client.patch(f"/api/reminders/{rid}/toggle")       # done
    due = client.get("/api/reminders/due", params={"now": "2026-11-29T00:00:00"}).json()["data"]
    assert rid not in [r["id"] for r in due]


# ---------------------------------------------------------------- every example in docs/USER_GUIDE.md
@pytest.mark.parametrize("text,lang,intent", [
    ("Rahul ko 5000 udhar likho", "en-IN", "add_udhar"), ("राहुल को 5000 उधार लिखो", "hi-IN", "add_udhar"),
    ("રાહુલને 5000 ઉધાર લખો", "gu-IN", "add_udhar"),
    ("Rahul paid 3000", "en-IN", "record_payment"), ("Rahul deposited 3000", "en-IN", "record_payment"),
    ("राहुल ने 3000 जमा किए", "hi-IN", "record_payment"), ("રાહુલે 3000 જમા કર્યા", "gu-IN", "record_payment"),
    ("Rahul ne pura hisaab clear kar diya", "en-IN", "record_payment"),
    ("राहुल ने पूरा हिसाब चुकता कर दिया", "hi-IN", "record_payment"), ("રાહુલે પૂરો હિસાબ ચોખ્ખો કર્યો", "gu-IN", "record_payment"),
    ("How much does Rahul owe me?", "en-IN", "check_balance"), ("राहुल का कितना बाकी है?", "hi-IN", "check_balance"),
    ("રાહુલના કેટલા બાકી છે?", "gu-IN", "check_balance"),
    ("Who owes me money?", "en-IN", "list_dues"), ("किसका कितना बाकी है?", "hi-IN", "list_dues"), ("કોના કેટલા બાકી છે?", "gu-IN", "list_dues"),
    ("Aaj ka hisaab", "en-IN", "show_business_summary"), ("आज का हिसाब", "hi-IN", "show_business_summary"),
    ("આજનો હિસાબ", "gu-IN", "show_business_summary"),
    ("Add an order for Priya, 10 sarees, 12000 on udhar", "en-IN", "create_order"),
    ("प्रिया के लिए 10 साड़ी का ऑर्डर, कुल 12000", "hi-IN", "create_order"),
    ("પ્રિયા માટે 10 સાડીનો ઓર્ડર, કુલ 12000", "gu-IN", "create_order"),
    ("Add new customer Kavita", "en-IN", "add_customer"), ("नया ग्राहक जोड़ो, नाम कविता", "hi-IN", "add_customer"),
    ("નવો ગ્રાહક ઉમેરો, નામ કવિતા", "gu-IN", "add_customer"),
    ("Remind me in 10 minutes to call Rahul", "en-IN", "create_reminder"),
    ("कल सुबह 10 बजे राहुल को फ़ोन करना याद दिलाना", "hi-IN", "create_reminder"),
    ("કાલે સાંજે 5 વાગ્યે પ્રિયાને ફોન કરવાનું યાદ અપાવો", "gu-IN", "create_reminder"),
    ("Rahul ka saboot sunao", "en-IN", "play_proof"), ("राहुल का सबूत सुनाओ", "hi-IN", "play_proof"),
    ("રાહુલનો પુરાવો સંભળાવો", "gu-IN", "play_proof"),
    ("Galti ho gayi, hata do", "en-IN", "undo_last"), ("गलती हो गई, हटा दो", "hi-IN", "undo_last"),
    ("ભૂલ થઈ ગઈ, કાઢી નાખો", "gu-IN", "undo_last"),
])
def test_user_guide_examples(text, lang, intent):
    d = client.post("/api/voice/process", json={"transcript": text, "language": lang}).json()["data"]
    assert d["intent"] == intent
    assert d["reply_language"] == lang


def test_order_totals_without_the_word_rupees():
    d = NLPParser.parse("Add an order for Priya, 10 sarees, 12000 on udhar")["extracted_data"]
    assert d["quantity"] == 10 and d["total_amount"] == 12000 and d["payment_mode"] == "udhar"
