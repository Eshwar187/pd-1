"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";

type AnalyzeReq = {
  question_text: string;
  ideal_answer_text: string;
  user_answer_text: string;
  qid?: number;
};

type MisReq = { user_answer_text: string; qid?: number };
type DiffReq = { question_text: string; qid?: number };

export default function Home() {
  const [question, setQuestion] = useState("");
  const [ideal, setIdeal] = useState("");
  const [userAns, setUserAns] = useState("");
  const [qid, setQid] = useState<string>("");

  const qidNumber = useMemo(() => {
    const v = parseInt(qid, 10);
    return Number.isNaN(v) ? undefined : v;
  }, [qid]);

  const [loading, setLoading] = useState<"analyze" | "mis" | "diff" | null>(null);
  const [analyzeOut, setAnalyzeOut] = useState<any>(null);
  const [misOut, setMisOut] = useState<any>(null);
  const [diffOut, setDiffOut] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const disabledAnalyze = !question || !ideal || !userAns;
  const disabledMis = !userAns;
  const disabledDiff = !question;

  async function callApi<T>(path: string, body?: unknown): Promise<T> {
    const r = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!r.ok) {
      let detail: any;
      try { detail = await r.json(); } catch { detail = await r.text(); }
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    return r.json();
  }

  const loadSample = () => {
    setQuestion("Explain photosynthesis and its importance.");
    setIdeal("Photosynthesis converts light energy into chemical energy, producing glucose and oxygen; it's vital for energy flow and atmospheric oxygen.");
    setUserAns("Plants breathe in sunlight and make food; they also give air.");
  };

  const CountUp = ({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) => {
    const [display, setDisplay] = useState(0);
    const rafRef = useRef<number | null>(null);
    const startRef = useRef<number | null>(null);
    const fromRef = useRef(0);
    useEffect(() => {
      fromRef.current = display;
      startRef.current = null;
      const duration = 400;
      const step = (t: number) => {
        if (startRef.current === null) startRef.current = t;
        const p = Math.min(1, (t - startRef.current) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const next = fromRef.current + (value - fromRef.current) * eased;
        setDisplay(next);
        if (p < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);
    return <>{display.toFixed(decimals)}{suffix}</>;
  };

  const clearAll = () => {
    setQuestion("");
    setIdeal("");
    setUserAns("");
    setQid("");
    setAnalyzeOut(null);
    setMisOut(null);
    setDiffOut(null);
    setError(null);
  };

  const onAnalyze = async () => {
    setLoading("analyze");
    setError(null);
    try {
      const payload: AnalyzeReq = { question_text: question, ideal_answer_text: ideal, user_answer_text: userAns };
      if (qidNumber !== undefined) payload.qid = qidNumber;
      const data = await callApi<any>("/api/analyze/freeform", payload);
      setAnalyzeOut(data);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(null);
    }
  };

  const onMis = async () => {
    setLoading("mis");
    setError(null);
    try {
      const payload: MisReq = { user_answer_text: userAns };
      if (qidNumber !== undefined) payload.qid = qidNumber;
      const data = await callApi<any>("/api/predict_misconception", payload);
      setMisOut(data);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(null);
    }
  };

  const onDiff = async () => {
    setLoading("diff");
    setError(null);
    try {
      const payload: DiffReq = { question_text: question };
      if (qidNumber !== undefined) payload.qid = qidNumber;
      const data = await callApi<any>("/api/estimate_difficulty", payload);
      setDiffOut(data);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(null);
    }
  };

  const Progress = ({ value, label }: { value: number; label: string }) => {
    const [display, setDisplay] = useState(0);
    const rafRef = useRef<number | null>(null);
    const startRef = useRef<number | null>(null);
    const fromRef = useRef(0);
    const target = Math.min(100, Math.max(0, value * 100));

    useEffect(() => {
      fromRef.current = display;
      startRef.current = null;
      const duration = 400;
      const step = (t: number) => {
        if (startRef.current === null) startRef.current = t;
        const p = Math.min(1, (t - startRef.current) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const next = fromRef.current + (target - fromRef.current) * eased;
        setDisplay(next);
        if (p < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [target]);

    return (
      <div className="w-full">
        <div className="flex justify-between text-xs mb-1"><span>{label}</span><span>{Math.round(display)}%</span></div>
        <div className="h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-2 transition-[width] duration-300 ease-out"
            style={{
              width: `${target}%`,
              background: `linear-gradient(90deg, var(--accent-1), var(--accent-2), var(--accent-3))`,
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen px-6 py-10 sm:px-10 vignette bg-cool">
      {loading && <div className="top-loader" />}
      <div className="absolute left-1/2 -translate-x-1/2 top-12 pointer-events-none">
        <div className="blob blob-1" style={{opacity:0.12}} />
        <div className="blob blob-2" style={{opacity:0.08, marginTop: -80}} />
        <div className="blob blob-3" style={{opacity:0.06, marginTop: -40}} />
      </div>
      <div className="relative max-w-5xl mx-auto">
        <nav className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-1)] to-[var(--accent-2)] flex items-center justify-center text-white font-bold">MI</div>
            <div>
              <div className="text-sm text-contrast-muted">Tool</div>
              <div className="text-lg font-semibold text-surface-contrast">Misconception + IRT</div>
            </div>
          </div>
          <div>
            <ThemeToggle />
          </div>
        </nav>

        <div className="app-shell bg-glass p-6 rounded-2xl border-gradient">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="col-span-1">
              <div className="card-lg">
                <h2 className="font-semibold mb-2 text-surface-contrast">Inputs</h2>
                <p className="text-contrast-muted text-sm mb-3">Question, ideal answer, and student response.</p>
                <div className="space-y-3">
                  <textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Question" className="textarea" />
                  <textarea value={ideal} onChange={e=>setIdeal(e.target.value)} placeholder="Ideal (reference) answer" className="textarea" />
                  <textarea value={userAns} onChange={e=>setUserAns(e.target.value)} placeholder="User answer" className="textarea" />
                  <input value={qid} onChange={e=>setQid(e.target.value)} placeholder="Optional qid (number)" className="input" />
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={loadSample} className="btn btn-primary">Load sample</button>
                  <button onClick={clearAll} className="btn btn-ghost">Clear</button>
                </div>
              </div>
            </div>

            <div className="col-span-2 grid grid-rows-3 gap-6">
              <div className="card-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">One-shot Analyze</h3>
                    <p className="text-contrast-muted text-sm">Compare user answer to ideal and get guidance.</p>
                  </div>
                  <div>
                    <button
                      onClick={onAnalyze}
                      disabled={disabledAnalyze || loading!==null}
                      aria-busy={loading==="analyze"}
                      aria-label="Analyze user answer"
                      className="btn btn-primary"
                    >
                      {loading==="analyze"? 'Analyzing...' : 'Analyze'}
                    </button>
                  </div>
                </div>

                {analyzeOut ? (
                  <div className="mt-4 w-full space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-2/3">
                        <Progress value={analyzeOut?.similarity?.user_vs_ideal ?? 0} label="User vs Ideal" />
                      </div>
                      <div className="w-1/3 text-right text-sm text-contrast-muted">
                        <div>Score: <strong><CountUp value={(analyzeOut?.similarity?.user_vs_ideal ?? 0) * 100} decimals={0} suffix="%" /></strong></div>
                      </div>
                    </div>

                    {analyzeOut?.guidance && (
                      <div className="text-sm text-contrast-muted">{analyzeOut.guidance}</div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-contrast-muted">No analysis yet. Provide inputs and click <strong>Analyze</strong>.</div>
                )}
              </div>

              <div className="card-lg grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Predict Misconception</h3>
                  <p className="text-contrast-muted text-sm">Estimate label, confidence and risk.</p>
                </div>
                <div className="text-right">
                  <button onClick={onMis} disabled={disabledMis || loading!==null} aria-busy={loading==="mis"} className="btn btn-primary">Predict</button>
                </div>
                <div className="col-span-2">
                  {misOut ? (
                    <div className="mt-2 text-sm text-contrast-muted" aria-live="polite">
                      <div>Label: <strong>{misOut.label}</strong></div>
                      <div>Confidence: <strong>{((misOut.confidence||0) * 100).toFixed(1)}%</strong></div>
                      {misOut.risk !== undefined && <div>Risk: <strong>{(misOut.risk*100).toFixed(0)}%</strong></div>}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-contrast-muted">No prediction yet.</div>
                  )}
                </div>
              </div>

              <div className="card-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Estimate Difficulty</h3>
                    <p className="text-contrast-muted text-sm">Question difficulty and bucket.</p>
                  </div>
                  <button onClick={onDiff} disabled={disabledDiff || loading!==null} className="btn btn-primary">Estimate</button>
                </div>
                {diffOut ? (
                  <div className="mt-3 text-sm text-contrast-muted" aria-live="polite">
                    <div>Norm: <strong>{(diffOut.difficulty_norm ?? 0).toFixed(3)}</strong></div>
                    <div>Bucket: <strong>{diffOut.bucket}</strong></div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-contrast-muted">No estimate yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-3 rounded-lg border border-red-300/40 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

  <footer className="mt-10 text-xs text-contrast-muted" role="contentinfo" aria-label="Footer" />
      </div>
    </div>
  );
}
