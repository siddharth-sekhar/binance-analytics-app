# Binance Analytics App

A full‑stack, real‑time analytics dashboard for Binance perpetual futures symbols. The backend ingests live trades from Binance WebSocket streams and computes time‑series analytics (OHLCV, hedge ratios, spreads, rolling z‑scores, ADF stationarity, correlations). The frontend (React + Vite + Plotly) visualizes prices, volumes, and pair analytics with a modern UI.

## Features

- Live ingestion from Binance fstreams (e.g., btcusdt, ethusdt)
- Upload NDJSON historical ticks and resample to OHLCV
- Resampling intervals: 1s, 1min, 5min (configurable in UI)
- Pair analytics: OLS hedge ratio (β, α), R², spread, rolling z‑score, rolling correlation
- ADF stationarity test for spread
- CSV export per symbol/timeframe
- Basic in‑memory alert rules API (no UI yet)
- WebSocket heartbeat with latest prices per symbol

## Tech Stack

- Backend: FastAPI, websockets, pandas, numpy, statsmodels, scipy, SQLite
- Frontend: React (Vite), Plotly.js, react‑plotly.js, axios

## Repository Structure

```
backend/          # FastAPI service, ingestion, analytics, storage
frotntend/        # React + Vite app (note the folder name is intentionally 'frotntend')
assets/           # Misc HTML/demo assets
```

Key backend files:
- `backend/app.py` — FastAPI routes and WebSocket
- `backend/ingestion.py` — Binance fstream ingestion (per‑symbol WS tasks)
- `backend/analytics.py` — Resampling & analytics (OLS, ADF, z‑score, corr)
- `backend/storage.py` — In‑memory DataFrames + SQLite tick persistence
- `backend/schemas.py` — Pydantic models for requests/responses
- `backend/requirements.txt` — Python dependencies

Key frontend files:
- `frotntend/src/App.jsx` — App shell, tabs, API base
- `frotntend/src/components/*` — Dashboard, charts, controls, ingestion panel
- `frotntend/vite.config.js` — Dev server host/port (5173)

## Prerequisites

- Windows PowerShell (v5+)
- Python 3.10+ (3.12 recommended)
- Node.js 18+ (Node 20+ recommended for Vite 7)

## Quick Start (local)

Run backend (http://localhost:8000):

```powershell
# From repo root
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn backend.app:app --reload --port 8000
```

Run frontend (http://localhost:5173):

```powershell
# In a new PowerShell window
cd frotntend
npm install
npm run dev
```

Open http://localhost:5173 in your browser. The app expects the backend at http://localhost:8000 (configured in `frotntend/src/App.jsx`).

## Using the App

1) Ingest live data
- Switch to the "Data Ingestion" tab
- Enter symbols (comma‑separated, lowercase) e.g. `btcusdt,ethusdt`
- Click "Start WebSocket Ingestion"
- The backend will open Binance fstream trade streams and start storing ticks

2) Explore analytics
- In the "Analytics Dashboard" tab, select symbols and timeframe
- View candlestick + volume charts
- If two symbols are selected, pair analytics (spread, z‑score, correlation) are shown

3) Export data
- Use the backend export endpoint to download CSV: `/api/export/{symbol}?timeframe=1s`

## API Reference (selected)

Base URL: `http://localhost:8000/api`

- POST `/ingest/start`
  - Body: `{ "mode": "ws", "symbols": ["btcusdt", "ethusdt"] }`
  - Starts WebSocket ingestion for the given symbols

- POST `/upload_ndjson`
  - Form file: `file` (NDJSON where each line is `{symbol, ts, price, size}`)
  - Loads historical ticks to storage/DB

- GET `/symbols`
  - Returns currently known symbols in memory

- GET `/resampled/{symbol}?timeframe=1s`
  - Returns OHLCV data resampled from raw ticks

- GET `/analytics/pair?x=btcusdt&y=ethusdt&timeframe=1s&roll_window=60`
  - Returns hedge ratio (β, α, R²), spread, z‑score, rolling correlation, ADF results

- GET `/export/{symbol}?timeframe=1s`
  - Streams CSV for download

- Alerts (prototype, no UI):
  - POST `/alerts` — add rule `{symbol_x, symbol_y, metric, op, threshold}`
  - GET `/alerts` — list rules
  - DELETE `/alerts/{id}` — remove rule

- WebSocket (server ➜ client):
  - `ws://localhost:8000/ws/live` — periodic heartbeat with latest prices, shape:
    ```json
    { "type": "heartbeat", "ts": 1730612345.12, "symbols": { "btcusdt": {"price": 64000.12} } }
    ```

## Data & Persistence

- Ticks are appended to a local SQLite DB file (default `backend_ticks.db` via `TickStorage(db_file="backend_ticks.db")` in `app.py`)
- In‑memory DataFrames are kept per symbol and trimmed to the last 7 days for memory control

## Configuration Notes

- No Binance API keys are required (public trade streams)
- CORS is open (`*`) for local development
- API base for the frontend is hard‑coded in `frotntend/src/App.jsx` (`http://localhost:8000/api`)

## Troubleshooting

- Frontend `npm run dev` fails immediately:
  - Ensure Node.js ≥ 18: `node -v`
  - Remove and re‑install deps: `rm -r node_modules package-lock.json` then `npm install`
  - Port 5173 in use? Change `frotntend/vite.config.js` or stop the other process

- Backend won’t start or import errors:
  - Activate the virtual environment in the same shell
  - Re‑install deps: `pip install -r backend/requirements.txt`

- No symbols visible in the UI:
  - Start ingestion first via the Data Ingestion tab (or upload NDJSON)

## Scripts Cheat‑Sheet

Backend:
```powershell
uvicorn backend.app:app --reload --port 8000
```

Frontend:
```powershell
cd frotntend
npm run dev
npm run build
npm run preview
```

## Roadmap

- Alert evaluation hooked to analytics stream and UI notifications
- Persisted resampled bars and configurable retention
- Dockerfiles and compose for one‑command startup
- Environment‑based config for API base and ports

## License

MIT (or your preferred license)
