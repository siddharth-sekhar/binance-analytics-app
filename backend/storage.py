# Simple storage: in-memory time-indexed pandas DataFrames + sqlite persistence for ticks
import pandas as pd
import sqlite3
import os
from datetime import datetime
from typing import Dict

DB_FILE = "ticks.db"

class TickStorage:
    def __init__(self, db_file=DB_FILE):
        self.db_file = db_file
        self._ensure_db()
        # in-memory per-symbol DataFrame (columns: ts (datetime), price, size)
        self.dfs = {}  # symbol -> DataFrame

    def _ensure_db(self):
        if not os.path.exists(self.db_file):
            conn = sqlite3.connect(self.db_file)
            conn.execute(
                "CREATE TABLE ticks (symbol TEXT, ts TEXT, price REAL, size REAL)"
            )
            conn.commit()
            conn.close()

    def append_tick(self, symbol: str, ts_iso: str, price: float, size: float):
        ts = pd.to_datetime(ts_iso)
        # append to sqlite
        conn = sqlite3.connect(self.db_file)
        conn.execute(
            "INSERT INTO ticks (symbol, ts, price, size) VALUES (?, ?, ?, ?)",
            (symbol, ts_iso, float(price), float(size)),
        )
        conn.commit()
        conn.close()
        # update in-memory
        df = self.dfs.get(symbol)
        row = {"ts": ts, "price": float(price), "size": float(size)}
        if df is None:
            self.dfs[symbol] = pd.DataFrame([row]).set_index("ts")
        else:
            self.dfs[symbol] = pd.concat([df, pd.DataFrame([row]).set_index("ts")])
            # trim memory to last N points (optional)
            self.dfs[symbol] = self.dfs[symbol].sort_index().last("7D")  # keep 7 days max

    def get_raw(self, symbol: str):
        return self.dfs.get(symbol, pd.DataFrame(columns=["price","size"]))

    def load_from_ndjson_text(self, ndjson_text: str):
        # expect lines of {"symbol":..., "ts":..., "price":..., "size":...}
        import json
        for line in ndjson_text.strip().splitlines():
            if not line.strip(): continue
            j = json.loads(line)
            self.append_tick(j["symbol"], j["ts"], j["price"], j.get("size", 0.0))

    def export_resampled(self, symbol: str, timeframe: str):
        df = self.get_raw(symbol)
        if df.empty:
            return None
        ohlc = df["price"].resample(timeframe).ohlc()
        vol = df["size"].resample(timeframe).sum().rename("volume")
        res = pd.concat([ohlc, vol], axis=1).dropna()
        return res
