# 🎙️ VyaparVaani: Vaani, the voice munim for Indian shops

> **Build for Bharat · Livelihoods and small business**
>
> ### *The first khata where the customer's own voice is the signature.*

VyaparVaani lets a shopkeeper run their khata (credit ledger), bills and reminders **by talking**, in
**English, Hindi, Gujarati, or a mix of them in one sentence**. When udhar is given, the **customer
confirms it in their own voice**. The recording is sealed with a tamper-evident fingerprint and can be
played back the day they say *"maine kab liya?"*.

It runs on the phone the shop already has, needs **no API keys**, and one server can host many shops,
each with **its own login and its own isolated database**.

| | |
|---|---|
| 🚀 Run it | `docker compose up --build` → http://localhost:3000 |
| 🔑 Demo logins | Shop login (`/`): cloth shop `nandani` / `nandani@123` · kirana `patel` / `patel@123` (or tap the demo buttons) · Admin login (`/#/admin`): `admin` / `admin@123` |
| 📚 Docs | [User guide](docs/USER_GUIDE.md) · [Admin guide](docs/ADMIN_GUIDE.md) · [Deployment](docs/DEPLOYMENT.md) · [Architecture](docs/ARCHITECTURE.md) · [API](docs/API.md) · [Security](docs/SECURITY.md) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) |
| 📊 Pitch deck | [pitch_deck.pdf](pitch_deck.pdf) |

---

## The problem

Most small-shop business in India runs on **udhar**. Apps digitised the notebook, but the real pain is the
**dispute**: *"Maine kab liya?"*, *"Itna nahi tha!"*. Many customers can't read or sign, so the khata is the
shopkeeper's word against theirs. And the shopkeeper's hands are busy, so typing at the counter doesn't happen.

## What Vaani does

| The shopkeeper says | Vaani |
|---|---|
| "Rahul ko udhar likho" | *"How many rupees?"* (asks for what is missing, never guesses) |
| "5000" → "Haan ji" | Saves it hands-free, then asks the customer: *"Rahul ji, please say: Yes, I have taken ₹5,000 on udhar"*, records them, and seals the clip |
| "Rahul ka saboot sunao" | Plays Rahul's own voice, with date and fingerprint, and shares it to WhatsApp |
| "राहुल ने 3000 दिए" / "प्रिया को 2000 दिए" | **ने** = Rahul paid you · **को** = you gave Priya udhar |
| "Rahul deposited 2000" / "add money" / "जमा" / "ડિપોઝિટ" | All mean *money received* |
| "Anjali ne pura hisaab clear kar diya" | Settles her whole balance |
| "Priya ke liye bhi" / "aur 500" | Repeats the last action for Priya / with a new amount |
| "उसका कितना बाकी है?" | Remembers who you were talking about |
| "कल सुबह 10 बजे राहुल से पैसे लेने हैं, याद दिलाना" | At 10 AM it **rings, speaks, vibrates and notifies**, with **Call** and **WhatsApp** buttons |
| "આજનો હિસાબ" | Today's sales, udhar given, cash collected and who to chase tomorrow, in Gujarati |
| "I want to make sure Rahul has received…" said with Hindi selected | Understands the English (even when Chrome writes it as "आई वांट टू…"), **replies in English and switches the app** |

### What makes it different

1. **Voice signature.** The customer's spoken "haan" is the proof. A typing app can't copy this.
2. **Tamper-evident, without keys or blockchain.** Every recording is SHA-256 fingerprinted and hash-chained. Editing a signed amount, swapping a recording or deleting one shows **"Tampering detected"**. Signed entries can't be deleted, only balanced.
3. **Mixed-language understanding.** English, हिन्दी, ગુજરાતી, Hinglish and Gujlish. English words written in Indic script, Gujarati heard by a Hindi recogniser, spoken numbers (*पांच हजार*, *dedh lakh*, *સાડા ત્રણ હજાર*), and names in any script (राहुल / રાહુલે / Raahul → *Rahul Sharma*).
4. **A real conversation.** Tap once and keep talking; the mic reopens after each reply until you go quiet. Vaani asks follow-up questions, lets you interrupt, undoes mistakes, and keeps the chat across reloads.
5. **Built for shopkeepers.** Every screen switches language. A plain **Today** screen replaces dashboards, and buttons are big and thumb-friendly on phones.
6. **Multi-shop platform.** An admin console creates shops and logins, pauses shops and resets passwords. Each shop's data lives in **its own database file**.

## Run it

### One command (Docker), how judges run it
```bash
docker compose up --build
```
Open **http://localhost:3000** and tap a demo login. No `.env`, no keys.

### Development
```bash
cd backend && pip install -r requirements.txt && python -m uvicorn app.main:app --port 8000
```
```bash
cd frontend && npm install && npm run dev        # http://localhost:3000
```
On a phone (the mic needs https): `cd frontend && npm run phone`, then open the `https://192.168…:3000` address.
Details: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Online
- **GitHub Pages** hosts the web app (static). Workflow: [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
- **Render** (or any Docker host) runs the API server. Blueprint: [`render.yaml`](render.yaml)

GitHub Pages can't run the Python server, so the two are connected with one setting (`API_BASE_URL`). Step by step: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#3-github-pages--render).

## Tests

```bash
cd backend && python -m pytest -q     # 143 tests
```
They cover:
- Conversations in three languages, mixed-language detection, synonyms, follow-ups and reminders
- Voice signatures and the tamper checks
- Logins, lockout, hashed passwords, admin actions
- **Shop isolation**: a shop can't see, query by voice, or play the recordings of another shop

CI runs the tests, the frontend build and the Docker build on every push.

## Tech

React 19 + TypeScript + Tailwind (PWA) · Web Speech API (speech ↔ text) · MediaRecorder (voice signatures) ·
FastAPI (Python) · SQLite (one file per shop) · Docker. **No paid AI service, no API keys.**
Why and how: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Honest limitations

- The language engine is rule-based. It handles shop vocabulary in three languages well, but not open chit-chat.
- Speech-to-text quality depends on the phone's browser. Chrome on Android is best for Hindi and Gujarati, and it needs internet; typing works offline.
- Reminders ring while the app is open (on screen or in the background). Ringing when the app is fully closed needs push notifications, planned next.
- A voice signature is evidence the merchant can play back. It is not a claim of legal enforceability, and the customer's spoken "haan" is their consent to be recorded.
