import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { API_BASE } from '../services/api'
import { ExplanationBody } from '../utils/RenderMath'

const OPTION_LABELS = ['A', 'B', 'C', 'D']

// Quality rating labels for SM-2
const QUALITY_LABELS = [
    { q: 0, label: 'Forgot completely', color: 'bg-red-600 text-white', emoji: '💀' },
    { q: 1, label: 'Nearly forgot', color: 'bg-red-400 text-white', emoji: '😣' },
    { q: 2, label: 'Struggled', color: 'bg-orange-400 text-white', emoji: '😓' },
    { q: 3, label: 'Got it (hard)', color: 'bg-yellow-400 text-[var(--color-ink)]', emoji: '😐' },
    { q: 4, label: 'Good recall', color: 'bg-green-400 text-white', emoji: '😊' },
    { q: 5, label: 'Perfect recall', color: 'bg-green-600 text-white', emoji: '🎯' },
]

async function callAPI(path, opts = {}) {
    const base = import.meta.env.VITE_API_URL
    const res = await fetch(`${base}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...opts,
    })
    return res.json()
}

// ── Add-to-Queue panel: lets user pick topics to add questions to review ──
function AddQueuePanel({ userId, onAdded }) {
    const TOPICS = [
        'Quadratic Equations', 'Logarithms', 'Differentiation', 'Integration',
        'Probability', 'Trigonometry', 'Matrices', 'Vectors', 'Circle Theorems',
    ]
    const [selected, setSelected] = useState([])
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState(null)

    const toggle = t => setSelected(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t])

    const addToQueue = async () => {
        if (!selected.length || loading) return
        setLoading(true)
        try {
            // Fetch questions for selected topics (up to 5 per topic)
            const { data: questions } = await supabase
                .from('exam_questions')
                .select('id, option_a, correct_answer')
                .in('topic', selected)
                .not('option_a', 'is', null)
                .limit(selected.length * 5)

            if (!questions?.length) { setMsg('No questions found for those topics.'); setLoading(false); return }

            // Upsert into spaced_repetition with next_review = now (due immediately)
            const rows = questions.map(q => ({
                user_id: userId,
                question_id: q.id,
                next_review: new Date().toISOString(),
                ease_factor: 2.5,
                interval_days: 1,
                repetitions: 0,
            }))
            await supabase.from('spaced_repetition').upsert(rows, { onConflict: 'user_id,question_id', ignoreDuplicates: true })
            setMsg(`✅ ${questions.length} questions added to your review queue!`)
            onAdded()
        } catch (e) { setMsg('❌ Error adding questions.') }
        setLoading(false)
    }

    return (
        <div className="card bg-white overflow-hidden mb-6">
            <div className="bg-[var(--color-ink)] px-6 py-4">
                <p className="font-serif font-bold text-white">➕ Add Topics to Review Queue</p>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                    {TOPICS.map(t => (
                        <button key={t} onClick={() => toggle(t)}
                            className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all
                ${selected.includes(t)
                                    ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                                    : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                            {t}
                        </button>
                    ))}
                </div>
                {msg && <p className="text-sm text-[var(--color-teal)] font-medium">{msg}</p>}
                <button onClick={addToQueue} disabled={!selected.length || loading}
                    className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">
                    {loading ? 'Adding...' : `Add ${selected.length} topic(s) to queue`}
                </button>
            </div>
        </div>
    )
}

// ── Main Review component ────────────────────────────────────────────────────
export default function Review() {
    const { user } = useAuth()
    const navigate = useNavigate()

    const [questions, setQuestions] = useState([])
    const [idx, setIdx] = useState(0)
    const [selected, setSelected] = useState(null)
    const [submitted, setSubmitted] = useState(false)
    const [quality, setQuality] = useState(null)  // 0-5 after answer
    const [loading, setLoading] = useState(true)
    const [doneCount, setDoneCount] = useState(0)

    useEffect(() => { if (user) load() }, [user])

    const load = async () => {
        setLoading(true)
        try {
            const data = await callAPI(`/tracking/spaced-questions/${user.id}`)
            setQuestions(data.questions || [])
        } catch { setQuestions([]) }
        setLoading(false)
    }

    const q = questions[idx]

    const handleSubmit = () => {
        if (!selected || submitted) return
        setSubmitted(true)
    }

    const handleQuality = async (qNum) => {
        setQuality(qNum)
        // Record in backend
        try {
            await callAPI('/tracking/spaced-review', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: user.id,
                    question_id: q.id,
                    quality: qNum,
                    topic: q.topic || q._sr?.topic,
                }),
            })
        } catch { }
        setDoneCount(d => d + 1)
        // Move to next
        setTimeout(() => {
            if (idx + 1 >= questions.length) {
                setIdx(questions.length) // signal completion
            } else {
                setIdx(i => i + 1)
                setSelected(null)
                setSubmitted(false)
                setQuality(null)
            }
        }, 600)
    }

    const optionText = (q, letter) => {
        if (!q) return ''
        const map = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }
        return map[letter] || ''
    }

    // ── No questions due ────────────────────────────────────────────────────
    if (!loading && questions.length === 0) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-10">
                <div className="mb-8">
                    <p className="font-mono text-xs tracking-widest uppercase
                        text-[var(--color-gold)] mb-2 flex items-center gap-3">
                        <span className="block w-6 h-px bg-[var(--color-gold)]" />
                        Spaced Repetition
                    </p>
                    <h1 className="font-serif font-black text-5xl tracking-tight">🧠 Review Queue</h1>
                </div>
                <div className="card bg-white p-12 text-center mb-6">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="font-serif font-bold text-2xl mb-2">All caught up!</h3>
                    <p className="text-[var(--color-muted)] max-w-sm mx-auto">
                        No questions due for review right now. Add topics below to start building
                        your spaced repetition queue.
                    </p>
                </div>
                <AddQueuePanel userId={user.id} onAdded={load} />
            </div>
        )
    }

    // ── Session complete ────────────────────────────────────────────────────
    if (!loading && idx >= questions.length) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-16 text-center">
                <div className="text-7xl mb-4">🧠</div>
                <h1 className="font-serif font-black text-4xl mb-2">Review Complete!</h1>
                <p className="text-[var(--color-muted)] text-lg mb-2">
                    You reviewed <strong>{doneCount}</strong> question{doneCount !== 1 ? 's' : ''}.
                </p>
                <p className="text-sm text-[var(--color-muted)] mb-8">
                    Questions you found hard will come back sooner. Easy ones later. That's the power of SM-2.
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                    <button onClick={load} className="btn-primary px-6 py-3">🔄 Check for More</button>
                    <Link to="/dashboard" className="btn-secondary px-6 py-3">← Dashboard</Link>
                </div>
            </div>
        )
    }

    // ── Loading ────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-10">
                <div className="h-8 w-48 bg-[var(--color-border)] rounded-2xl animate-pulse mb-4" />
                <div className="h-64 bg-[var(--color-border)] rounded-2xl animate-pulse" />
            </div>
        )
    }

    // ── Question screen ────────────────────────────────────────────────────
    const sr = q?._sr || {}
    const due = questions.length
    const progress = Math.round((idx / due) * 100)

    return (
        <div className="max-w-3xl mx-auto px-6 py-10">

            {/* Header */}
            <div className="mb-6">
                <p className="font-mono text-xs tracking-widest uppercase
                      text-[var(--color-gold)] mb-2 flex items-center gap-3">
                    <span className="block w-6 h-px bg-[var(--color-gold)]" />
                    Spaced Repetition · {due} due today
                </p>
                <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
                    <h1 className="font-serif font-black text-4xl tracking-tight">🧠 Review</h1>
                    <span className="font-mono text-sm text-[var(--color-muted)]">
                        {idx + 1} / {due}
                    </span>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-teal)] rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }} />
                </div>
                {sr.interval_days && (
                    <p className="text-[10px] font-mono text-[var(--color-muted)] mt-1">
                        Last interval: {sr.interval_days}d · EF: {sr.ease_factor?.toFixed(2)} ·
                        {sr.repetitions || 0} rep{sr.repetitions !== 1 ? 's' : ''}
                    </p>
                )}
            </div>

            {/* Question */}
            <div className="card overflow-hidden mb-4">
                <div className="bg-[var(--color-ink)] px-6 py-3 flex items-center justify-between">
                    <span className="font-serif font-bold text-white">
                        {q?.exam_type || 'Review'} {q?.year || ''}
                    </span>
                    {q?.topic && (
                        <span className="text-white/60 text-xs font-mono">{q.topic}</span>
                    )}
                </div>
                <div className="bg-white p-6">
                    {q?.image_url && (
                        <img src={q.image_url} alt="Question" className="max-w-full mb-4 rounded-xl border" />
                    )}
                    <p className="text-[var(--color-ink)] text-base leading-relaxed font-medium">
                        {q?.question_text}
                    </p>
                </div>
            </div>

            {/* MCQ options */}
            <div className="space-y-3 mb-4">
                {OPTION_LABELS.map(letter => {
                    const text = optionText(q, letter)
                    if (!text) return null
                    const isCorrect = letter === q?.correct_answer
                    const isSelected = letter === selected

                    let style = 'border-[var(--color-border)] bg-white hover:border-[var(--color-teal)]'
                    if (submitted) {
                        if (isCorrect) style = 'border-green-500 bg-green-50'
                        else if (isSelected) style = 'border-red-400 bg-red-50'
                        else style = 'border-[var(--color-border)] bg-white opacity-50'
                    } else if (isSelected) {
                        style = 'border-[var(--color-teal)] bg-[#e8f4f4]'
                    }

                    return (
                        <button key={letter} disabled={submitted} onClick={() => setSelected(letter)}
                            className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left
                         transition-all duration-150 ${style}`}>
                            <span className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center
                               font-bold text-sm border-2
                ${submitted && isCorrect ? 'bg-green-500 border-green-500 text-white'
                                    : submitted && isSelected ? 'bg-red-400 border-red-400 text-white'
                                        : isSelected ? 'bg-[var(--color-teal)] border-[var(--color-teal)] text-white'
                                            : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                                {letter}
                            </span>
                            <span className="text-sm text-[var(--color-ink)] pt-0.5">{text}</span>
                        </button>
                    )
                })}
            </div>

            {/* Submit */}
            {!submitted && (
                <button onClick={handleSubmit} disabled={!selected}
                    className="w-full btn-primary py-4 text-base justify-center flex disabled:opacity-50">
                    Check Answer ➤
                </button>
            )}

            {/* Quality rating after submit */}
            {submitted && !quality && (
                <div className="card bg-white overflow-hidden">
                    <div className={`px-6 py-4 ${selected === q?.correct_answer ? 'bg-green-50' : 'bg-red-50'}`}>
                        <p className="font-serif font-bold text-lg text-[var(--color-ink)] mb-1">
                            {selected === q?.correct_answer ? '✅ Correct!' : `❌ The answer was ${q?.correct_answer}`}
                        </p>
                        {q?.explanation && (
                            <div className="bg-white rounded-xl p-3 text-sm mt-2">
                                <ExplanationBody text={q.explanation} />
                            </div>
                        )}
                    </div>
                    <div className="p-5">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-3">
                            How well did you recall this? (adjusts your review schedule)
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {QUALITY_LABELS.map(({ q: qNum, label, color, emoji }) => (
                                <button key={qNum} onClick={() => handleQuality(qNum)}
                                    className={`${color} rounded-xl py-2 px-2 text-xs font-semibold
                               text-center transition-all hover:opacity-90`}>
                                    <div className="text-xl mb-0.5">{emoji}</div>
                                    <div className="leading-tight">{label}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {quality !== null && (
                <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 text-[var(--color-teal)] font-mono text-sm">
                        <span className="w-4 h-4 border-2 border-[var(--color-teal)] border-t-transparent rounded-full animate-spin" />
                        Scheduling next review...
                    </div>
                </div>
            )}
        </div>
    )
}
