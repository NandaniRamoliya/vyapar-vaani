# Architecture

```
Phone / browser: React 19 + TypeScript + Tailwind (installable PWA)
 ├─ Web Speech API: speech → text (en-IN / hi-IN / gu-IN) and Vaani's voice (speech synthesis)
 ├─ MediaRecorder + Web Audio: the customer's voice signature, auto-stops on silence
 ├─ Service worker: reminder notifications on the phone
 └─ VoiceAgent screen: conversation, context memory, hands-free loop, language auto-switch
                │  HTTPS + Bearer token
                ▼
FastAPI (Python 3.12), stateless
 ├─ security.py           who is calling → which shop's database this request may open
 ├─ routers/              auth, admin, voice, khata, signatures, orders, customers, reminders, dashboard
 └─ services/
     ├─ language.py       mixed-language: English in Indic script, language detection, script fixing
     ├─ indic.py          Indic digits and number words, transliteration, fuzzy names
     ├─ nlp_parser.py     intents and entities (udhar, payment, orders, reminders, proof, undo, …)
     ├─ agent.py          dialogue: follow-ups, memory, continuations, replies in 3 languages
     ├─ replies.py        everything Vaani says (en/hi/gu, several phrasings each)
     ├─ when.py           "in 10 minutes", "kal subah 10 baje", "કાલે સાંજે 5 વાગ્યે"
     ├─ khata.py          balances, ledger, customer matching
     ├─ signatures.py     SHA-256 + hash chain, verification
     └─ reminders.py      due times, details for alerts
                │
                ▼
SQLite: platform.db (shops, users, sessions) + shops/<shop_id>.db (one file per shop)
```

## A spoken sentence, end to end

1. The browser hears *"आई वांट टू मेक श्योर देट राहुल शर्मा हैज़ रिसीव्ड"* (English said with Hindi selected).
2. `POST /api/voice/process` with the text, the selected language, the conversation `context` and the phone's clock.
3. `language.detect_language` sees English words written in Devanagari and answers **en-IN**.
   `latinize` turns them back into English, and `match_script` fixes Gujarati written in Devanagari (and vice versa).
4. `indic.normalize_numbers` turns spoken numbers into digits. `nlp_parser` finds the intent (`record_payment`).
   `agent` matches *राहुल शर्मा* to the customer *Rahul Sharma*, notices the amount is missing, and asks
   *"How much for Rahul?"*. It stores the half-finished request in `context.pending`.
5. The reply comes back with `reply_language: en-IN`. The app speaks it, switches its own language and the
   microphone to English, and (hands-free) listens again.
6. "3000" fills the missing amount. Vaani reads back the balance before and after and waits for a yes/no
   (spoken or tapped). `POST /api/voice/confirm` saves it.
7. For udhar, the reply includes a `signature_request`. The app asks the customer to speak, records them,
   and uploads the clip to `POST /api/khata/entries/{id}/signature`, where it is hashed and chained.

## Why these choices

| Choice | Why |
|---|---|
| Rule-based language engine, no LLM | Runs without keys or cost, is predictable for money entries, and is fast on a ₹100/month server. Shop vocabulary is small enough to cover well. |
| Browser Web Speech API | Free, already on every Android phone, supports hi-IN and gu-IN. Typing is the fallback. |
| Server stateless, conversation memory kept on the phone | Any server instance can answer any request; easy to host. |
| One SQLite file per shop | The strongest isolation that's still simple: a shop's request can only open its own file. Easy per-shop backup, restore and deletion. |
| Hash chain for signatures | Tamper evidence with standard cryptography and no blockchain. |
| Docker, one port | Judges and shops start everything with one command. |

## Multi-tenancy

- `security.shop_user` (an async FastAPI dependency) reads the Bearer token, loads the user, and puts *that
  user's shop database path* into a `ContextVar`. FastAPI copies the request's context into the worker thread
  that runs the endpoint.
- `db.get_db_connection()` opens only the path in that `ContextVar`. With none set, it raises instead of falling
  back to anything shared.
- The admin uses `shop_context(shop_id)` only to compute counts (customers, udhar, activity) for the console.
- Tests in `backend/tests/test_platform.py` prove that shops can't read each other's customers, ledger,
  voice answers or signature audio, and that an id from another shop is meaningless (404).

## Frontend map

| File | Role |
|---|---|
| `App.tsx` | Login gate → `AdminApp` or the shop app; tab layout; reminder alerts |
| `components/VoiceAgent.tsx` | The conversation screen |
| `components/TodayTab, KhataTab, RemindersTab, OrdersTab, CustomersTab, VoiceHistoryTab, SettingsTab` | Shop screens |
| `components/LoginScreen.tsx`, `components/AdminApp.tsx` | Login and the platform console |
| `components/ReminderAlerts.tsx` | Polls due reminders; rings, speaks, notifies |
| `hooks/useVoice.ts`, `hooks/useRecorder.ts` | Speech recognition/synthesis, voice-signature recording |
| `services/auth.ts`, `services/api.ts`, `services/admin.ts` | Session, server address, API calls |
| `utils/i18n.ts`, `utils/lang.ts` | All UI text in en/hi/gu; voice-screen strings |
