"""Conversation behaviour of Vaani + voice signatures (all offline, no keys)."""
import os
import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_PATH"] = "test_vyapar.db"

from app.main import app
from app.database.db import init_db, get_db_connection
from app.services.indic import best_name_match, normalize_numbers, phonetic_key

CUSTOMERS = ["Rahul Sharma", "Priya Patel", "Suresh Verma", "Anjali Gupta"]
FAKE_AUDIO = b"\x1aE\xdf\xa3" + b"opus-voice-bytes" * 200  # webm magic + payload


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


class Chat:
    """Mimics the phone: keeps the context between turns."""

    def __init__(self, lang="en-IN"):
        self.lang, self.ctx = lang, {}

    def say(self, text, lang=None):
        d = client.post("/api/voice/process", json={
            "transcript": text, "language": lang or self.lang, "context": self.ctx}).json()["data"]
        self.ctx = d["context"]
        return d

    def yes(self, d):
        r = client.post("/api/voice/confirm", json={"interaction_id": d["interaction_id"], "confirmed": True})
        assert r.status_code == 200, r.text
        res = r.json()["data"]["executed_result"]
        if res.get("entry"):
            self.ctx["last_action"] = {"type": "ledger", "id": res["entry"]["id"]}
        if res.get("order_id"):
            self.ctx["last_action"] = {"type": "order", "id": res["order_id"]}
        return r.json()["data"]


def balance(name):
    accounts = client.get("/api/khata").json()["data"]["accounts"]
    return next(a["balance"] for a in accounts if a["customer_name"] == name)


# ---------------------------------------------------------------- language helpers
@pytest.mark.parametrize("text,expected", [
    ("राहुल को पांच हजार उधार लिखो", "राहुल को 5000 उधार लिखो"),
    ("Rahul ko do hazaar udhar", "Rahul ko 2000 udhar"),
    ("સાડા ત્રણ હજાર જમા", "3500 જમા"),
    ("dedh lakh received", "150000 received"),
    ("राहुल ने ५००० दिए", "राहुल ने 5000 दिए"),
    ("हटा दो", "हटा दो"),  # "दो" = give, not 2
])
def test_number_words(text, expected):
    assert normalize_numbers(text) == expected


@pytest.mark.parametrize("text,name", [
    ("રાહુલે 3000 જમા કર્યા", "Rahul Sharma"),
    ("प्रिया का कितना बाकी है", "Priya Patel"),
    ("અંજલિબેન નો હિસાબ", "Anjali Gupta"),
    ("Raahul paid", "Rahul Sharma"),
    ("are you sure", None),
])
def test_names_across_scripts(text, name):
    assert best_name_match(text, CUSTOMERS) == name


def test_phonetic_key_is_script_independent():
    assert phonetic_key("राहुल") == phonetic_key("રાહુલ") == phonetic_key("Rahul")


# ---------------------------------------------------------------- conversation
def test_asks_for_missing_amount_then_continues():
    chat = Chat()
    d = chat.say("Rahul ko udhar likho")
    assert d["confirmation_required"] is False
    assert chat.ctx["pending"]["missing"] == ["amount"]
    d = chat.say("5000")
    assert d["intent"] == "add_udhar"
    assert d["confirmation_required"] is True
    assert d["extracted_data"]["customer_name"] == "Rahul Sharma"
    assert d["extracted_data"]["new_balance"] == 20000


def test_order_asks_for_total_instead_of_guessing():
    chat = Chat()
    d = chat.say("Add an order for Anjali, 10 kurtis on udhar")
    assert d["confirmation_required"] is False
    assert chat.ctx["pending"]["missing"] == ["total_amount"]
    d = chat.say("8000")
    assert d["confirmation_required"] is True
    assert d["extracted_data"]["customer_name"] == "Anjali Gupta"
    assert d["extracted_data"]["total_amount"] == 8000


def test_pronoun_uses_last_customer():
    chat = Chat("hi-IN")
    chat.say("प्रिया का कितना बाकी है")
    d = chat.say("उसका कितना बाकी है?")
    assert d["intent"] == "check_balance"
    assert d["extracted_data"]["customer_name"] == "Priya Patel"


@pytest.mark.parametrize("text,lang,intent", [
    ("राहुल ने 3000 दिए", "hi-IN", "record_payment"),   # Rahul gave -> payment
    ("प्रिया को 2000 दिए", "hi-IN", "add_udhar"),       # gave to Priya -> udhar
    ("રાહુલે 2000 આપ્યા", "gu-IN", "record_payment"),
    ("રાહુલને 2000 આપ્યા", "gu-IN", "add_udhar"),
    ("Rahul ne 500 diye", "en-IN", "record_payment"),
    ("Rahul ko 500 diye", "en-IN", "add_udhar"),
])
def test_who_gave_whom(text, lang, intent):
    assert Chat(lang).say(text)["intent"] == intent


def test_replies_follow_selected_language():
    d = Chat("gu-IN").say("રાહુલને 1500 ઉધાર લખો")
    assert "ઉધાર" in d["confirmation_prompt"]
    d = Chat("hi-IN").say("किसका कितना बाकी है?")
    assert d["intent"] == "list_dues" and "बाकी" in d["spoken_response"]


def test_rahul_ka_hisaab_is_a_balance_question():
    assert Chat().say("Priya ka hisaab")["intent"] == "check_balance"
    assert Chat().say("Aaj ka hisaab")["intent"] == "show_business_summary"


def test_undo_last_entry_by_voice():
    chat = Chat()
    before = balance("Suresh Verma")
    chat.yes(chat.say("Suresh ko 900 udhar likho"))
    assert balance("Suresh Verma") == before + 900
    d = chat.say("galti ho gayi, hata do")
    assert d["intent"] == "undo_last" and d["confirmation_required"] is True
    chat.yes(d)
    assert balance("Suresh Verma") == before


def test_small_talk():
    assert Chat().say("namaste")["intent"] == "greet"
    assert Chat("gu-IN").say("આભાર")["intent"] == "thanks"
    assert Chat().say("blah blah")["intent"] == "unknown"


# ---------------------------------------------------------------- voice signatures
def _sign(entry_id, audio=FAKE_AUDIO):
    return client.post(
        f"/api/khata/entries/{entry_id}/signature",
        files={"audio": ("sig.webm", audio, "audio/webm;codecs=opus")},
        data={"duration_ms": "3200", "phrase": "Haan, maine 700 udhar liye", "language": "hi-IN"},
    )


def test_voice_signature_flow_and_tamper_evidence():
    chat = Chat()
    res = chat.yes(chat.say("Vikram ko 700 udhar likho"))
    req = res["executed_result"]["signature_request"]
    assert req["first_name"] == "Vikram" and "700" in req["phrase"]

    r = _sign(req["entry_id"])
    assert r.status_code == 200, r.text
    sig = r.json()["data"]
    assert len(sig["audio_sha256"]) == 64

    # Playback returns the exact bytes
    audio = client.get(sig["audio_url"])
    assert audio.status_code == 200 and audio.content == FAKE_AUDIO

    # Cannot sign twice, cannot delete a signed entry, cannot undo it by voice
    assert _sign(req["entry_id"]).status_code == 409
    assert client.delete(f"/api/khata/entries/{req['entry_id']}").status_code == 409
    assert "signature" in chat.say("galti ho gayi, hata do")["spoken_response"]

    # The proof is retrievable by voice
    d = chat.say("Vikram ka saboot sunao")
    assert d["intent"] == "play_proof"
    assert d["extracted_data"]["proofs"][0]["id"] == sig["id"]

    # Ledger shows the signature on the entry
    cust_id = d["extracted_data"]["customer_id"]
    entries = client.get(f"/api/khata/{cust_id}").json()["data"]["entries"]
    assert entries[0]["signature"]["id"] == sig["id"]

    assert client.get("/api/signatures/verify").json()["data"]["valid"] is True

    # Someone edits the signed amount directly in the database -> chain breaks
    conn = get_db_connection()
    conn.execute("UPDATE ledger_entries SET amount = 70 WHERE id = ?", (req["entry_id"],))
    conn.commit()
    result = client.get("/api/signatures/verify").json()["data"]
    assert result["valid"] is False
    assert "edited" in " ".join(result["problems"])
    conn.execute("UPDATE ledger_entries SET amount = 700 WHERE id = ?", (req["entry_id"],))
    conn.commit()

    # Someone swaps the recording -> chain breaks
    conn.execute("UPDATE voice_signatures SET audio = ? WHERE id = ?", (b"fake", sig["id"]))
    conn.commit()
    conn.close()
    result = client.get("/api/signatures/verify").json()["data"]
    assert result["valid"] is False and "recording was altered" in result["problems"]


def test_signature_rejects_non_audio():
    chat = Chat()
    res = chat.yes(chat.say("Anjali ko 300 udhar likho"))
    entry_id = res["executed_result"]["signature_request"]["entry_id"]
    r = client.post(f"/api/khata/entries/{entry_id}/signature",
                    files={"audio": ("x.html", b"<script>", "text/html")})
    assert r.status_code == 400
