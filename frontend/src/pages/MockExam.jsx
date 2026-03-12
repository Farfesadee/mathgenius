import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { fetchCBTQuestions } from '../lib/cbt'
import { ExplanationBody } from '../utils/RenderMath'
import { explainCBTAnswer } from '../services/api'
import ShareResultCard from '../components/ShareResultCard'
import { TestimonialPrompt } from '../components/TestimonialModal'

const EXAM_CONFIG = {
  WAEC:   { label: 'WAEC', color: '#1a8a7a', questions: 50, minutes: 90,  emoji: '📗' },
  NECO:   { label: 'NECO', color: '#2a6bc1', questions: 50, minutes: 90,  emoji: '📘' },
  BECE:   { label: 'BECE', color: '#c17c2a', questions: 50, minutes: 80,  emoji: '📙' },
  JAMB:   { label: 'JAMB', color: '#7c3aed', questions: 60, minutes: 100, emoji: '📕' },
}

const GRADE_BANDS = [
  { min: 75, grade: 'A1', label: 'Distinction',  color: 'text-emerald-600' },
  { min: 70, grade: 'B2', label: 'Very Good',    color: 'text-green-600'   },
  { min: 65, grade: 'B3', label: 'Good',         color: 'text-green-500'   },
  { min: 60, grade: 'C4', label: 'Credit',       color: 'text-blue-600'    },
  { min: 55, grade: 'C5', label: 'Credit',       color: 'text-blue-500'    },
  { min: 50, grade: 'C6', label: 'Credit',       color: 'text-sky-600'     },
  { min: 45, grade: 'D7', label: 'Pass',         color: 'text-yellow-600'  },
  { min: 40, grade: 'E8', label: 'Pass',         color: 'text-orange-500'  },
  { min: 0,  grade: 'F9', label: 'Fail',         color: 'text-red-600'     },
]

function getGrade(pct) {
  return GRADE_BANDS.find(b => pct >= b.min) || GRADE_BANDS[GRADE_BANDS.length - 1]
}

function formatTime(secs) {
  const m = Math.floor(secs / 60), s = secs % 60
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function OptionBtn({ letter, text, selected, correct, revealed, onClick }) {
  let cls = 'border-[var(--color-border)] bg-white hover:border-[var(--color-teal)] hover:bg-[#e8f4f4]/60'
  if (revealed) {
    if (letter === correct)                     cls = 'border-green-500 bg-green-50 text-green-800'
    else if (letter === selected)               cls = 'border-red-400 bg-red-50 text-red-700'
    else                                        cls = 'border-[var(--color-border)] opacity-50'
  } else if (selected === letter) {
    cls = 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
  }
  return (
    <button onClick={() => !revealed && onClick(letter)} disabled={revealed}
      className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl
                  border-2 transition-all duration-150 ${cls}`}>
      <span className="shrink-0 w-7 h-7 rounded-full border-2 border-current
                       flex items-center justify-center text-xs font-bold mt-0.5">
        {letter}
      </span>
      <span className="text-sm leading-snug flex-1">{text}</span>
      {revealed && letter === correct  && <span className="shrink-0 text-green-600 text-lg">✓</span>}
      {revealed && letter === selected && letter !== correct && <span className="shrink-0 text-red-500 text-lg">✗</span>}
    </button>
  )
}

export default function MockExam() {
  const { user } = useAuth()

  // Setup
  const [examType,  setExamType]  = useState('WAEC')
  const [year,      setYear]      = useState('')
  const [years,     setYears]     = useState([])
  const [phase,     setPhase]     = useState('setup')   // setup | exam | review

  // Exam
  const [questions,  setQuestions]  = useState([])
  const [answers,    setAnswers]    = useState({})      // { idx: 'A'|'B'|'C'|'D' }
  const [current,    setCurrent]    = useState(0)
  const [flagged,    setFlagged]    = useState(new Set())
  const [timeLeft,   setTimeLeft]   = useState(0)
  const [loading,    setLoading]    = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const timerRef = useRef(null)

  // Review
  const [result,      setResult]      = useState(null)
  const [showShareCard, setShowShareCard] = useState(false)
  const [revealed,  setRevealed]  = useState({})
  const [explaining, setExplaining] = useState(null)
  const [explanations, setExplanations] = useState({})

  const cfg = EXAM_CONFIG[examType]

  useEffect(() => {
    loadYears()
  }, [examType])

  const loadYears = async () => {
    const { data } = await supabase
      .from('exam_questions')
      .select('year')
      .eq('exam_type', examType)
      .not('year', 'is', null)
    const unique = [...new Set((data || []).map(r => r.year))].sort((a,b) => b - a)
    setYears(unique)
    setYear('')
  }

  const startExam = async () => {
    setLoading(true)
    const { data: qs } = await fetchCBTQuestions({
      examType,
      year: year ? parseInt(year) : null,
      count: cfg.questions,
    })
    if (!qs?.length) { setLoading(false); return }
    setQuestions(qs)
    setAnswers({})
    setFlagged(new Set())
    setCurrent(0)
    setTimeLeft(cfg.minutes * 60)
    setPhase('exam')
    setLoading(false)
  }

  // Countdown
  useEffect(() => {
    if (phase !== 'exam') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); submitExam(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  const submitExam = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    clearInterval(timerRef.current)

    const timeTaken = cfg.minutes * 60 - timeLeft
    let correct = 0
    questions.forEach((q, i) => {
      if (answers[i] === q.correct_answer) correct++
    })
    const pct   = Math.round((correct / questions.length) * 100)
    const grade = getGrade(pct)

    // Save to DB
    if (user) {
      await supabase.from('mock_exam_sessions').insert({
        user_id:      user.id,
        exam_type:    examType,
        year:         year ? parseInt(year) : null,
        total_q:      questions.length,
        score:        correct,
        pct,
        time_taken:   timeTaken,
        answers:      answers,
        completed_at: new Date().toISOString(),
      })
    }

    setResult({ correct, total: questions.length, pct, grade, timeTaken })
    setPhase('review')
    setSubmitting(false)
  }, [questions, answers, examType, year, timeLeft, user, submitting])

  const explainQ = async (idx) => {
    if (explanations[idx] || explaining === idx) return
    setExplaining(idx)
    const q = questions[idx]
    try {
      const res = await explainCBTAnswer({
        question_text: q.question_text,
        option_a: q.option_a, option_b: q.option_b,
        option_c: q.option_c, option_d: q.option_d,
        correct_answer: q.correct_answer,
        student_answer: answers[idx] || '—',
        topic: q.topic,
      })
      setExplanations(e => ({ ...e, [idx]: res.data.explanation }))
    } catch { setExplanations(e => ({ ...e, [idx]: 'Could not load explanation.' })) }
    setExplaining(null)
  }

  const answered  = Object.keys(answers).length
  const remaining = questions.length - answered
  const pctDone   = questions.length ? Math.round((answered / questions.length) * 100) : 0

  // ── SETUP ──────────────────────────────────────────────────────
  if (phase === 'setup') return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase text-[var(--color-gold)]
                      mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" /> Mock Exam Mode
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight">Full Mock Exam</h1>
        <p className="text-[var(--color-muted)] mt-2 text-lg">
          Timed full-length papers pulled from past WAEC, NECO, BECE and JAMB question banks.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {Object.entries(EXAM_CONFIG).map(([type, c]) => (
          <button key={type} onClick={() => setExamType(type)}
            className={`rounded-2xl p-4 border-2 text-left transition-all
              ${examType === type ? 'border-transparent text-white shadow-lg' : 'border-[var(--color-border)] hover:border-current'}`}
            style={examType === type ? { backgroundColor: c.color } : {}}>
            <div className="text-2xl mb-1">{c.emoji}</div>
            <div className="font-bold text-sm">{c.label}</div>
            <div className={`text-xs mt-0.5 ${examType === type ? 'text-white/70' : 'text-[var(--color-muted)]'}`}>
              {c.questions}q · {c.minutes}min
            </div>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center gap-3"
             style={{ backgroundColor: cfg.color + '15' }}>
          <span className="text-2xl">{cfg.emoji}</span>
          <div>
            <p className="font-bold" style={{ color: cfg.color }}>{cfg.label} Mock Exam</p>
            <p className="text-xs text-[var(--color-muted)]">
              {cfg.questions} questions · {cfg.minutes} minutes · WAEC grading scale
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] block mb-2">
              Year (optional — blank = all years mixed)
            </label>
            <select value={year} onChange={e => setYear(e.target.value)}
              className="w-full border-2 border-[var(--color-border)] focus:border-[var(--color-teal)]
                         rounded-xl px-4 py-3 text-sm bg-[var(--color-paper)]">
              <option value="">All years mixed</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Questions', value: cfg.questions },
              { label: 'Time',      value: `${cfg.minutes} min` },
              { label: 'Grading',   value: 'WAEC scale' },
            ].map(s => (
              <div key={s.label} className="bg-[var(--color-cream)] rounded-xl p-3">
                <div className="font-serif font-black text-xl" style={{ color: cfg.color }}>{s.value}</div>
                <div className="text-xs text-[var(--color-muted)] font-mono uppercase mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            ⏱️ Once started the timer cannot be paused. Answer all questions — unanswered questions
            count as wrong. You can flag questions to review before submitting.
          </div>

          <button onClick={startExam} disabled={loading}
            className="w-full py-4 rounded-xl text-white font-bold text-base
                       flex items-center justify-center gap-2 disabled:opacity-50 transition-all
                       hover:opacity-90"
            style={{ backgroundColor: cfg.color }}>
            {loading
              ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Loading questions...</>
              : `${cfg.emoji} Start ${cfg.label} Mock Exam`
            }
          </button>
        </div>
      </div>
    </div>
  )

  const q = questions[current]

  // ── EXAM ───────────────────────────────────────────────────────
  if (phase === 'exam') return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-[var(--color-paper)] border-b-2 border-[var(--color-border)]
                      px-4 py-3 mb-6 -mx-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-sm" style={{ color: cfg.color }}>
            {cfg.emoji} {cfg.label}
          </span>
          <span className="text-xs text-[var(--color-muted)] font-mono">
            Q {current + 1}/{questions.length}
          </span>
          <span className="text-xs text-[var(--color-muted)]">
            {answered}/{questions.length} answered
          </span>
        </div>

        <div className="flex items-center gap-3">
          {remaining > 0 && (
            <span className="text-xs text-amber-600 font-semibold">
              {remaining} unanswered
            </span>
          )}
          <span className={`font-mono font-bold text-lg px-3 py-1 rounded-lg border-2
            ${timeLeft < 300 ? 'text-red-600 border-red-300 bg-red-50 animate-pulse'
            : timeLeft < 600 ? 'text-orange-600 border-orange-300 bg-orange-50'
            : 'text-green-700 border-green-300 bg-green-50'}`}>
            ⏱ {formatTime(timeLeft)}
          </span>
          <button onClick={() => { if (confirm('Submit exam? Unanswered questions will be marked wrong.')) submitExam() }}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-50"
            style={{ backgroundColor: cfg.color }}>
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_200px] gap-6">
        {/* Question */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-ink)] px-5 py-3 flex items-center justify-between">
              <span className="text-white font-semibold text-sm">Question {current + 1}</span>
              <div className="flex items-center gap-2">
                {q.topic && <span className="text-white/40 text-xs font-mono">{q.topic}</span>}
                <button onClick={() => setFlagged(f => {
                    const n = new Set(f)
                    f.has(current) ? n.delete(current) : n.add(current)
                    return n
                  })}
                  className={`text-xs px-2 py-1 rounded-lg font-semibold transition-colors
                    ${flagged.has(current) ? 'bg-amber-400 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                  {flagged.has(current) ? '🚩 Flagged' : '🏳 Flag'}
                </button>
              </div>
            </div>
            <div className="bg-white p-6">
              <p className="text-[var(--color-ink)] text-base leading-relaxed font-medium">
                {q.question_text}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {['A','B','C','D'].map(letter => (
              <OptionBtn key={letter} letter={letter}
                text={q[`option_${letter.toLowerCase()}`]}
                selected={answers[current]}
                correct={null} revealed={false}
                onClick={l => setAnswers(a => ({ ...a, [current]: l }))} />
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setCurrent(c => Math.max(0, c - 1))}
              disabled={current === 0}
              className="flex-1 py-3 rounded-xl border-2 border-[var(--color-border)]
                         text-sm font-semibold disabled:opacity-40 hover:border-[var(--color-ink)]">
              ← Previous
            </button>
            <button onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
              disabled={current === questions.length - 1}
              className="flex-1 py-3 rounded-xl text-white text-sm font-bold
                         disabled:opacity-40 hover:opacity-90"
              style={{ backgroundColor: cfg.color }}>
              Next →
            </button>
          </div>
        </div>

        {/* Mini navigator */}
        <div className="hidden xl:block">
          <div className="card p-3 sticky top-24">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-3">
              Navigator
            </p>
            <div className="grid grid-cols-5 gap-1">
              {questions.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all
                    ${i === current ? 'text-white' : ''}
                    ${answers[i] ? (i === current ? 'opacity-100' : 'bg-[var(--color-teal)]/20 text-[var(--color-teal)]') : 'bg-[var(--color-cream)] text-[var(--color-muted)]'}
                    ${flagged.has(i) ? 'ring-2 ring-amber-400' : ''}`}
                  style={i === current ? { backgroundColor: cfg.color } : {}}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1 text-xs text-[var(--color-muted)]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[var(--color-teal)]/20" /> Answered
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-[var(--color-cream)]" /> Unanswered
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded ring-2 ring-amber-400" /> Flagged
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── REVIEW ─────────────────────────────────────────────────────
  const { grade } = result
  return (
    <>
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Score card */}
      <div className="card overflow-hidden mb-8">
        <div className="px-6 py-8 text-center" style={{ backgroundColor: cfg.color }}>
          <div className="text-7xl font-black font-serif text-white mb-1">{grade.grade}</div>
          <div className="text-white/80 font-mono text-xs uppercase tracking-widest">{grade.label}</div>
        </div>
        <div className="bg-white p-6">
          <div className="text-center mb-4">
            <div className="text-5xl font-black font-serif text-[var(--color-ink)]">{result.pct}%</div>
            <p className="text-[var(--color-muted)] text-sm mt-1">
              {result.correct}/{result.total} correct · {formatTime(result.timeTaken)} taken
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Correct',   value: result.correct,                  color: 'text-green-600' },
              { label: 'Wrong',     value: result.total - result.correct,   color: 'text-red-500'   },
              { label: 'Unanswered', value: result.total - Object.keys(answers).length, color: 'text-amber-600' },
            ].map(s => (
              <div key={s.label} className="bg-[var(--color-cream)] rounded-xl p-3 text-center">
                <div className={`text-2xl font-black font-serif ${s.color}`}>{s.value}</div>
                <div className="text-xs text-[var(--color-muted)] font-mono uppercase mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setPhase('setup')}
              className="py-3 rounded-xl border-2 border-[var(--color-border)]
                         text-sm font-semibold hover:border-[var(--color-teal)] transition-colors">
              ← Try Another Exam
            </button>
            <button onClick={() => setShowShareCard(true)}
              className="py-3 rounded-xl text-white text-sm font-bold
                         transition-all hover:opacity-90"
              style={{ backgroundColor: cfg.color }}>
              📲 Share Result
            </button>
          </div>

          {/* Testimonial prompt — shown once per user */}
          <TestimonialPrompt />
        </div>
      </div>

      {/* Per-question review */}
      <h2 className="font-serif font-bold text-2xl mb-4">Question Review</h2>
      <div className="space-y-4">
        {questions.map((q, i) => {
          const isCorrect = answers[i] === q.correct_answer
          const isSkipped = answers[i] == null
          return (
            <div key={i} className={`card overflow-hidden border-l-4
              ${isCorrect ? 'border-l-green-500' : isSkipped ? 'border-l-amber-400' : 'border-l-red-500'}`}>
              <div className="px-5 py-3 flex items-center justify-between bg-[var(--color-cream)]">
                <span className="font-semibold text-sm">Q{i + 1}
                  {q.topic && <span className="ml-2 text-xs text-[var(--color-muted)] font-normal">{q.topic}</span>}
                </span>
                <span className={`font-bold text-sm ${isCorrect ? 'text-green-600' : isSkipped ? 'text-amber-600' : 'text-red-500'}`}>
                  {isCorrect ? '✓ Correct' : isSkipped ? '— Skipped' : '✗ Wrong'}
                </span>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm font-medium mb-3">{q.question_text}</p>
                <div className="space-y-1.5">
                  {['A','B','C','D'].map(l => (
                    <OptionBtn key={l} letter={l} text={q[`option_${l.toLowerCase()}`]}
                      selected={answers[i]} correct={q.correct_answer} revealed />
                  ))}
                </div>
                {!isCorrect && (
                  <div className="mt-3">
                    {explanations[i] ? (
                      <div className="bg-[var(--color-cream)] rounded-xl p-4 text-sm">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-teal)] mb-2">
                          Euler's Explanation
                        </p>
                        <ExplanationBody text={explanations[i]} />
                      </div>
                    ) : (
                      <button onClick={() => explainQ(i)} disabled={explaining === i}
                        className="text-xs font-semibold text-[var(--color-teal)]
                                   hover:underline flex items-center gap-1.5 disabled:opacity-50">
                        {explaining === i
                          ? <><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> Explaining...</>
                          : '🧠 Explain this answer'
                        }
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>

    {/* Share result card modal */}
    {showShareCard && result && (
      <ShareResultCard
        pct={result.pct}
        score={result.correct}
        total={result.total}
        examType={examType}
        topic={year ? `${examType} ${year}` : examType}
        onClose={() => setShowShareCard(false)}
      />
    )}
  </> 
  )
}