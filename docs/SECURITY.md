# Security and privacy

## Accounts and logins

| What | How |
|---|---|
| Passwords | PBKDF2-HMAC-SHA256, 240,000 iterations, random 16-byte salt per user. Plain passwords are never stored or logged. |
| Admin view of passwords | Admins **cannot see** passwords. They can *reset* one; the new password is shown once to hand over. |
| Sessions | Random 256-bit tokens sent as `Authorization: Bearer`. Only the token's SHA-256 is stored, with an expiry (`SESSION_DAYS`). Logout, password reset and shop suspension end sessions. |
| Brute force | 8 wrong passwords per login per 10 minutes → HTTP 429. |
| Roles | `admin` can only use `/api/admin/*` (no shop data). `shopkeeper` can only use their own shop's endpoints. |
| Paused shops | Can't log in, and existing sessions are rejected (403). |
| Secrets | None required. `ADMIN_PASSWORD` should be set for real deployments (`.env` is git-ignored). |

## Shop data isolation

Each shop has its **own SQLite file**. The server picks the file only from the logged-in user's account
(`app/security.py` → `ContextVar`), never from the request body or URL. Without a selected shop, database
access raises an error instead of falling back to anything shared. Tests prove a shop can't read another shop's
customers, khata, voice answers or recordings (`backend/tests/test_platform.py`).

The admin console shows **counts** (customers, bills, udhar total, activity), not customer names or recordings.

## Voice signatures

- The customer's recording is stored inside the shop's database with `audio_sha256 = SHA-256(audio)`.
- Each signature also stores `chain_hash = SHA-256(previous chain | entry | customer | amount | time | audio hash)`.
- `GET /api/signatures/verify` recomputes everything: an edited amount, a replaced recording, or a deleted or
  re-ordered signature is reported with the customer's name.
- Signed entries can't be deleted or undone through the app; the ledger is balanced with a new entry instead.
- Audio is served only with the shop's login token (no public URLs).
- Uploads are limited to audio types and 3 MB.

**What it is and isn't:** a recording the shopkeeper can play back, made with the customer's spoken consent, and
tamper-*evident* (not tamper-proof against someone with full server access, who could rebuild the whole chain).
It is not a claim of legal enforceability.

## Speech and privacy

- Speech-to-text is the browser's built-in engine. In Chrome that is Google's speech service, so spoken audio
  goes to Google while the mic is on. Other browsers may process on the device.
- Vaani's voice (text-to-speech) is on the device.
- The app uses no analytics, ads, or third-party AI APIs.

## Web

- CORS: `CORS_ORIGINS` (default `*`). Tokens aren't cookies, so cross-site request forgery doesn't apply;
  credentials mode is off.
- Static file serving resolves paths and refuses anything outside the built app (path traversal returns the app page).
- Serve over **https** in production (also required for the microphone on phones).

## Reporting a problem

Please open a private security advisory on GitHub (Security → Report a vulnerability) instead of a public issue.
