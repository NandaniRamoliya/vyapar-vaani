"""Accounts, admin, and shop data isolation."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.language import detect_language, latinize, match_script
from conftest import login, reset_demo_shop, shop_client


@pytest.fixture(scope="module", autouse=True)
def fresh():
    reset_demo_shop()
    reset_demo_shop("shop_patel", seed="kirana")
    yield


anon = TestClient(app)
nandani = shop_client()
patel = shop_client("patel", "patel@123")
admin = TestClient(app)
admin.headers["Authorization"] = f"Bearer {login(admin, 'admin', 'admin@123')}"


def names(client):
    return {a["customer_name"] for a in client.get("/api/khata").json()["data"]["accounts"]}


# ---------------------------------------------------------------- login
def test_shop_data_needs_login():
    for path in ["/api/khata", "/api/customers", "/api/orders", "/api/reminders", "/api/dashboard/today", "/api/voice/history"]:
        assert anon.get(path).status_code == 401, path
    assert anon.get("/api/health").status_code == 200


def test_wrong_password_and_lockout():
    for _ in range(8):
        assert anon.post("/api/auth/login", json={"login": "lockme", "password": "x"}).status_code == 401
    assert anon.post("/api/auth/login", json={"login": "lockme", "password": "x"}).status_code == 429


def test_passwords_are_never_stored_in_plain_text():
    from app.database import platform
    conn = platform.connect()
    hashes = [r[0] for r in conn.execute("SELECT password_hash FROM users")]
    conn.close()
    assert all(h.startswith("pbkdf2_sha256$") and "nandani@123" not in h for h in hashes)


def test_me_and_logout():
    c = shop_client()
    me = c.get("/api/auth/me").json()["data"]
    assert me["user"]["role"] == "shopkeeper" and me["shop"]["name"] == "Nandani Textiles"
    c.post("/api/auth/logout")
    assert c.get("/api/auth/me").status_code == 401


# ---------------------------------------------------------------- isolation
def test_each_shop_sees_only_its_own_customers():
    assert "Rahul Sharma" in names(nandani) and "Rahul Sharma" not in names(patel)
    assert "Imran Khan" in names(patel) and "Imran Khan" not in names(nandani)


def test_voice_cannot_reach_another_shop():
    d = patel.post("/api/voice/process", json={"transcript": "How much does Rahul owe me?"}).json()["data"]
    assert d["extracted_data"].get("found") is False


def test_new_data_stays_in_its_shop():
    nandani.post("/api/customers", json={"name": "Secret Customer", "phone": "9999999999"})
    assert "Secret Customer" in names(nandani)
    assert "Secret Customer" not in names(patel)
    assert all(c["name"] != "Secret Customer" for c in patel.get("/api/customers").json()["data"])


def test_ids_from_another_shop_are_useless():
    # Nandani's customer id 'cust_1' does not exist in Patel's database
    assert patel.get("/api/khata/cust_1").status_code == 404
    r = patel.post("/api/khata/entries", json={"customer_id": "cust_1", "entry_type": "credit", "amount": 100})
    assert r.status_code == 404


def test_voice_signature_audio_is_private_to_its_shop():
    d = nandani.post("/api/voice/process", json={"transcript": "Priya ko 100 udhar likho"}).json()["data"]
    res = nandani.post("/api/voice/confirm", json={"interaction_id": d["interaction_id"], "confirmed": True}).json()["data"]
    entry = res["executed_result"]["signature_request"]["entry_id"]
    sig = nandani.post(f"/api/khata/entries/{entry}/signature",
                       files={"audio": ("s.webm", b"\x1aE\xdf\xa3" + b"x" * 2000, "audio/webm")}).json()["data"]
    assert nandani.get(sig["audio_url"]).status_code == 200
    assert patel.get(sig["audio_url"]).status_code == 404
    assert anon.get(sig["audio_url"]).status_code == 401


# ---------------------------------------------------------------- admin
def test_roles_are_separated():
    assert nandani.get("/api/admin/shops").status_code == 403
    assert admin.get("/api/khata").status_code == 403


def test_admin_creates_shop_with_one_time_password_and_empty_data():
    r = admin.post("/api/admin/shops", json={"name": "Shah General Store", "city": "Rajkot", "owner_name": "Kiran Shah", "login": "shah"})
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    assert data["login"] == "shah" and len(data["password"]) >= 8
    shah = shop_client("shah", data["password"])
    assert names(shah) == set()  # brand-new shop starts empty
    assert admin.post("/api/admin/shops", json={"name": "Dup", "login": "shah"}).status_code == 400

    shops = admin.get("/api/admin/shops").json()["data"]
    row = next(s for s in shops if s["owner_login"] == "shah")
    assert row["stats"]["customers"] == 0 and "password_hash" not in row


def test_suspend_and_reset_password():
    created = admin.post("/api/admin/shops", json={"name": "Pause Me", "login": "pauseme", "password": "start123"}).json()["data"]
    sid = created["shop"]["id"]
    c = shop_client("pauseme", "start123")
    assert c.get("/api/khata").status_code == 200

    admin.patch(f"/api/admin/shops/{sid}", json={"status": "suspended"})
    assert c.get("/api/khata").status_code in (401, 403)
    assert anon.post("/api/auth/login", json={"login": "pauseme", "password": "start123"}).status_code == 403

    admin.patch(f"/api/admin/shops/{sid}", json={"status": "active"})
    new = admin.post(f"/api/admin/shops/{sid}/reset-password").json()["data"]["password"]
    assert anon.post("/api/auth/login", json={"login": "pauseme", "password": "start123"}).status_code == 401
    assert shop_client("pauseme", new).get("/api/khata").status_code == 200


def test_change_password():
    created = admin.post("/api/admin/shops", json={"name": "Pw Shop", "login": "pwshop", "password": "first123"}).json()["data"]
    c = shop_client("pwshop", "first123")
    assert c.post("/api/auth/change-password", json={"old_password": "wrong", "new_password": "second123"}).status_code == 400
    assert c.post("/api/auth/change-password", json={"old_password": "first123", "new_password": "second123"}).status_code == 200
    assert shop_client("pwshop", "second123")
    assert created


def test_admin_overview_counts_all_shops():
    o = admin.get("/api/admin/overview").json()["data"]
    assert o["shops"] >= 2 and o["customers"] >= 7


# ---------------------------------------------------------------- mixed language
@pytest.mark.parametrize("text,lang", [
    ("आई वांट टू मेक श्योर देट राहुल शर्मा हैज़ रिसीव्ड", "en-IN"),   # English said to a Hindi recogniser
    ("How much does Rahul owe me?", "en-IN"),
    ("राहुल का कितना बाकी है", "hi-IN"),
    ("રાહુલના કેટલા બાકી છે", "gu-IN"),
    ("राहुल ना केटला बाकी छे", "gu-IN"),                          # Gujarati said to a Hindi recogniser
    ("રાહુલ કા કિતના બાકી હૈ", "hi-IN"),                          # Hindi said to a Gujarati recogniser
    ("haan", None), ("5000", None), ("Rahul ko 5000 udhar likho", None),  # too little to switch
])
def test_detect_language(text, lang):
    assert detect_language(text) == lang


def test_latinize_and_script_match():
    assert latinize("राहुल ने 500 डिपॉजिट किए") == "राहुल ने 500 deposit किए"
    assert match_script("राहुल ना केटला बाकी छे", "gu-IN") == "રાહુલ ના કેટલા બાકી છે"


@pytest.mark.parametrize("text,selected,reply,intent", [
    ("आई वांट टू मेक श्योर देट राहुल शर्मा हैज़ रिसीव्ड", "hi-IN", "en-IN", "record_payment"),
    ("राहुल ना केटला बाकी छे", "hi-IN", "gu-IN", "check_balance"),
    ("How much does Rahul owe me?", "gu-IN", "en-IN", "check_balance"),
    ("રાહુલને થ્રી થાઉઝન્ડ ઉધાર લખો", "gu-IN", "gu-IN", "add_udhar"),
])
def test_vaani_answers_in_the_language_spoken(text, selected, reply, intent):
    d = nandani.post("/api/voice/process", json={"transcript": text, "language": selected}).json()["data"]
    assert d["reply_language"] == reply and d["intent"] == intent


def test_auto_language_can_be_turned_off():
    d = nandani.post("/api/voice/process", json={"transcript": "How much does Rahul owe me?", "language": "hi-IN",
                                                  "auto_language": False}).json()["data"]
    assert d["reply_language"] == "hi-IN"
