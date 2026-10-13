# Divine Energy Hub — Event Management 2026

Volunteer QR scanning + admin live counts for venue Wi‑Fi that is often slow.

## Architecture

| Layer | Role |
|-------|------|
| **MongoDB** | Live source of truth (guests, entry, prasad) |
| **Flask API** (`:8080`) | Fast scan/lookup/stats; Sheets sync is write-behind only |
| **React app** | Scanners + Admin Live Monitor (10s refresh) |
| **Google Sheets** | Batch mirror from Mongo — never used for live scan lookups |
| **IndexedDB + outbox** | Offline / slow-network cache and queued updates |

## Quick start

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
copy ..\.env.example .env   # then set MONGO_URI (required)
python app.py
```

API: `http://localhost:8080/api/health`

### 2. Frontend

```bash
npm install
# set REACT_APP_API_URL=http://localhost:8080 in .env.local
npm start
```

App: `http://localhost:3000` · Admin monitor: `/admin`

### 3. Import guests

```bash
# from repo root, with MONGO_URI set
python import_guests_data_to_db.py asthamashibir_dummy_data.csv
```

### 4. Google Sheets (optional mirror)

Set in `backend/.env`:

- `GOOGLE_SPREADSHEET_ID`
- `GOOGLE_SHEET_NAME=Guests`
- `GOOGLE_SERVICE_ACCOUNT_FILE` → path to service account JSON

Share the sheet with the service account email. Use **Sync Google Sheet** on the dashboard or Admin → Sync Sheets.

## Key API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/scan/<token>` | One-RTT guest + status (scanners) |
| GET | `/api/stats` | Accurate counts (admin, poll every 10s) |
| POST | `/api/prasad/entry` | Mark entry (idempotent) |
| POST | `/api/prasad/update` | Mark prasad1/2/3 (idempotent) |
| POST | `/api/users` | On-spot guest create |
| POST | `/api/update-sheet` | Batch Mongo → Sheets |

## Slow-network behaviour

- Scanners use a single `/api/scan` call (not 2–3 parallel calls).
- Guest profiles cached in IndexedDB; mutations queue offline and flush every 10s / on `online`.
- Photos prefer Mongo `photo` URL; Storage lookup is fallback and non-blocking.
- Admin marks data **stale** if a refresh takes longer than ~12s.

## Security note

Rotate any Mongo/SMTP credentials that were previously committed. Never put secrets in `.env.example`. Staff auth still needs Wave-2 hardening (hashed passwords + API auth).

## Scripts

- `start-all.bat` / `start-backend.bat` / `start-frontend.bat` — local Windows helpers
