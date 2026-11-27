import os
import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_PATH"] = "test_vyapar.db"

from app.main import app
from app.database.db import init_db
from app.services.nlp_parser import NLPParser
from app.services.khata import format_inr


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    if os.path.exists("test_vyapar.db"):
        os.remove("test_vyapar.db")
    init_db()
    yield
    if os.path.exists("test_vyapar.db"):
        try:
            os.remove("test_vyapar.db")
        except OSError:
            pass


client = TestClient(app)


def _balance_of(name: str) -> float:
    accounts = client.get("/api/khata").json()["data"]["accounts"]
    return next(a["balance"] for a in accounts if a["customer_name"] == name)


# ---------------------------------------------------------------- parser
@pytest.mark.parametrize("text,intent,name,amount", [
    ("How much does Rahul owe me?", "check_balance", "Rahul", None),
    ("Rahul ka kitna baaki hai?", "check_balance", "Rahul", None),
    ("राहुल का कितना बाकी है", "check_balance", "Rahul", None),
    ("Add ₹5,000 to Priya's udhar", "add_udhar", "Priya", 5000.0),
    ("Rahul ko 5000 udhar likho", "add_udhar", "Rahul", 5000.0),
    ("Rahul paid 3000 rupees", "record_payment", "Rahul", 3000.0),
    ("Received 2,000 from Anjali via UPI", "record_payment", "Anjali", 2000.0),
    ("Priya ne 2 hazar jama kiye", "record_payment", "Priya", 2000.0),
    ("Got payment of 1.5 lakh from Suresh", "record_payment", "Suresh", 150000.0),
])
def test_khata_intents(text, intent, name, amount):
    result = NLPParser.parse(text, "en-IN")
    assert result["intent"] == intent
    assert result["extracted_data"]["customer_name"] == name
    if amount is not None:
        assert result["extracted_data"]["amount"] == amount
        assert result["confirmation_required"] is True


def test_list_dues_and_sales_queries():
    assert NLPParser.parse("Who owes me money?")["intent"] == "list_dues"
    assert NLPParser.parse("How much did I sell today?")["intent"] == "show_business_summary"


def test_missing_amount_asks_instead_of_guessing():
    result = NLPParser.parse("Rahul paid", "en-IN")
    assert result["intent"] == "record_payment"
    assert result["confirmation_required"] is False
    assert result["extracted_data"]["missing"] == ["amount"]


def test_order_on_udhar_is_flagged():
    data = NLPParser.parse("Add an order for Rahul. 20 shirts, total 15000 rupees on udhar")["extracted_data"]
    assert data["payment_mode"] == "udhar"
    data = NLPParser.parse("Add an order for Rahul. 20 shirts, total 15000 rupees.")["extracted_data"]
    assert data["payment_mode"] == "paid"


def test_collection_reminder_names_the_customer():
    data = NLPParser.parse("Remind me to collect payment from Rahul tomorrow at 11 AM")["extracted_data"]
    assert data["customer_name"] == "Rahul"


def test_format_inr_uses_indian_grouping():
    assert format_inr(122000) == "1,22,000"
    assert format_inr(15000) == "15,000"
    assert format_inr(999) == "999"
    assert format_inr(12345678) == "1,23,45,678"


# ---------------------------------------------------------------- API flow
def test_seeded_balances():
    summary = client.get("/api/khata").json()["data"]
    assert _balance_of("Rahul Sharma") == 15000
    assert _balance_of("Suresh Verma") == 0
    assert summary["total_outstanding"] == 15000 + 8500 + 4000
    assert summary["customers_with_dues"] == 3


def test_voice_check_balance_resolves_first_name():
    data = client.post("/api/voice/process", json={"transcript": "How much does Rahul owe me?"}).json()["data"]
    assert data["intent"] == "check_balance"
    assert data["confirmation_required"] is False
    assert data["extracted_data"]["customer_name"] == "Rahul Sharma"
    assert data["extracted_data"]["balance"] == 15000
    assert "15,000" in data["spoken_response"]


def test_voice_payment_shows_before_after_then_updates_balance():
    data = client.post("/api/voice/process", json={"transcript": "Rahul paid 3000 rupees"}).json()["data"]
    assert data["status"] == "pending_confirmation"
    assert data["extracted_data"]["current_balance"] == 15000
    assert data["extracted_data"]["new_balance"] == 12000
    assert "12,000" in data["confirmation_prompt"]

    confirm = client.post("/api/voice/confirm", json={"interaction_id": data["interaction_id"], "confirmed": True})
    assert confirm.status_code == 200
    result = confirm.json()["data"]["executed_result"]
    assert result["balance"] == 12000
    assert _balance_of("Rahul Sharma") == 12000

    # A second "yes" (e.g. voice + button) must not record the payment twice
    again = client.post("/api/voice/confirm", json={"interaction_id": data["interaction_id"], "confirmed": True})
    assert again.status_code == 409
    assert _balance_of("Rahul Sharma") == 12000


def test_voice_udhar_for_new_customer_creates_account():
    data = client.post("/api/voice/process", json={"transcript": "Vikram ko 2500 udhar likho"}).json()["data"]
    assert data["extracted_data"]["is_new_customer"] is True
    client.post("/api/voice/confirm", json={"interaction_id": data["interaction_id"], "confirmed": True})
    assert _balance_of("Vikram") == 2500


def test_udhar_order_links_to_khata_and_undo_reverses_it():
    before = _balance_of("Priya Patel")
    data = client.post("/api/voice/process", json={
        "transcript": "Add an order for Priya. 10 sarees, total 12000 rupees on udhar"
    }).json()["data"]
    result = client.post("/api/voice/confirm", json={"interaction_id": data["interaction_id"], "confirmed": True}).json()["data"]["executed_result"]
    assert result["customer_name"] == "Priya Patel"
    assert result["khata_balance"] == before + 12000
    assert _balance_of("Priya Patel") == before + 12000

    assert client.delete(f"/api/orders/{result['order_id']}").status_code == 200
    assert _balance_of("Priya Patel") == before


def test_manual_entry_and_ledger_running_balance():
    cust_id = next(a["customer_id"] for a in client.get("/api/khata").json()["data"]["accounts"] if a["customer_name"] == "Anjali Gupta")
    resp = client.post("/api/khata/entries", json={"customer_id": cust_id, "entry_type": "payment", "amount": 4000, "note": "Cash"})
    assert resp.status_code == 200
    assert resp.json()["data"]["balance"] == 0

    ledger = client.get(f"/api/khata/{cust_id}").json()["data"]
    assert ledger["balance"] == 0
    assert ledger["entries"][0]["running_balance"] == 0  # newest first

    assert client.post("/api/khata/entries", json={"customer_id": cust_id, "entry_type": "payment", "amount": -5}).status_code == 422
    assert client.delete(f"/api/khata/entries/{resp.json()['data']['id']}").status_code == 200
    assert _balance_of("Anjali Gupta") == 4000


def test_dashboard_reports_outstanding():
    stats = client.get("/api/dashboard/stats").json()["data"]
    assert stats["total_outstanding"] > 0
    assert stats["customers_with_dues"] >= 3


def test_list_dues_voice_query():
    data = client.post("/api/voice/process", json={"transcript": "Who owes me money?"}).json()["data"]
    top = data["extracted_data"]["khata_summary"]["top"]
    assert top[0]["balance"] >= top[-1]["balance"]
    assert "customers owe you" in data["spoken_response"]
