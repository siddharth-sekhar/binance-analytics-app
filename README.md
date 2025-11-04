# Binance Analytics App

A full‑stack, real‑time analytics dashboard for Binance perpetual futures symbols. The backend ingests live trades from Binance WebSocket streams and computes time‑series analytics (OHLCV, hedge ratios, spreads, rolling z‑scores, ADF stationarity, correlations). The frontend (React + Vite + Plotly) visualizes prices, volumes, and pair analytics with a modern UI.

## Features

- Live ingestion from Binance fstreams (e.g., btcusdt, ethusdt)
- Upload NDJSON historical ticks and resample to OHLCV
- Upload OHLCV CSV (ts, open, high, low, close, volume) per symbol/timeframe
- Resampling intervals: 1s, 1min, 5min (configurable in UI)
- Pair analytics: OLS and Kalman hedge (β, α), R², spread, rolling z‑score, rolling correlation
- Stationarity via ADF test
- Liquidity filter (min volume) for analytics inputs
- Mini mean‑reversion backtest (z>2 entry, z<0 exit) with equity curve
- Cross‑correlation heatmap for multiple symbols
- Rule‑based alerts (zscore/spread); UI to add rules and view latest triggers
- CSV exports: OHLCV per symbol/timeframe and analytics outputs (spread, zscore, corr)
- WebSocket heartbeat with latest prices per symbol

## Architecture diagram

![Architecture](https://github.com/siddharth-sekhar/binance-analytics-app/blob/ae3796643045eb0410d08ae3325fb9648d95e4a0/binance-analytics.drawio.png) -->

## Tech Stack

- Backend: FastAPI, websockets, pandas, numpy, statsmodels, scipy, SQLite
- Frontend: React (Vite), Plotly.js, react‑plotly.js, axios

## Repository Structure

```
backend/          # FastAPI service, ingestion, analytics, storage
frontend/         # React + Vite app
assets/           # Misc HTML/demo assets
```
## Prerequisites

- Windows PowerShell (v5+)
- Python 3.10+ (3.12 recommended)
- Node.js 18+ (Node 20+ recommended for Vite 7)

## Quick Start (local)

### One-command start (Windows)

From the repo root, run to set up dependencies and launch both backend and frontend together:

```powershell
# PowerShell (recommended)
powershell -ExecutionPolicy Bypass -File .\run.ps1

# or simply double-click run.bat (opens PowerShell and runs the same)
```

Flags:
- `-SkipInstall` to skip dependency installation if you’re already set up

Once running:
- Backend API and docs: http://localhost:8000/docs
- Frontend UI: http://localhost:5173

---

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
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser. The app expects the backend at http://localhost:8000 (configured in `frontend/src/App.jsx`).

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
- Use the Regression selector (OLS/Kalman) and Min Volume filter to refine analytics
- Backtest equity curve appears under Pair Analytics
- Cross‑correlation heatmap appears when 2+ symbols are selected

Optional) Upload OHLCV CSV
- In the "Data Ingestion" tab, use the "Upload OHLCV CSV" section
- Select a symbol and timeframe, then choose a CSV with headers: `ts, open, high, low, close, volume`
- Submit to load bars directly; these bars will be used for that symbol/timeframe

3) Export data
- From the charts:
  - Price chart: use the "Download CSV" button to fetch symbol OHLCV
  - Pair analytics: use the "Download Analytics CSV" button (includes spread, zscore, corr)
- Or via API endpoints (see below)

## API Reference (selected)

Base URL: `http://localhost:8000/api`

- POST `/ingest/start`
  - Body: `{ "mode": "ws", "symbols": ["btcusdt", "ethusdt"] }`
  - Starts WebSocket ingestion for the given symbols

- POST `/upload_ndjson`
  - Form file: `file` (NDJSON where each line is `{symbol, ts, price, size}`)
  - Loads historical ticks to storage/DB

- POST `/upload_ohlcv`
  - Multipart form fields: `symbol` (e.g., `btcusdt`), `timeframe` (e.g., `1s`, `1min`, `5min`), `file` (CSV)
  - CSV must contain headers: `ts, open, high, low, close, volume`
  - Loads OHLCV bars into memory and serves them for that symbol/timeframe

- GET `/symbols`
  - Returns currently known symbols in memory

- GET `/resampled/{symbol}?timeframe=1s`
  - Returns OHLCV data resampled from raw ticks

- GET `/analytics/pair?x=btcusdt&y=ethusdt&timeframe=1s&roll_window=60&regression=ols|kalman&min_volume=0`
  - Returns hedge (β, α, R²), spread, z‑score, rolling correlation, ADF, backtest, latest alerts

- GET `/export/{symbol}?timeframe=1s`
  - Streams CSV for OHLCV download

- GET `/analytics/pair_export?x=btcusdt&y=ethusdt&timeframe=1s&roll_window=60&regression=ols&min_volume=0`
  - Streams CSV with columns: `ts, spread, zscore, corr`

- GET `/analytics/corr_matrix?symbols=btcusdt,ethusdt,bnbusdt&timeframe=1s&min_volume=0`
  - Returns `{ symbols: [...], matrix: number[][] }` cross‑correlation matrix

- Alerts:
  - POST `/alerts` — add rule `{symbol_x, symbol_y, metric, op, threshold}` (metric: `zscore`|`spread`)
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
- Uploaded OHLCV bars are stored in-memory and take precedence when requesting `/api/resampled/{symbol}?timeframe=...` for the uploaded timeframe. They are not persisted to disk by default.

## Configuration Notes

- No Binance API keys are required (public trade streams)
- CORS is open (`*`) for local development
- API base for the frontend is hard‑coded in `frontend/src/App.jsx` (`http://localhost:8000/api`)

## Troubleshooting

- Frontend `npm run dev` fails immediately:
  - Ensure Node.js ≥ 18: `node -v`
  - Remove and re‑install deps: `rm -r node_modules package-lock.json` then `npm install`
  - Port 5173 in use? Change `frontend/vite.config.js` or stop the other process

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
cd frontend
npm run dev
npm run build
npm run preview
```

## Roadmap

- Persist OHLCV uploads to disk and allow deletion/management
- Configurable backtest parameters and trade accounting
- Dockerfiles and compose for one‑command startup
- Environment‑based config for API base and ports
