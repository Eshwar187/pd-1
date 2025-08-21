import os
import json
import time
from typing import Optional, Dict, Any

import requests
import streamlit as st
import pandas as pd
import plotly.express as px

"""
Streamlit Frontend: Misconception + IRT Analyzer
Polished UI with forms, spinners, Plotly charts, custom CSS, and session persistence.
"""

# --- Config ---
DEFAULT_BACKEND = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")

st.set_page_config(
    page_title="Misconception + IRT Analyzer",
    page_icon="🧠",
    layout="wide",
)

# --- Custom Styles (unique look) ---
st.markdown(
    """
    <style>
      /* Animated gradient header bar */
      .gradient-bar {
        height: 6px;
        background: linear-gradient(270deg, #7F7FFF, #4DD0E1, #66BB6A, #FFCA28, #EF5350);
        background-size: 1000% 1000%;
        animation: gradientShift 18s ease infinite;
        border-radius: 6px;
        margin-bottom: 12px;
      }
      @keyframes gradientShift {
        0% {background-position: 0% 50%;}
        50% {background-position: 100% 50%;}
        100% {background-position: 0% 50%;}
      }
      /* Card-like containers */
      .glass-card {
        background: rgba(255,255,255,0.65);
        border: 1px solid rgba(200,200,200,0.35);
        box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        border-radius: 14px;
        padding: 16px 18px;
        transition: transform .2s ease;
      }
      .glass-card:hover { transform: translateY(-1px); }
      /* Subtle label styling */
      .muted { color: #6b7280; font-size: 0.92rem; }
    </style>
    <div class="gradient-bar"></div>
    """,
    unsafe_allow_html=True,
)

st.markdown("## 🧠 Misconception + IRT Analyzer")
st.caption("A sleek Streamlit UI for the FastAPI backend. Analyze answers, predict misconceptions, and estimate difficulty.")

# --- Session State Defaults ---
if "backend_url" not in st.session_state:
    st.session_state.backend_url = DEFAULT_BACKEND
if "last_results" not in st.session_state:
    st.session_state.last_results = {}


# --- Utilities ---
def request_api(method: str, path: str, json_body: Optional[Dict[str, Any]] = None, timeout: int = 60):
    url = f"{st.session_state.backend_url}{path}"
    try:
        resp = requests.request(method=method, url=url, json=json_body, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except requests.HTTPError as he:
        detail = None
        try:
            detail = resp.json()
        except Exception:
            detail = resp.text
        raise RuntimeError(f"HTTP {resp.status_code} on {path}: {detail}") from he
    except Exception as e:
        raise RuntimeError(f"Request to {path} failed: {e}") from e

with st.sidebar:
    st.header("⚙️ Backend Settings")
    st.session_state.backend_url = st.text_input(
        "Backend base URL",
        value=st.session_state.backend_url,
        help="FastAPI server base URL (no trailing slash)",
    )
    col_h1, col_h2 = st.columns([1,1])
    with col_h1:
        if st.button("🔄 Check Health"):
            with st.spinner("Pinging backend..."):
                try:
                    data = request_api("GET", "/health")
                    st.success(f"OK • artifacts: {data.get('artifacts')} • items: {data.get('difficulty_items')}")
                except Exception as e:
                    st.error(str(e))
    with col_h2:
        if st.button("📋 Copy URL"):
            st.write(f"`{st.session_state.backend_url}` copied (Ctrl+C)! 🧷")

st.subheader("Inputs")
with st.container():
    c1, c2 = st.columns(2)
    with c1:
        question_text = st.text_area("📝 Question", height=120, placeholder="Enter the question...")
        qid: Optional[int] = None
        qid_str = st.text_input("🔢 Optional Question ID (qid)", value="", help="If you have a known question id from your dataset")
        if qid_str.strip():
            try:
                qid = int(qid_str)
            except ValueError:
                st.warning("qid must be an integer; ignoring.")
                qid = None
    with c2:
        ideal_answer_text = st.text_area("🎯 Ideal answer", height=120, placeholder="Enter the ideal (reference) answer...")
        user_answer_text = st.text_area("🙋 User answer", height=120, placeholder="Enter the student's answer...")

    c3, c4, c5 = st.columns([1,1,2])
    with c3:
        if st.button("✨ Load sample"):
            question_text = "Explain photosynthesis and its importance."
            ideal_answer_text = "Photosynthesis converts light energy into chemical energy, producing glucose and oxygen; it's vital for energy flow and atmospheric oxygen."
            user_answer_text = "Plants breathe in sunlight and make food; they also give air."
            st.experimental_rerun()
    with c4:
        if st.button("🧹 Clear"):
            question_text = ideal_answer_text = user_answer_text = ""
            st.experimental_rerun()

st.divider()

# Tabs for the 3 operations
freeform_tab, mis_tab, diff_tab = st.tabs([
    "🔍 One-shot Analyze",
    "🧩 Predict Misconception",
    "📈 Estimate Difficulty",
])

# --- Freeform Analyze ---
with freeform_tab:
    st.markdown("Run holistic analysis: similarity, misconception, difficulty, score, guidance, charts.")
    with st.form(key="analyze_form"):
        submitted = st.form_submit_button("🚀 Analyze")
    if submitted:
        if not (question_text and ideal_answer_text and user_answer_text):
            st.error("Please fill question, ideal answer, and user answer.")
        else:
            payload = {
                "question_text": question_text,
                "ideal_answer_text": ideal_answer_text,
                "user_answer_text": user_answer_text,
            }
            if qid is not None:
                payload["qid"] = qid
            try:
                with st.spinner("Analyzing answer ✨..."):
                    data = request_api("POST", "/api/analyze/freeform", json_body=payload, timeout=90)
                    time.sleep(0.2)
                st.success("Analysis complete")
                st.session_state.last_results["analyze"] = data

                # Top-level metrics in glass cards
                m1, m2, m3 = st.columns(3)
                m1.metric("User vs Ideal", data["similarity"]["user_vs_ideal"]) 
                m2.metric("Question vs Ideal", data["similarity"]["question_vs_ideal"]) 
                m3.metric("Answer Score", data.get("answer_score", 0))

                colA, colB = st.columns([1,1])
                with colA:
                    st.subheader("🧩 Misconception")
                    mis = data.get("misconception", {})
                    high = {k: mis.get(k) for k in ("label", "confidence", "risk") if k in mis}
                    st.dataframe(pd.DataFrame([high]))
                    with st.expander("Full JSON"):
                        st.json(mis)
                with colB:
                    st.subheader("📊 Difficulty")
                    dif = data.get("difficulty", {})
                    hi = {k: dif.get(k) for k in ("difficulty_norm", "bucket", "qid") if k in dif}
                    st.dataframe(pd.DataFrame([hi]))
                    with st.expander("Full JSON"):
                        st.json(dif)

                st.subheader("🧭 Guidance")
                st.markdown(f"> {data.get('guidance', '-')}")

                # Charts (Plotly)
                charts = data.get("charts", {})
                pie = charts.get("pie", [])
                bars = charts.get("bars", [])
                chart_col1, chart_col2 = st.columns(2)
                with chart_col1:
                    st.markdown("**Composition: Match vs Gaps vs Misconception**")
                    if pie:
                        df_pie = pd.DataFrame(pie)
                        fig = px.pie(df_pie, values="value", names="name", hole=0.45, color_discrete_sequence=px.colors.sequential.Teal)
                        fig.update_traces(textposition="inside", textinfo="percent+label")
                        st.plotly_chart(fig, use_container_width=True)
                    else:
                        st.info("No pie data")
                with chart_col2:
                    st.markdown("**Similarity & Difficulty**")
                    if bars:
                        df_bars = pd.DataFrame(bars)
                        fig2 = px.bar(df_bars, x="metric", y="value", color="metric", text="value", color_discrete_sequence=px.colors.qualitative.Set2)
                        fig2.update_traces(texttemplate="%{text:.2f}", textposition="outside")
                        fig2.update_layout(yaxis_range=[0,1])
                        st.plotly_chart(fig2, use_container_width=True)
                    else:
                        st.info("No bar data")

                # Download
                st.download_button(
                    label="⬇️ Download JSON",
                    data=json.dumps(data, indent=2),
                    file_name="analysis.json",
                    mime="application/json",
                )

            except Exception as e:
                st.error(f"Analyze failed: {e}")

# --- Predict Misconception ---
with mis_tab:
    st.markdown("Predict the misconception label (and confidence/risk) from the user answer.")
    with st.form(key="mis_form"):
        mis_submit = st.form_submit_button("🔮 Predict")
    if mis_submit:
        if not user_answer_text:
            st.error("Please provide user answer text.")
        else:
            payload = {"user_answer_text": user_answer_text}
            if qid is not None:
                payload["qid"] = qid
            try:
                with st.spinner("Predicting misconception..."):
                    out = request_api("POST", "/api/predict_misconception", json_body=payload)
                st.success("Prediction complete")
                st.dataframe(pd.DataFrame([out]))
                with st.expander("Full JSON"):
                    st.json(out)
            except Exception as e:
                st.error(f"Prediction failed: {e}")

# --- Estimate Difficulty ---
with diff_tab:
    st.markdown("Estimate the difficulty for the question (0 easy – 1 hard) and bucket.")
    with st.form(key="diff_form"):
        diff_submit = st.form_submit_button("📐 Estimate")
    if diff_submit:
        if not question_text:
            st.error("Please provide question text.")
        else:
            payload = {"question_text": question_text}
            if qid is not None:
                payload["qid"] = qid
            try:
                with st.spinner("Estimating difficulty..."):
                    out = request_api("POST", "/api/estimate_difficulty", json_body=payload)
                st.success("Difficulty estimated")
                st.dataframe(pd.DataFrame([out]))
                with st.expander("Full JSON"):
                    st.json(out)
            except Exception as e:
                st.error(f"Difficulty estimation failed: {e}")
