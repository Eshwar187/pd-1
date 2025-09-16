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
      <div className="relative max-w-6xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Misconception <span className="text-gradient">+ IRT</span> Analyzer</h1>
              <p className="text-sm text-black/60 dark:text-white/60 mt-2">Analyze answers, predict misconceptions, and estimate difficulty — fast.</p>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <div className="divider" />

        <section className="grid md:grid-cols-2 gap-8">
          <div className="card card-appear" style={{ animationDelay: '40ms' }}>
            <h2 className="font-medium mb-1">Inputs</h2>
            <p className="text-xs text-black/50 dark:text-white/50 mb-3">Provide the question, an ideal reference answer, and the learner’s answer.</p>
            <div className="space-y-3">
              <textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Question" className="textarea" />
              <textarea value={ideal} onChange={e=>setIdeal(e.target.value)} placeholder="Ideal (reference) answer" className="textarea" />
              <textarea value={userAns} onChange={e=>setUserAns(e.target.value)} placeholder="User answer" className="textarea" />
              <input value={qid} onChange={e=>setQid(e.target.value)} placeholder="Optional qid (number)" className="input" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={loadSample} className="btn btn-primary">Load sample</button>
              <button onClick={clearAll} className="btn btn-ghost">Clear</button>
            </div>
          </div>

          <div className="grid grid-rows-3 gap-6">
            <div className="card card-appear" style={{ animationDelay: '80ms' }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">One-shot Analyze</h3>
                <button
                  onClick={onAnalyze}
                  disabled={disabledAnalyze || loading!==null}
                  aria-busy={loading==="analyze"}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {loading==="analyze" ? (
                    <span className="inline-flex items-center gap-2"><span className="spinner" /> Analyzing...</span>
                  ) : (
                    "Analyze"
                  )}
                </button>
              </div>
              <p className="text-xs text-black/50 dark:text-white/50 mb-2">Compare the learner answer to the ideal and highlight guidance.</p>
              {loading==="analyze" && (
                <div className="space-y-2 mt-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-2 w-full" />
                  <div className="skeleton h-2 w-5/6" />
                  <div className="skeleton h-20 w-full" />
                </div>
              )}
              {analyzeOut && !loading && (
                <div className="space-y-3 fade-in">
                  <Progress value={analyzeOut?.similarity?.user_vs_ideal ?? 0} label="User vs Ideal" />
                  <Progress value={analyzeOut?.similarity?.question_vs_ideal ?? 0} label="Question vs Ideal" />
                  <Progress value={(analyzeOut?.answer_score ?? 0)} label="Answer Score" />
                  <div className="mt-2 text-sm">
                    <div className="font-medium mb-1">Guidance</div>
                    <p className="text-black/70 dark:text-white/70">{analyzeOut?.guidance}</p>
                  </div>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-sm opacity-80">Details (JSON)</summary>
                    <pre className="mt-2 text-xs overflow-auto p-2 rounded bg-black/5 dark:bg-white/10">{JSON.stringify(analyzeOut, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>

            <div className="card card-appear" style={{ animationDelay: '120ms' }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Predict Misconception</h3>
                <button
                  onClick={onMis}
                  disabled={disabledMis || loading!==null}
                  aria-busy={loading==="mis"}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {loading==="mis" ? (
                    <span className="inline-flex items-center gap-2"><span className="spinner" /> Predicting...</span>
                  ) : (
                    "Predict"
                  )}
                </button>
              </div>
              <p className="text-xs text-black/50 dark:text-white/50 mb-2">Estimate likely misconception with confidence and risk.</p>
              {loading==="mis" && (
                <div className="space-y-2 mt-2">
                  <div className="skeleton h-4 w-1/4" />
                  <div className="skeleton h-2 w-2/3" />
                  <div className="skeleton h-2 w-1/2" />
                </div>
              )}
              {misOut && !loading && (
                <div className="space-y-2 text-sm fade-in">
                  <div className="flex gap-2 items-center">
                    <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-xs">label: {misOut?.label}</span>
                    {typeof misOut?.confidence === 'number' && (
                      <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-xs">confidence: <CountUp value={(misOut?.confidence||0)*100} decimals={0} suffix="%" /></span>
                    )}
                    {typeof misOut?.risk === 'number' && (
                      <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-xs">risk: <CountUp value={(misOut?.risk||0)*100} decimals={0} suffix="%" /></span>
                    )}
                  </div>
                  <details>
                    <summary className="cursor-pointer opacity-80">Full JSON</summary>
                    <pre className="mt-2 text-xs overflow-auto p-2 rounded bg-black/5 dark:bg-white/10">{JSON.stringify(misOut, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>

            <div className="card card-appear" style={{ animationDelay: '160ms' }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Estimate Difficulty</h3>
                <button
                  onClick={onDiff}
                  disabled={disabledDiff || loading!==null}
                  aria-busy={loading==="diff"}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {loading==="diff" ? (
                    <span className="inline-flex items-center gap-2"><span className="spinner" /> Estimating...</span>
                  ) : (
                    "Estimate"
                  )}
                </button>
              </div>
              <p className="text-xs text-black/50 dark:text-white/50 mb-2">Infer question difficulty and bucket assignment.</p>
              {loading==="diff" && (
                <div className="space-y-2 mt-2">
                  <div className="skeleton h-4 w-1/5" />
                  <div className="skeleton h-2 w-2/3" />
                </div>
              )}
              {diffOut && !loading && (
                <div className="space-y-2 text-sm fade-in">
                  <div className="flex gap-2 items-center">
                    {typeof diffOut?.difficulty_norm === 'number' && <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-xs">norm: <CountUp value={diffOut?.difficulty_norm||0} decimals={3} /></span>}
                    {diffOut?.bucket && <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-xs">bucket: {diffOut?.bucket}</span>}
                    {diffOut?.qid !== undefined && <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-xs">qid: {diffOut?.qid}</span>}
                  </div>
                  <details>
                    <summary className="cursor-pointer opacity-80">Full JSON</summary>
                    <pre className="mt-2 text-xs overflow-auto p-2 rounded bg-black/5 dark:bg-white/10">{JSON.stringify(diffOut, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>
          </div>
  </section>

        {error && (
          <div className="mt-6 p-3 rounded-lg border border-red-300/40 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <footer className="mt-10 text-xs text-black/50 dark:text-white/50">
          Set BACKEND_URL env for Next.js server to reach FastAPI. Example (PowerShell):
          <pre className="mt-1 bg-black/5 dark:bg-white/10 p-2 rounded">$env:BACKEND_URL = "http://127.0.0.1:8000"</pre>
        </footer>
      </div>
    </div>
  );
}
