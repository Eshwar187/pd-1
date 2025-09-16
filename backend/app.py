from __future__ import annotations
import os, json, math
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from models.text import get_encoder, cosine_sim
from models.analyzer import MisconceptionAnalyzer
from models.difficulty import DifficultyEstimator

ART_DIR = os.environ.get("ARTIFACT_DIR", os.path.join(os.path.dirname(__file__), "artifacts"))

app = FastAPI(title="Misconception + IRT Backend", version="1.0.0")

# ---- load components on startup ----
encoder = get_encoder("sentence-transformers/all-MiniLM-L6-v2")
mis_analyzer = MisconceptionAnalyzer(artifacts_dir=ART_DIR, encoder=encoder)
diff_est = DifficultyEstimator(artifacts_dir=ART_DIR)

@app.get("/health")
def health():
    return {"ok": True, "artifacts": mis_analyzer.loaded, "difficulty_items": diff_est.n_items}

# --------- Schemas ---------
class AnalyzeBody(BaseModel):
    question_text: str = Field(..., min_length=3)
    ideal_answer_text: str = Field(..., min_length=3)
    user_answer_text: str = Field(..., min_length=1)
    qid: Optional[int] = None  # if you have a known question id from your dataset

class PredictMisconceptionBody(BaseModel):
    user_answer_text: str
    qid: Optional[int] = None

class EstimateDifficultyBody(BaseModel):
    question_text: str
    qid: Optional[int] = None

# --------- Endpoints ---------
@app.post("/api/predict_misconception")
def predict_misconception(b: PredictMisconceptionBody):
    try:
        pred = mis_analyzer.predict_label(b.user_answer_text, qid=b.qid)
        return pred
    except Exception as e:
        raise HTTPException(500, detail=f"Misconception prediction failed: {e}")

@app.post("/api/estimate_difficulty")
def estimate_difficulty(b: EstimateDifficultyBody):
    try:
        return diff_est.estimate(question_text=b.question_text, qid=b.qid)
    except Exception as e:
        raise HTTPException(500, detail=f"Difficulty estimation failed: {e}")

@app.post("/api/analyze/freeform")
def analyze_freeform(b: AnalyzeBody):
    """
    One-shot analysis:
    - similarity to ideal answer
    - misconception prediction (+confidence)
    - overall answer score
    - question difficulty (value + bucket)
    - guidance text
    - chart-ready payloads (pie + bars)
    """
    try:
        # 1) similarities
        sim_ui_vs_ideal = mis_analyzer.similarity(b.user_answer_text, b.ideal_answer_text)
        sim_qi = mis_analyzer.similarity(b.question_text, b.ideal_answer_text)

        # 2) misconception prediction
        mis_pred = mis_analyzer.predict_label(b.user_answer_text, qid=b.qid)

        # 3) question difficulty
        diff = diff_est.estimate(question_text=b.question_text, qid=b.qid)

        # 4) overall answer quality score (blend of similarity & misconception risk)
        #    - high similarity, low mis-risk -> high score
        mis_risk = 1.0 - mis_pred.get("confidence", 0.5) if mis_pred.get("label") in ("noise","misc") else mis_pred.get("risk", 0.4)
        # normalize risk ∈ [0,1]
        mis_risk = max(0.0, min(1.0, mis_risk))
        answer_score = 0.65*sim_ui_vs_ideal + 0.35*(1.0 - mis_risk)
        answer_score = float(round(answer_score, 3))

        # 5) suggest “how to answer effectively”
        guidance = mis_analyzer.suggest_guidance(
            question=b.question_text,
            ideal=b.ideal_answer_text,
            user=b.user_answer_text,
            mis_label=mis_pred.get("label", "noise")
        )

        # 6) chart-ready payloads
        #    pie: proportions (match vs gap vs misconception)
        pie = [
            {"name": "Matches Ideal", "value": round(sim_ui_vs_ideal, 3)},
            {"name": "Gaps vs Ideal", "value": round(max(0.0, 1.0 - sim_ui_vs_ideal - 0.15), 3)},  # leave room for mis
            {"name": "Misconception Risk", "value": round(min(0.4, mis_risk), 3)}
        ]

        #    bars: similarity components
        bars = [
            {"metric": "User vs Ideal", "value": round(sim_ui_vs_ideal, 3)},
            {"metric": "Question vs Ideal", "value": round(sim_qi, 3)},
            {"metric": "Difficulty (0 easy–1 hard)", "value": round(diff["difficulty_norm"], 3)}
        ]

        # Final payload
        return {
            "question_text": b.question_text,
            "ideal_answer_text": b.ideal_answer_text,
            "user_answer_text": b.user_answer_text,

            "similarity": {
                "user_vs_ideal": round(sim_ui_vs_ideal, 3),
                "question_vs_ideal": round(sim_qi, 3)
            },
            "misconception": mis_pred,
            "difficulty": diff,
            "answer_score": answer_score,
            "guidance": guidance,

            "charts": {
                "pie": pie,
                "bars": bars
            }
        }
    except Exception as e:
        raise HTTPException(500, detail=f"Analysis failed: {e}")
