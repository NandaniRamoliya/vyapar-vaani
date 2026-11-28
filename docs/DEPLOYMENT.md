# Deployment

VyaparVaani is one Python server (FastAPI) and one web app (React). The Docker image contains both and
serves everything on **one port**. Nothing needs an API key.

- [1. Docker (one command)](#1-docker-one-command)
- [2. Development without Docker](#2-development-without-docker)
- [3. GitHub Pages + Render](#3-github-pages--render)
- [4. Configuration reference](#4-configuration-reference)
- [5. Data, backups and upgrades](#5-data-backups-and-upgrades)
- [6. Going live with real shops](#6-going-live-with-real-shops)

---

## 1. Docker (one command)

```bash
docker compose up --build
```

Open **http://localhost:3000**. No `.env` file is needed. On first start the server creates:

| Login | Password | What it is |
|---|---|---|
| `admin` | `admin@123` | Platform admin (all shops) |
| `nandani` | `nandani@123` | Demo cloth shop "Nandani Textiles" |
| `patel` | `patel@123` | Demo kirana "Patel Kirana Store" |

All data (accounts and every shop's database) lives in the Docker volume `vaani-data`, so it survives restarts.
To start from scratch: `docker compose down -v`.

## 2. Development without Docker

```bash
# Terminal 1: API on :8000 (data in backend/data/)
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
```

```bash
# Terminal 2: web app on :3000 (proxies /api to :8000)
cd frontend
npm install
npm run dev
```

On Windows, `run_app.bat` starts both.

### Voice on a real phone (same Wi-Fi)

Phones only allow the microphone on **https** (or localhost). The phone mode serves the dev app over https with a
self-signed certificate:

```bash
cd frontend
npm run phone
```

Open the `Network: https://192.168.x.x:3000` address on the phone, accept the certificate warning once
(**Advanced → Proceed**), then Chrome menu → **Add to Home screen**. Windows: `start_phone.bat`.

## 3. GitHub Pages + Render

**GitHub Pages only serves static files.** It can host the web app, but not the Python server that keeps
logins and shop data. So:

```
https://<you>.github.io/vyapar-vaani/   (web app, GitHub Pages)
        │  API calls with the login token
        ▼
https://vyapar-vaani.onrender.com        (API server, Docker on Render)
```

### Step 1: the server on Render (free plan works for demos)

1. Sign in at https://render.com with GitHub → **New → Blueprint** → pick this repository.
   Render reads [`render.yaml`](../render.yaml) and builds the Docker image.
2. After the first deploy, open the service → **Environment** and note `ADMIN_PASSWORD`
   (it was generated for you). Log in with `admin` and that password.
3. Check `CORS_ORIGINS` is your Pages address (`https://<you>.github.io`).

> ⚠️ Render's **free plan has no persistent disk**: data resets when the service restarts or redeploys, and the
> service sleeps after inactivity (the first request then takes about a minute). That's fine for a demo. For real
> shops, add a disk mounted at `/data` (see the commented block in `render.yaml`) or use any Docker host with
> a volume.

The Render URL also serves the full app by itself (same image), so it can be your live link on its own.

### Step 2: the web app on GitHub Pages

1. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables → New variable**:
   `API_BASE_URL` = your Render URL (e.g. `https://vyapar-vaani.onrender.com`, no trailing slash).
3. Push to `main` (or run the **Deploy to GitHub Pages** workflow by hand).
   [`pages.yml`](../.github/workflows/pages.yml) builds with the right base path (`/<repo>/`) and publishes.

If `API_BASE_URL` isn't set, the login screen shows a **Server address** box where anyone can type the server URL.

## 4. Configuration reference

All optional. Put them in `.env` (Docker) or `backend/.env` (local). See [`.env.example`](../.env.example).

| Variable | Default | Meaning |
|---|---|---|
| `DATA_DIR` | `data` (Docker: `/data`) | Where `platform.db` and `shops/<shop>.db` live |
| `ADMIN_LOGIN` | `admin` | First admin's login (created once) |
| `ADMIN_PASSWORD` | `admin@123` | First admin's password. **Change it** (or change it after logging in) |
| `SEED_DEMO` | `true` | Create the two demo shops on first start |
| `SESSION_DAYS` | `30` | How long a login lasts |
| `CORS_ORIGINS` | `*` | Comma-separated sites allowed to call the API (your Pages URL) |
| `PORT` / `HOST` | `3000` / `0.0.0.0` | Where the server listens (Render sets `PORT`) |
| `DATABASE_PATH` | `vyapar_vaani.db` | Only for upgrading: a pre-2.0 single-shop file, imported into the first demo shop |

Web app build variables ([`frontend/.env.example`](../frontend/.env.example)):

| Variable | Meaning |
|---|---|
| `VITE_API_BASE` | Server URL when the app is hosted separately (GitHub Pages) |
| `VITE_BASE` | Base path, e.g. `/vyapar-vaani/` for Pages (set by the workflow) |
| `VITE_HIDE_DEMO` | `true` hides the demo-login buttons |

## 5. Data, backups and upgrades

```
DATA_DIR/
├── platform.db            shops, users (hashed passwords), login sessions
└── shops/
    ├── shop_nandani.db    everything of one shop: customers, khata, bills, reminders,
    └── shop_patel.db      voice log and voice-signature recordings
```

- **Backup:** copy `DATA_DIR` (SQLite files can be copied while the server is stopped, or with `sqlite3 file ".backup out.db"`).
- **Restore one shop:** replace only that shop's file.
- **Upgrades:** new columns and tables are added automatically on start. A pre-2.0 single-shop
  `vyapar_vaani.db` becomes the first demo shop's database.

## 6. Going live with real shops

1. Set `SEED_DEMO=false` before the first start (or pause and ignore the demo shops).
2. Set a strong `ADMIN_PASSWORD`, then log in and change it again from the admin console.
3. Build the web app with `VITE_HIDE_DEMO=true`.
4. Put the server behind https (Render, Fly.io, Railway, or your own server behind Caddy or Nginx).
5. Back up `DATA_DIR` daily.
