# Contributing

## Setup

```bash
cd backend && pip install -r requirements.txt
cd frontend && npm install
```
Run both as in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#2-development-without-docker).

## Checks (the same as CI)

```bash
cd backend && python -m pytest -q          # 143 tests
cd frontend && npm run build               # type-check + production build
cd frontend && npm run lint                # oxlint
docker compose build                       # the image judges run
```

## Where things live

```
backend/app/
  main.py               app, CORS, routers, serves the built web app
  config.py             settings (env vars)
  security.py           login → which shop's database
  database/db.py        per-shop SQLite: schema, migrations, demo data
  database/platform.py  shops, users, sessions, password hashing
  routers/              HTTP endpoints
  services/             language engine, agent, khata, signatures, reminders
backend/tests/          pytest (conftest.py logs in as the demo shop)
frontend/src/
  App.tsx               login gate and shop layout
  components/           screens
  hooks/                voice and recording
  services/             API client, auth, admin
  utils/                i18n (all UI text), speech, WhatsApp, sounds
docs/                   guides
```

## Adding words Vaani understands

- Intents and keywords: `backend/app/services/nlp_parser.py` (word lists at the top).
- English words as Hindi or Gujarati recognisers write them: `EN_IN_SCRIPT` in `services/language.py`.
- What Vaani says: `services/replies.py` (add all three languages).
- App text: `frontend/src/utils/i18n.ts` (add `en`, `hi` and `gu`).
- Add a test with the real sentence to `backend/tests/`.

## Rules of thumb

- Every shop-data query goes through `get_db_connection()` (never open a database path yourself in a router).
- No API keys and no paid services in the default path.
- Money changes always need a confirmation (spoken or tapped).
