# 🎙️ VyaparVaani: Vaani, the voice munim (व्यापार वाणी / વ્યાપાર વાણી)

> **Build for Bharat · Theme: Livelihoods and small business**
> **Participant:** Nandani Ramoliya
>
> ### *The first khata where the customer's own voice is the signature.*

---

## The problem nobody solved

Most small-shop business in India runs on **udhar** (credit). Apps like Khatabook digitised the notebook, but the real pain was never the writing. It's the **dispute**:

> *"Maine kab liya?"* · *"Itna nahi tha!"* · *"Aapne galat likha hoga."*

Many customers can't read or sign, so the khata is just the shopkeeper's word against theirs. And the shopkeeper's hands are busy (cutting cloth, packing, counting cash), so typing into an app at the counter doesn't happen anyway.

## What Vaani does

Vaani is a voice agent for the shop counter that talks like a person. It runs on the phone the shopkeeper already has, in **English, Hindi and Gujarati**.

| The shopkeeper says | Vaani does |
|---|---|
| "Rahul ko udhar likho" | *"Okay, Rahul. How many rupees?"* — asks for what's missing instead of guessing |
| "5000" | *"Rahul Sharma, ₹5,000 udhar. Balance becomes ₹20,000. Shall I write it?"* |
| "Haan ji" | Saves it hands-free, then turns to the customer: *"Rahul ji, to confirm, please say: Yes, I have taken ₹5,000 on udhar."* |
| *(customer speaks)* | Records the customer's voice, **seals it with a SHA-256 fingerprint** and attaches it to that khata entry |
| "Rahul ka saboot sunao" (weeks later) | *"Here is Rahul ji's own voice from 12 November, for ₹5,000"*, and plays it |
| "राहुल ने 3000 दिए" | Understands **ने** = Rahul paid (payment), vs **"प्रिया को 2000 दिए"** = you gave Priya credit (udhar) |
| "उसका कितना बाकी है?" | Remembers who you were just talking about |
| "ભૂલ થઈ ગઈ, કાઢી નાખો" | Undoes the last entry (but never a voice-signed one) |
| "આજનો હિસાબ" | Day's sales, udhar given, cash collected, and who to chase tomorrow, in Gujarati |

## Why this is new

1. **Voice Signature (bol ke khata, bol ke pakka).** The customer confirms udhar in their own voice, and it becomes playable proof that works for people who can't read or write. A typing app cannot copy this.
2. **Tamper-evident without blockchain or keys.** Every signature stores `SHA-256(audio)` and is **hash-chained** to the previous one (`chain = SHA-256(prev | entry | customer | amount | time | audio_hash)`). Editing a signed amount, swapping a recording, or deleting a signature breaks the chain, and the Khata tab shows **"Tampering detected"**. Signed entries cannot be deleted; you add a payment to balance them, just like a real ledger.
3. **A real conversation, not a form.** Follow-up questions, memory of the last customer ("uska"), barge-in (tap while it's speaking), spoken yes/no in three languages, natural pauses, and a different phrasing each time.
4. **Built for Bharat languages, offline-first.** A zero-key engine understands Hindi and Gujarati script **and** Hinglish:
   - Names in any script match the customer book: राहुल / રાહુલે / Raahul → *Rahul Sharma*
   - Spoken numbers become digits: *पांच हजार* → 5000, *dedh lakh* → 150000, *સાડા ત્રણ હજાર* → 3500
   - Grammar decides direction: *ne/ने/-એ* (they paid) vs *ko/को/-ને* (you gave)
5. **Phone-first.** Big thumb-reach mic, bottom navigation, installable as an app (PWA), share the voice proof straight to WhatsApp through the phone's share sheet, and reminders and receipts in the customer's language.

## 🔑 Zero secret keys

Clone and run. No API keys are needed and **none are used**: the language engine, the agent, the voice signatures and the hash chain are all local Python. Speech-to-text and text-to-speech use the browser's built-in Web Speech engines. Note that Chrome's speech recognition uses Google's service, so it needs internet; typing works offline.

---

## 🚀 Run it

### Laptop
```bash
# Terminal 1
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000
```
```bash
# Terminal 2
cd frontend
npm install
npm run dev
```
Open **http://localhost:3000** in Chrome or Edge. On Windows, `run_app.bat` does both.

### On a phone (recommended for the demo)
Phones only allow the microphone on **https**, so there is a phone mode:
```bash
cd frontend
npm run phone
```
1. Open the `Network: https://192.168.x.x:3000` address on the phone (same Wi-Fi). On Windows, `start_phone.bat` does this.
2. Accept the one-time certificate warning (**Advanced → Proceed**).
3. Chrome menu → **Add to Home screen**. Vaani now opens like an app.

Best on **Chrome for Android**, which has Hindi and Gujarati speech built in. Safari on iPhone works for English and Hindi.

---

## 🎬 2-minute demo script

1. **(0:00) Problem.** "In India, udhar runs on trust and a notebook. When a customer says *'maine kab liya?'*, the shopkeeper has no proof."
2. **(0:15) Hands-free entry.** Tap the mic once: *"Rahul ko udhar likho."* → Vaani: *"How many rupees?"* → *"5000"* → *"…Shall I write it?"* → *"Haan ji."* No more taps.
3. **(0:40) Voice signature.** Vaani asks the customer to confirm. A teammate (or a judge) says *"Haan, maine 5000 udhar liye."* The card turns green: **Voice-signed · #fingerprint**.
4. **(1:00) The dispute.** "Two weeks later Rahul says he never took it." → *"Rahul ka saboot sunao."* → **his own voice plays.** Tap **Share voice proof** → WhatsApp.
5. **(1:20) Bharat languages.** Switch to हिं: *"राहुल ने 3000 दिए"* → payment. Switch to ગુ: *"આજનો હિસાબ"* → full day summary in Gujarati.
6. **(1:40) Trust.** Open the Khata tab → **"tamper check passed"**. Explain the hash chain in one line. "Zero API keys. Runs on the phone you already have."

---

## 🧪 Tests

```bash
cd backend
python -m pytest -q        # 57 tests
```
They cover:
- Multi-turn conversations in English, Hindi and Gujarati
- Who-paid-whom grammar, pronoun memory, and undo
- Indic number words and cross-script name matching
- Voice-signature upload and playback, plus the tamper checks: an edited amount or a swapped recording breaks the chain
- No double-saving, and orders on udhar linked to the khata

## 🧱 Architecture

```
Phone / browser (React 19 + Tailwind, PWA)
  ├─ Web Speech API  ── speech → text (en-IN / hi-IN / gu-IN), text → speech
  ├─ MediaRecorder   ── customer's voice signature (auto-stops on silence)
  └─ VoiceAgent UI   ── keeps conversation context, sends it with every utterance
                                │  /api/voice/process  {transcript, language, context}
FastAPI (Python, stateless)     ▼
  ├─ services/indic.py      ── Indic digits, number words, transliteration, fuzzy names
  ├─ services/nlp_parser.py ── intents + entities (orders, udhar, payment, proof, undo, hisaab…)
  ├─ services/agent.py      ── dialogue: follow-up questions, memory, replies in 3 languages
  ├─ services/signatures.py ── SHA-256 + hash chain, verification
  └─ SQLite                 ── customers, orders, ledger_entries, voice_signatures, voice log
```

Key endpoints:

| Method | Endpoint |
|---|---|
| `POST` | `/api/voice/process`, `/api/voice/confirm` |
| `GET` | `/api/khata`, `/api/khata/{customer_id}` |
| `POST` | `/api/khata/entries/{id}/signature` |
| `GET` | `/api/signatures/{id}/audio`, `/api/signatures/verify` |

Full docs at `http://127.0.0.1:8000/docs`.

## Honest limitations

- The language engine is rule-based. It handles shop vocabulary well, but not arbitrary chit-chat.
- Speech recognition quality depends on the phone's browser. Hindi and Gujarati speech work best in Chrome (Android or desktop).
- A voice signature is **evidence the merchant can play back**. It is not a claim of legal enforceability, and the customer's spoken "haan" is their consent to be recorded.
