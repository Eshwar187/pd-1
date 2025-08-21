# models/text.py
from __future__ import annotations
import re
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List

_ENCODER = None

def get_encoder(model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> SentenceTransformer:
    global _ENCODER
    if _ENCODER is None:
        _ENCODER = SentenceTransformer(model_name)
    return _ENCODER

def normalize(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v, axis=1, keepdims=True) + 1e-12
    return v / n

def embed(texts: List[str], encoder: SentenceTransformer) -> np.ndarray:
    vecs = encoder.encode(texts, normalize_embeddings=True)
    return np.asarray(vecs, dtype=np.float32)

def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    a = a.reshape(1, -1); b = b.reshape(1, -1)
    s = float((a @ b.T).squeeze())
    # already normalized
    return max(-1.0, min(1.0, s))

def clean_text(t: str) -> str:
    return re.sub(r"\s+", " ", t.strip())
