# Misconception + IRT Backend

## Setup
```bash
# Windows (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# macOS/Linux (bash/zsh)
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Run the Backend (FastAPI)
Artifacts are auto-loaded from `artifacts/`. If you need to override the path, set `ARTIFACT_DIR`.

```bash
# from repo root
uvicorn app:app --reload --port 8000
# optional (Windows PowerShell):
# $env:ARTIFACT_DIR = "C:\\path\\to\\artifacts"; uvicorn app:app --reload --port 8000
```

Health check: open http://127.0.0.1:8000/health

## Python Frontend (Streamlit)
A lightweight Streamlit UI is provided at `frontend/streamlit_app.py` to interact with:
- `POST /api/analyze/freeform`
- `POST /api/predict_misconception`
- `POST /api/estimate_difficulty`

Run it:
```bash
# ensure backend is running on http://127.0.0.1:8000
# optionally set a custom backend URL
# Windows PowerShell
$env:BACKEND_URL = "http://127.0.0.1:8000"
streamlit run frontend/streamlit_app.py

# macOS/Linux
BACKEND_URL="http://127.0.0.1:8000" streamlit run frontend/streamlit_app.py
```

The UI lets you enter:
- question text, ideal answer, user answer
- optional `qid`
and shows similarity metrics, misconception output, difficulty, guidance, and charts.
