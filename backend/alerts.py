from typing import List
from schemas import AlertRule
import threading
import time

class AlertEngine:
    def __init__(self):
        self.rules = {}  # id -> AlertRule
        self._next_id = 1

    def add_rule(self, rule: AlertRule):
        rule.id = self._next_id
        self.rules[self._next_id] = rule
        self._next_id += 1
        return rule

    def remove_rule(self, rid:int):
        return self.rules.pop(rid, None)

    def list_rules(self):
        return list(self.rules.values())

    # check a metric value (metric is a string) - return list of (rule, message)
    def evaluate(self, metric_name: str, value: float, context: dict):
        triggered = []
        for r in self.rules.values():
            if r.metric != metric_name:
                continue
            op = r.op
            th = r.threshold
            ok = (value > th) if op == ">" else (value < th)
            if ok:
                msg = f"Rule {r.id}: {r.symbol_x}/{r.symbol_y} {r.metric} {op} {th} -> value={value:.4f}"
                triggered.append((r, msg, context))
        return triggered
