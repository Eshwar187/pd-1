# models/analyzer.py
from __future__ import annotations
import os, json
import numpy as np
import pandas as pd
import joblib
from typing import Optional, Dict, Any
from .text import embed, cosine_sim, clean_text, get_encoder

class MisconceptionAnalyzer:
    def __init__(self, artifacts_dir: str, encoder):
        self.encoder = encoder
        self.loaded = False
        self.label_ref = {}   # (optional) known cluster labels per qid
        self.clf = None
        self._load(artifacts_dir)

    def _load(self, art: str):
        # classifier
        clf_path = os.path.join(art, "misconception_clf.joblib")
        if os.path.exists(clf_path):
            self.clf = joblib.load(clf_path)
        # labels
        lbl_path = os.path.join(art, "cluster_labels.parquet")
        if os.path.exists(lbl_path):
            df = pd.read_parquet(lbl_path)
            # build list of labels per qid
            for qid, grp in df.groupby("qid"):
                self.label_ref[int(qid)] = sorted(set(str(x) for x in grp["label"].tolist()))
        self.loaded = True

    def similarity(self, a_text: str, b_text: str) -> float:
        a_vec, b_vec = embed([clean_text(a_text), clean_text(b_text)], self.encoder)
        return float(round(cosine_sim(a_vec, b_vec), 4))

    def predict_label(self, user_answer: str, qid: Optional[int] = None) -> Dict[str, Any]:
        text = clean_text(user_answer)
        vec = embed([text], self.encoder)[0]
        if self.clf is None:
            # fallback: no classifier available -> label “unknown” with mid confidence
            return {"label": "unknown", "confidence": 0.5, "risk": 0.4, "explanation": "No classifier artifact found."}

        # predict_proba if available
        try:
            proba = self.clf.predict_proba([vec])[0]
            idx = int(np.argmax(proba))
            label = self.clf.classes_[idx]
            conf = float(proba[idx])
        except Exception:
            label = str(self.clf.predict([vec])[0])
            conf = 0.6

        # heuristic “risk”: high if label seems misconception-like
        risk = 0.2
        if any(k in label.lower() for k in ["miscon", "error", "wrong", "confuse", "noise"]):
            risk = max(0.4, 1.0 - conf + 0.4)

        # if we know valid labels for this qid, flag OOD
        if qid is not None and qid in self.label_ref and label not in self.label_ref[qid]:
            label = f"{label} (unseen@qid)"
            risk = max(risk, 0.5)

        return {"label": label, "confidence": round(conf, 3), "risk": round(float(risk), 3)}

    def suggest_guidance(self, question: str, ideal: str, user: str, mis_label: str) -> str:
        """
        Concise, deterministic guidance string (no external LLM).
        """
        sim_ui = self.similarity(user, ideal)
        tips = []
        # core elements
        tips.append(f"Start by restating the key term from the question in one line.")
        if sim_ui < 0.65:
            tips.append("Add a precise definition and one verifying example.")
        if any(k in mis_label.lower() for k in ["epsilon","ε","dfa","nfa","regex","star","union","concat","equiv"]):
            tips.append("Address the specific confusion noted in the label; contrast the two concepts explicitly.")
        tips.append("Finish with a short check: why your answer satisfies the definition or rule.")
        return " ".join(tips)
