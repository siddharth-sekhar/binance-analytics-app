# ingestion.py - manages websocket connections to Binance futures streams (fstream) and handles file upload ingestion
import asyncio
import json
import websockets
from typing import List
from storage import TickStorage
from datetime import datetime
import threading

BINANCE_WS_URL_TEMPLATE = "wss://fstream.binance.com/ws/{}@trade"

class Ingestor:
    def __init__(self, storage: TickStorage):
        self.storage = storage
        self._tasks = {}
        self._running = False

    async def _single_ws(self, symbol: str):
        url = BINANCE_WS_URL_TEMPLATE.format(symbol.lower())
        async with websockets.connect(url) as ws:
            async for message in ws:
                try:
                    j = json.loads(message)
                    # trade event structure: fields like e:'trade', E:eventTime, s:symbol, p:price, q:qty, T:tradeTime
                    if j.get("e") == "trade":
                        ts = datetime.utcfromtimestamp(j.get("T", j.get("E", int(datetime.utcnow().timestamp()*1000)))/1000.0).isoformat()
                        price = float(j.get("p"))
                        size = float(j.get("q"))
                        self.storage.append_tick(j.get("s").lower(), ts, price, size)
                except Exception:
                    continue

    def start_ws_for_symbols(self, symbols: List[str]):
        # start tasks for each symbol on an event loop thread
        if self._running:
            return
        self._running=True
        loop = asyncio.new_event_loop()
        self.loop = loop
        def runner():
            asyncio.set_event_loop(loop)
            tasks = [loop.create_task(self._single_ws(sym)) for sym in symbols]
            try:
                loop.run_until_complete(asyncio.gather(*tasks))
            finally:
                loop.close()
        t = threading.Thread(target=runner, daemon=True)
        t.start()
        self._thread = t

    def stop(self):
        if self._running:
            # stopping websockets elegantly is complicated; for prototype just stop loop
            try:
                self.loop.call_soon_threadsafe(self.loop.stop)
            except Exception:
                pass
            self._running=False
