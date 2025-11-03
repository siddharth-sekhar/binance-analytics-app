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
        # optional in-memory OHLCV bars loaded from files: bars[symbol][timeframe] -> DataFrame
        self.bars = {}  # type: Dict[str, Dict[str, pd.DataFrame]]

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

    def load_ohlcv_csv_text(self, symbol: str, timeframe: str, csv_text: str):
        """
        Load OHLCV bars for a given symbol and timeframe from CSV text.
        Expected columns (case-insensitive): ts, open, high, low, close, volume
        ts should be an ISO timestamp or parseable datetime string.
        """
        df = pd.read_csv(pd.io.common.StringIO(csv_text))
        # normalize column names
        cols = {c.lower(): c for c in df.columns}
        required = ["ts", "open", "high", "low", "close", "volume"]
        missing = [c for c in required if c not in cols]
        if missing:
            raise ValueError(f"Missing required columns in OHLCV CSV: {missing}")
        df = df[[cols["ts"], cols["open"], cols["high"], cols["low"], cols["close"], cols["volume"]]].copy()
        df.columns = ["ts", "open", "high", "low", "close", "volume"]
        df["ts"] = pd.to_datetime(df["ts"])  # parse timestamps
        df = df.sort_values("ts").set_index("ts")
        # store in bars dict
        sym = symbol.lower()
        tf = timeframe
        if sym not in self.bars:
            self.bars[sym] = {}
        self.bars[sym][tf] = df

    def export_resampled(self, symbol: str, timeframe: str):
        # If pre-loaded OHLCV bars exist for the symbol/timeframe, return them
        sym = symbol.lower()
        if sym in self.bars and timeframe in self.bars[sym]:
            df_bars = self.bars[sym][timeframe]
            return df_bars
        # Otherwise compute from raw ticks if available
        df = self.get_raw(sym)
        if df.empty:
            return None
        ohlc = df["price"].resample(timeframe).ohlc()
        vol = df["size"].resample(timeframe).sum().rename("volume")
        res = pd.concat([ohlc, vol], axis=1).dropna()
        return res
