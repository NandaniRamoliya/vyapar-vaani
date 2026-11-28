# API reference

Interactive docs: `http://<server>/docs` (Swagger) and `/redoc`.

All responses look like `{ "success": true, "message": "...", "data": ... }`. Errors use HTTP status codes with
`{ "detail": "..." }`.

**Auth:** send `Authorization: Bearer <token>` (from `/api/auth/login`).
Shop endpoints need a *shopkeeper* token and only ever see that shop's data. Admin endpoints need an *admin* token.

## Login

| Method | Path | Body / notes |
|---|---|---|
| POST | `/api/auth/login` | `{login, password}` → `{token, user, shop}`. 8 wrong tries per login per 10 min → 429 |
| GET | `/api/auth/me` | Current user and shop |
| POST | `/api/auth/logout` | Ends this session |
| POST | `/api/auth/change-password` | `{old_password, new_password}` (6+ chars) |

## Admin (admin token)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/overview` | Totals across shops (counts only) |
| GET | `/api/admin/shops` | Shops with owner login, status, last login and counts |
| POST | `/api/admin/shops` | `{name, city, owner_name, phone, login, password?, with_demo_data}` → returns the password **once** (generated if not given) |
| PATCH | `/api/admin/shops/{id}` | `{name?, city?, owner_name?, phone?, status: "active" \| "suspended"}`. Suspending logs the shop out |
| POST | `/api/admin/shops/{id}/reset-password` | New one-time password; logs the shop out |

## Voice (shop token)

### `POST /api/voice/process`
```json
{
  "transcript": "Rahul ko udhar likho",
  "language": "hi-IN",
  "context": {"last_customer": "Rahul Sharma", "pending": null, "last_action": null},
  "client_time": "2026-11-28T18:00:00",
  "auto_language": true,
  "auto_execute": false
}
```
Returns `intent`, `extracted_data`, `confirmation_required`, `confirmation_prompt`, `spoken_response`,
`interaction_id`, the updated `context` (send it back next time), `reply_language` (the language Vaani answered
in) and `detected_language`.

Intents: `add_udhar`, `record_payment`, `check_balance`, `list_dues`, `create_order`, `create_reminder`,
`add_customer`, `play_proof`, `undo_last`, `show_business_summary`, `list_orders`, `list_customers`,
`greet`, `thanks`, `help`, `unknown`.

### `POST /api/voice/confirm`
`{interaction_id, confirmed: true|false}` → executes once (a second confirm returns 409).
For udhar, `executed_result.signature_request` = `{entry_id, phrase, prompt, thanks, ...}`.

### `GET /api/voice/history`
Recent conversation log.

## Khata and voice signatures (shop token)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/khata` | Every customer's balance + totals |
| GET | `/api/khata/{customer_id}` | Ledger with running balance; signed entries include `signature` |
| POST | `/api/khata/entries` | `{customer_id or customer_name, entry_type: "credit"\|"payment", amount, note}` |
| DELETE | `/api/khata/entries/{id}` | 409 if the entry is voice-signed |
| POST | `/api/khata/entries/{id}/signature` | multipart: `audio` (webm/ogg/mp4/wav, ≤3 MB), `duration_ms`, `phrase`, `language` |
| GET | `/api/signatures/{id}/audio` | The recording (needs the token, so the app fetches it as a blob) |
| GET | `/api/signatures/verify` | Recomputes every hash: `{valid, checked, problems?}` |

## Shop data (shop token)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/dashboard/today?now=` | Plain "today" numbers, tasks, who to collect from, recent events |
| GET | `/api/dashboard/stats` | Totals and recent activity |
| GET / POST | `/api/orders` | List (filters `status`, `search`) / create (`payment_mode: "paid"\|"udhar"`) |
| PATCH | `/api/orders/{id}/status?status=` | `pending`, `confirmed`, `delivered`, `cancelled` |
| DELETE | `/api/orders/{id}` | Also removes its udhar entry; 409 if voice-signed |
| GET / POST | `/api/customers` | List / create |
| GET | `/api/customers/{id}` | Customer + orders |
| GET / POST | `/api/reminders` | List (with phone and balance) / create |
| GET | `/api/reminders/due?now=` | Pending reminders whose time has come |
| PATCH | `/api/reminders/{id}/toggle` | Done ↔ pending |
| PATCH | `/api/reminders/{id}/snooze?minutes=10&now=` | Later |
| DELETE | `/api/reminders/{id}` | |
| GET | `/api/settings` | App info |

## Public

`GET /api/health` → `{status: "healthy", ...}`
