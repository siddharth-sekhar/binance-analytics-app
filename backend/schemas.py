from pydantic import BaseModel
from typing import List, Optional, Any

class Tick(BaseModel):
    symbol: str
    ts: str   # ISO timestamp
    price: float
    size: float

class IngestMode(BaseModel):
    mode: str  # "ws" or "upload"
    symbols: Optional[List[str]] = None

class AlertRule(BaseModel):
    id: Optional[int] = None
    symbol_x: str
    symbol_y: str
    metric: str  # "zscore" or "spread"
    op: str      # ">" or "<"
    threshold: float
