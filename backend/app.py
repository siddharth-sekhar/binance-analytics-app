from fastapi import FastAPI, WebSocket, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import io, csv
import pandas as pd
import json
from storage import TickStorage
from ingestion import Ingestor
from analytics import resample_ticks_to_ohlcv, hedge_ratio_ols, compute_spread, rolling_zscore, adf_test, rolling_correlation
from alerts import AlertEngine
from schemas import Tick, IngestMode, AlertRule
from typing import List
import asyncio
import time

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

storage = TickStorage(db_file="backend_ticks.db")
ingestor = Ingestor(storage)
alerts = AlertEngine()

# simple set of connected websocket clients to push analytics
ws_clients = set()

@app.post("/api/ingest/start")
async def start_ingest(m: IngestMode):
    if m.mode == "ws":
        syms = [s.lower() for s in (m.symbols or [])]
        if not syms:
            return JSONResponse({"status":"error", "msg":"no symbols provided"}, status_code=400)
        ingestor.start_ws_for_symbols(syms)
        return {"status":"ok", "mode":"ws", "symbols":syms}
    else:
        return {"status":"error", "msg":"unsupported mode"}

@app.post("/api/upload_ndjson")
async def upload_ndjson(file: UploadFile = File(...)):
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except:
        text = content.decode("latin1")
    storage.load_from_ndjson_text(text)
    return {"status":"ok", "loaded": len(text.splitlines())}

@app.get("/api/symbols")
async def list_symbols():
    # return symbols known in storage
    return {"symbols": list(storage.dfs.keys())}

@app.get("/api/resampled/{symbol}")
async def get_resampled(symbol: str, timeframe: str = "1s"):
    df = storage.export_resampled(symbol.lower(), timeframe)
    if df is None or df.empty:
        return {"data": []}
    df = df.reset_index()
    df["ts"] = df["ts"].astype(str)
    return {"data": df.to_dict(orient="records")}

@app.get("/api/analytics/pair")
async def analytics_pair(x: str, y: str, timeframe: str = "1s", roll_window: int = 60):
    xdf = storage.export_resampled(x.lower(), timeframe)
    ydf = storage.export_resampled(y.lower(), timeframe)
    if xdf is None or ydf is None:
        return {"error":"no data"}
    # align by index (ts)
    series_x = xdf["close"]
    series_y = ydf["close"]
    # hedge via OLS
    hr = hedge_ratio_ols(series_y, series_x)
    if hr is None:
        return {"error":"insufficient data"}
    spread = compute_spread(series_y, series_x, hr["beta"], hr.get("intercept",0.0))
    z = rolling_zscore(spread, window=roll_window)
    adf = adf_test(spread)
    corr = rolling_correlation(series_x, series_y, window=roll_window).dropna()
    # return last N points for plotting
    out = {
        "hedge": hr,
        "adf": adf,
        "spread": spread.dropna().tail(500).to_dict(),
        "zscore": z.dropna().tail(500).to_dict(),
        "corr": corr.tail(500).to_dict()
    }
    return out

@app.get("/api/export/{symbol}")
async def export_symbol_csv(symbol: str, timeframe: str = "1s"):
    df = storage.export_resampled(symbol.lower(), timeframe)
    if df is None or df.empty:
        return JSONResponse({"error":"no data"}, status_code=404)
    csv_buf = df.reset_index().to_csv(index=False)
    return StreamingResponse(io.StringIO(csv_buf), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={symbol}_{timeframe}.csv"})

@app.post("/api/alerts")
async def add_alert(rule: AlertRule):
    r = alerts.add_rule(rule)
    return r

@app.get("/api/alerts")
async def get_alerts():
    return alerts.list_rules()

@app.delete("/api/alerts/{rid}")
async def rm_alert(rid:int):
    r = alerts.remove_rule(rid)
    return {"removed": bool(r)}

# WebSocket endpoint to stream live metrics & alerts to clients
@app.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    await websocket.accept()
    ws_clients.add(websocket)
    try:
        while True:
            # send heartbeat + some metrics every 1s
            await asyncio.sleep(1.0)
            # prepare small payload: latest price per symbol, optionally call analytics for key pairs
            payload = {"type":"heartbeat", "ts": time.time(), "symbols": {}}
            for sym, df in storage.dfs.items():
                if df.empty: continue
                latest = df["price"].iloc[-1]
                payload["symbols"][sym] = {"price": float(latest)}
            await websocket.send_json(payload)
    except Exception:
        pass
    finally:
        ws_clients.discard(websocket)
