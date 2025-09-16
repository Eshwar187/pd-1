# models/difficulty.py
from __future__ import annotations
import os, json, math, re
import numpy as np
import pandas as pd
from typing import Optional, Dict, Any

class DifficultyEstimator:
    def __init__(self, artifacts_dir: str):
        self.items = None   # DataFrame with qid,a,b,mean_acc (if available)
        self.n_items = 0
        self._load(artifacts_dir)

    def _load(self, art: str):
        path_json = os.path.join(art, "irt_items.json")
        path_parq = os.path.join(art, "irt_items.parquet")
        df = None
        if os.path.exists(path_parq):
            try:
                df = pd.read_parquet(path_parq)
            except Exception:
                df = None
        if df is None and os.path.exists(path_json):
            try:
                df = pd.DataFrame(json.load(open(path_json)))
            except Exception:
                df = None
        self.items = df
        self.n_items = 0 if df is None else len(df)

    @staticmethod
    def _lex_complexity(question_text: str) -> float:
        # Simple lexical heuristics if no IRT item is found: length, punctuation, rare tokens
        t = re.sub(r"[^a-zA-Z0-9\s]", " ", question_text).lower().split()
        L = len(t)
        uniq = len(set(t))
        ratio = uniq / (L + 1e-6)
        # normalized difficulty proxy in [0,1]
        val = 0.25*(min(L, 40)/40.0) + 0.35*max(0.0, 1.0 - ratio) + 0.4*(1.0 if any(x in question_text for x in ["prove","derive","construct","show that"]) else 0.0)
        return float(max(0.0, min(1.0, val)))

    @staticmethod
    def _bucket(x: float) -> str:
        if x < 0.33: return "Easy"
        if x < 0.66: return "Medium"
        return "Hard"

    def estimate(self, question_text: str, qid: Optional[int] = None) -> Dict[str, Any]:
        # If we have IRT for this qid, use it; else lexical proxy
        if qid is not None and self.items is not None:
            row = self.items[self.items["qid"] == qid]
            if len(row):
                b = float(row.iloc[0]["b"])
                a = float(row.iloc[0].get("a", 1.0))
                # map b (roughly -∞..+∞) to [0,1] via logistic
                diff_norm = 1.0 / (1.0 + math.exp(-b))
                return {
                    "qid": int(qid),
                    "has_irt": True,
                    "a": float(a),
                    "b": float(b),
                    "difficulty_norm": float(round(diff_norm, 3)),
                    "bucket": self._bucket(diff_norm)
                }

        diff_norm = self._lex_complexity(question_text)
        return {
            "qid": qid,
            "has_irt": False,
            "difficulty_norm": float(round(diff_norm, 3)),
            "bucket": self._bucket(diff_norm)
        }
