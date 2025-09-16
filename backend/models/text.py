from __future__ import annotations
import re
import hashlib
import numpy as np
from typing import List, Any

# Try to import the real encoder; fall back to a lightweight deterministic stub
try:
    from sentence_transformers import SentenceTransformer  # type: ignore
except Exception:
    SentenceTransformer = None  # type: ignore


class DummyEncoder:
    """A tiny deterministic encoder used when sentence-transformers is missing.
    It maps text -> fixed-size vectors (64d) using SHA-256 bytes so similarity
    is deterministic and non-zero without heavy dependencies.
    """
    def __init__(self, dim: int = 64):
        self.dim = dim

    def encode(self, texts: List[str], normalize_embeddings: bool = True):
        out = []
        for t in texts:
            h = hashlib.sha256(t.encode("utf-8")).digest()
            # repeat digest bytes to reach desired dim
            repeated = (h * ((self.dim // len(h)) + 1))[: self.dim]
            arr = np.frombuffer(repeated, dtype=np.uint8).astype(np.float32)
            # center to roughly [-1,1]
            vec = (arr - 128.0) / 128.0
            if normalize_embeddings:
                norm = np.linalg.norm(vec) + 1e-12
                vec = vec / norm
            out.append(vec.astype(np.float32))
        return np.vstack(out)


_ENCODER: Any = None


def get_encoder(model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> Any:
    global _ENCODER
    if _ENCODER is None:
        if SentenceTransformer is not None:
            _ENCODER = SentenceTransformer(model_name)
        else:
            _ENCODER = DummyEncoder(dim=64)
    return _ENCODER


def normalize(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v, axis=1, keepdims=True) + 1e-12
    return v / n


def embed(texts: List[str], encoder: Any) -> np.ndarray:
    vecs = encoder.encode(texts, normalize_embeddings=True)
    return np.asarray(vecs, dtype=np.float32)


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    a = a.reshape(1, -1); b = b.reshape(1, -1)
    s = float((a @ b.T).squeeze())
    # already normalized
    return max(-1.0, min(1.0, s))


def clean_text(t: str) -> str:
    return re.sub(r"\s+", " ", t.strip())
