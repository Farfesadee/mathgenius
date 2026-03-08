import { useState, useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getTheoryQuestions, getTheoryTopics, getTheoryYears, getMarkingScheme } from '../lib/theory'
import { askTutor } from '../services/api'
import { ExplanationBody } from '../utils/RenderMath'

const EXAM_TYPES = ['All', 'WAEC', 'NECO', 'BECE', 'NABTEB']

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Helpers ───────────────────────────────────────────────────────────

function examBadgeColor(type) {
  const colors = {
    WAEC:   'text-blue-600',
    NECO:   'text-green-600',
    BECE:   'text-purple-600',
    NABTEB: 'text-orange-600',
  }
  return colors[type] || 'text-[var(--color-muted)]'
}

// ── Visual renderers ──────────────────────────────────────────────────

function ChartVisual({ configJson }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let config;
    try {
      config = typeof configJson === "string" ? JSON.parse(configJson) : configJson;
    } catch { return; }

    const loadChart = async () => {
      if (!window.Chart) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = new window.Chart(canvasRef.current, config);
    };

    loadChart().catch(console.error);
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [configJson]);

  return (
    <div className="my-4 max-w-lg mx-auto">
      <p className="font-mono text-[10px] uppercase tracking-widest
                    text-[var(--color-teal)] mb-2">Graph</p>
      <canvas ref={canvasRef} />
    </div>
  );
}

function SvgVisual({ content }) {
  return (
    <div className="my-4">
      <p className="font-mono text-[10px] uppercase tracking-widest
                    text-[var(--color-teal)] mb-2">Diagram</p>
      <div className="flex justify-center"
           dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}

function TableVisual({ content }) {
  return (
    <div className="my-4 overflow-x-auto">
      <p className="font-mono text-[10px] uppercase tracking-widest
                    text-[var(--color-teal)] mb-2">Table</p>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}

function ScrapedImage({ path }) {
  const url = path.startsWith('http')
    ? path
    : `${API_BASE}/images/${path.replace(/^images\//, "")}`;
  return (
    <div className="my-3 flex justify-center">
      <img
        src={url}
        alt="Solution diagram"
        className="max-w-full max-h-80 rounded-xl border-2
                   border-[var(--color-border)] object-contain"
        onError={e => { e.target.style.display = "none"; }}
      />
    </div>
  );
}

// ── QuestionCard ──────────────────────────────────────────────────────

export function QuestionCard({ q, index }) {
  const { user } = useAuth();
  const [mode,     setMode]     = useState(null);
  const [answer,   setAnswer]   = useState('');
  const [feedback, setFeedback] = useState(null);
  const [solution, setSolution] = useState(null);
  const [loading,  setLoading]  = useState(false);

  const callEuler = async (prompt) => {
    setLoading(true);
    try {
      const res = await askTutor(prompt, q.topic || 'Mathematics', 'secondary', [], user?.id);
      return res.data.response || res.data.answer || '';
    } catch {
      return 'Could not connect to Euler. Please check your connection and try again.';
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) return;

    const prompt = q.marking_scheme
      ? `You are a WAEC/NECO mathematics examiner.

QUESTION: ${q.question_text}

OFFICIAL MARKING SCHEME:
${q.marking_scheme}

STUDENT'S ANSWER:
${answer}

Compare the student's answer to the official marking scheme and:
1. Give a SCORE out of 10
2. List what they got right
3. List what was missing or wrong
4. Show the complete official solution
5. Give an encouraging comment`
      : `You are a WAEC/NECO mathematics examiner marking a student's answer.

QUESTION: ${q.question_text}

STUDENT'S ANSWER:
${answer}

Please mark with: SCORE, WHAT YOU GOT RIGHT, WHAT WAS MISSING, COMPLETE SOLUTION, EXAMINER'S COMMENT`;

    const reply = await callEuler(prompt);
    setFeedback(reply);
  };

  const handleViewSolution = async () => {
    if (solution) return;
    setLoading(true);
    try {
      const scheme = await getMarkingScheme(q.id, q.exam_type);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(`${API_BASE}/api/solution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question:        q.question_text,
          question_images: q.image_url ? [q.image_url] : [],
          marking_scheme:  scheme,
          answer_images:   q.answer_images || [],
          exam_type:       q.exam_type?.toLowerCase() || "waec",
          year:            String(q.year || ""),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSolution({ text: data.solution_text, visual: data.visual });

    } catch (err) {
      console.warn("solution_generator failed, falling back to Euler:", err);
      setSolution({
        text: "Solution temporarily unavailable. Please try Regenerate.",
        visual: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMode(null);
    setAnswer('');
    setFeedback(null);
    setSolution(null);
  };

  return (
    <div className="border-2 border-[var(--color-border)] rounded-2xl overflow-hidden
                    bg-[var(--color-paper)] transition-all">

      {/* Question header */}
      <div className="flex items-start gap-3 p-5">
        <span className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-teal)]
                          text-white text-xs font-bold flex items-center
                          justify-center mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--color-ink)] leading-relaxed space-y-1">
            {q.question_text.split(/(?=\b(?:a|b|c|d|e|f|i{1,3}|iv|v)\.\s|\n)/i).map((part, i) => (
              part.trim() && <p key={i} className="mb-1">{part.trim()}</p>
            ))}
          </div>
          <div className="flex gap-3 mt-2 text-xs font-mono">
            {q.exam_type && (
              <span className={examBadgeColor(q.exam_type)}>
                {q.exam_type} {q.year}
              </span>
            )}
            {q.topic && (
              <span className="text-[var(--color-muted)]">· {q.topic}</span>
            )}
          </div>
        </div>
      </div>

      {/* Question image */}
      {q.image_url && (
        <div className="px-5 pb-4 flex justify-center">
          <img
            src={q.image_url}
            alt="Question diagram"
            className="max-w-full max-h-72 rounded-xl border-2
                       border-[var(--color-border)] object-contain"
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>
      )}

      {/* Action buttons */}
      {!mode && (
        <div className="px-5 pb-5 flex gap-3 flex-wrap">
          <button
            onClick={() => setMode('attempt')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                       bg-[var(--color-teal)] text-white text-sm font-semibold
                       hover:opacity-90 transition-opacity">
            Attempt & Get Marked
          </button>
          <button
            onClick={() => { setMode('solution'); handleViewSolution(); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                       border-2 border-[var(--color-border)] text-sm font-semibold
                       text-[var(--color-ink)] hover:border-[var(--color-teal)]
                       transition-colors bg-[var(--color-paper)]">
            View Full Solution
          </button>
        </div>
      )}

      {/* ATTEMPT MODE */}
      {mode === 'attempt' && !feedback && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-cream)] p-5">
          <label className="font-mono text-[10px] uppercase tracking-widest
                             text-[var(--color-teal)] block mb-2">
            Your Answer — show all workings
          </label>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Write your full solution here..."
            rows={7}
            className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                       focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                       text-sm transition-colors resize-none"
          />
          <div className="flex gap-3 mt-3">
            <button
              onClick={handleSubmitAnswer}
              disabled={!answer.trim() || loading}
              className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2
                         disabled:opacity-50">
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30
                                   border-t-white rounded-full animate-spin" />
                  Euler is marking...
                </>
              ) : 'Submit for Marking'}
            </button>
            <button onClick={reset}
              className="px-4 py-2.5 text-sm text-[var(--color-muted)]
                         hover:text-[var(--color-ink)] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ATTEMPT — feedback */}
      {mode === 'attempt' && feedback && (
        <div className="border-t border-[var(--color-border)] p-5">
          <div className="bg-[#e8f4f4] border border-[var(--color-teal)]
                          rounded-2xl p-5 mb-4">
            <p className="font-mono text-[10px] uppercase tracking-widest
                           text-[var(--color-teal)] mb-3">
              Euler's Marking & Solution
            </p>
            <ExplanationBody text={feedback} />
          </div>
          <button onClick={reset} className="btn-secondary px-5 py-2 text-sm">
            Try Again
          </button>
        </div>
      )}

      {/* SOLUTION MODE */}
      {mode === 'solution' && (
        <div className="border-t border-[var(--color-border)] p-5">
          {loading ? (
            <div className="flex items-center gap-3 py-6 justify-center">
              <span className="w-5 h-5 border-2 border-[var(--color-teal)]
                               border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--color-muted)]">
                Generating solution...
              </p>
            </div>
          ) : solution ? (
            <div>
              <div className="bg-[#e8f4f4] border border-[var(--color-teal)]
                              rounded-2xl p-5 mb-4">
                <p className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-teal)] mb-3">
                  Full Solution
                </p>

                {(q.answer_images || []).map((img, i) => (
                  <ScrapedImage key={i} path={img} />
                ))}

                <ExplanationBody text={solution.text
                  .replace(/```json[\s\S]*?```/g, '')
                  .replace(/"visual"\s*:\s*\{[\s\S]*?\}\s*}/g, '')
                  .trim()
                } />

                {solution.visual?.type === "chartjs" && solution.visual.content && (
                  <ChartVisual configJson={solution.visual.content} />
                )}
                {solution.visual?.type === "svg" && solution.visual.content && (
                  <SvgVisual content={solution.visual.content} />
                )}
                {solution.visual?.type === "table" && solution.visual.content && (
                  <TableVisual content={solution.visual.content} />
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { reset(); setMode('attempt'); }}
                  className="btn-primary px-5 py-2 text-sm">
                  Now Try It Yourself
                </button>
                <button
                  onClick={() => { setSolution(null); handleViewSolution(); }}
                  className="btn-secondary px-5 py-2 text-sm">
                  Regenerate
                </button>
                <button onClick={reset} className="btn-secondary px-5 py-2 text-sm">
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}


// ── TheoryPractice page ───────────────────────────────────────────────

export default function TheoryPractice() {
  const navigate  = useNavigate()
  const [examType,  setExamType]  = useState('WAEC')
  const [topic,     setTopic]     = useState('')
  const [year,      setYear]      = useState('')
  const [questions, setQuestions] = useState([])
  const [topics,    setTopics]    = useState([])
  const [years,     setYears]     = useState([])
  const [loading,   setLoading]   = useState(false)
  const [total,     setTotal]     = useState(0)

  useEffect(() => { loadFilters() }, [examType])
  useEffect(() => { loadQuestions() }, [examType, topic, year])

  const loadFilters = async () => {
    const [t, y] = await Promise.all([
      getTheoryTopics(examType === 'All' ? null : examType),
      getTheoryYears(examType  === 'All' ? null : examType),
    ])
    setTopics(t)
    setYears(y)
  }

  const loadQuestions = async () => {
    setLoading(true)
    const { data } = await getTheoryQuestions({
      examType: examType === 'All' ? null : examType,
      topic:    topic || null,
      year:     year  ? parseInt(year) : null,
      limit:    50,
    })
    setQuestions(data)
    setTotal(data.length)
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase
                      text-[var(--color-gold)] mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" />
          Theory Practice
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight mb-2">
          WAEC, NECO, BECE & NABTEB Theory
        </h1>
        <p className="text-[var(--color-muted)] text-lg">
          Attempt past questions and get marked by Euler, or view full solutions instantly.
        </p>
      </div>

      {/* Filters */}
      <div className="border-2 border-[var(--color-border)] rounded-2xl
                      overflow-hidden mb-8">
        <div className="bg-[var(--color-teal)] px-6 py-4">
          <p className="font-serif font-bold text-white">Filter Questions</p>
        </div>
        <div className="bg-[var(--color-paper)] p-5
                        grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-muted)] block mb-2">
              Exam Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {EXAM_TYPES.map(et => (
                <button key={et}
                  onClick={() => { setExamType(et); setTopic(''); setYear('') }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold
                              border-2 transition-all
                    ${examType === et
                      ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                      : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                  {et}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-muted)] block mb-2">
              Topic
            </label>
            <select value={topic} onChange={e => setTopic(e.target.value)}
              className="w-full bg-[var(--color-paper)] border-2
                         border-[var(--color-border)]
                         focus:border-[var(--color-teal)] rounded-xl
                         px-3 py-2 text-sm">
              <option value="">All Topics</option>
              {topics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-muted)] block mb-2">
              Year
            </label>
            <select value={year} onChange={e => setYear(e.target.value)}
              className="w-full bg-[var(--color-paper)] border-2
                         border-[var(--color-border)]
                         focus:border-[var(--color-teal)] rounded-xl
                         px-3 py-2 text-sm">
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-[var(--color-teal)]
                          border-t-transparent rounded-full animate-spin
                          mx-auto mb-4" />
          <p className="text-[var(--color-muted)]">Loading questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-20 border-2 border-[var(--color-border)]
                        rounded-2xl bg-[var(--color-paper)]">
          <p className="text-4xl mb-4">📭</p>
          <p className="text-[var(--color-muted)]">
            No questions found. Try different filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-muted)] font-mono mb-2">
            {total} question{total !== 1 ? 's' : ''} found
          </p>
          {questions.map((q, i) => (
            <QuestionCard key={q.id} q={q} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
