import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// ── Seed helpers ──────────────────────────────────────────────
function hashSeed(seed) {
    return [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0)
}
function randomSeed(len = 6) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const EXAM_TYPES = ['JAMB', 'WAEC', 'NECO', 'BECE']
const OPTION_LETTERS = ['A', 'B', 'C', 'D']
const TOTAL_QUESTIONS = 10

// ── Creator view (no seed in URL) ────────────────────────────
function CreateChallenge() {
    const [examType, setExamType] = useState('JAMB')
    const [creating, setCreating] = useState(false)
    const [link, setLink] = useState(null)
    const [copied, setCopied] = useState(false)

    const create = async () => {
        setCreating(true)
        const seed = randomSeed()
        const url = `${window.location.origin}/challenge/${seed}?exam=${examType}`
        setLink(url)
        setCreating(false)
    }

    const copy = () => {
        navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="max-w-2xl mx-auto px-6 py-10">
            <div className="mb-8">
                <p className="font-mono text-xs tracking-widest uppercase
                      text-[var(--color-gold)] mb-2 flex items-center gap-3">
                    <span className="block w-6 h-px bg-[var(--color-gold)]" />
                    Challenge a Friend
                </p>
                <h1 className="font-serif font-black text-5xl tracking-tight">⚔️ Create Challenge</h1>
                <p className="text-[var(--color-muted)] mt-2">
                    Generate a shareable link. Anyone who opens it gets the same {TOTAL_QUESTIONS} questions.
                </p>
            </div>

            <div className="card overflow-hidden">
                <div className="bg-[var(--color-teal)] px-6 py-4">
                    <p className="font-serif font-bold text-white text-lg">🎯 Challenge Settings</p>
                </div>
                <div className="bg-white p-6 space-y-5">
                    <div>
                        <label className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-muted)] block mb-2">Exam Type</label>
                        <div className="flex gap-3">
                            {EXAM_TYPES.map(t => (
                                <button key={t} onClick={() => setExamType(t)}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all
                    ${examType === t
                                            ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                                            : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="bg-[var(--color-cream)] rounded-2xl p-4 text-sm text-[var(--color-muted)]">
                        📝 {TOTAL_QUESTIONS} random {examType} questions · same for everyone who opens the link
                    </div>
                    <button onClick={create} disabled={creating}
                        className="w-full btn-primary py-4 text-base justify-center flex disabled:opacity-50">
                        {creating ? 'Generating...' : '⚔️ Generate Challenge Link'}
                    </button>
                </div>
            </div>

            {link && (
                <div className="card bg-white overflow-hidden mt-6">
                    <div className="bg-green-500 px-6 py-4">
                        <p className="font-serif font-bold text-white">✅ Challenge Ready!</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-[var(--color-muted)]">Share this link with your friends:</p>
                        <div className="flex gap-2">
                            <input readOnly value={link}
                                className="flex-1 bg-[var(--color-paper)] border border-[var(--color-border)]
                           rounded-xl px-3 py-2.5 text-sm font-mono" />
                            <button onClick={copy}
                                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all
                  ${copied ? 'bg-green-500 text-white' : 'btn-secondary'}`}>
                                {copied ? '✅ Copied' : '📋 Copy'}
                            </button>
                        </div>
                        <Link to={link.replace(window.location.origin, '')}
                            className="block text-center text-sm text-[var(--color-teal)] font-semibold hover:underline">
                            Take the challenge yourself →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Taker view (seed in URL) ─────────────────────────────────
function TakeChallenge({ seed, examType }) {
    const { user } = useAuth()
    const [questions, setQuestions] = useState([])
    const [answers, setAnswers] = useState({})   // { idx: 'A'|'B'|'C'|'D' }
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)

    useEffect(() => { loadQuestions() }, [seed])

    const loadQuestions = async () => {
        setLoading(true)
        const h = hashSeed(seed)
        // Fetch 500 questions, pick TOTAL_QUESTIONS based on hash
        const { data } = await supabase
            .from('exam_questions')
            .select('*')
            .eq('exam_type', examType)
            .not('option_a', 'is', null)
            .not('correct_answer', 'is', null)
            .order('id')
            .limit(500)

        if (!data?.length) { setLoading(false); return }
        const start = h % Math.max(1, data.length - TOTAL_QUESTIONS)
        setQuestions(data.slice(start, start + TOTAL_QUESTIONS))
        setLoading(false)
    }

    const optText = (q, l) => ({ A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[l] || '')

    const score = submitted ? questions.filter((q, i) => answers[i] === q.correct_answer).length : 0
    const scorePct = submitted ? Math.round((score / questions.length) * 100) : 0
    const shareMsg = `I scored ${scorePct}% on a MathGenius ${examType} challenge! Can you beat me? ${window.location.href}`

    if (loading) return (
        <div className="max-w-2xl mx-auto px-6 py-10 text-center">
            <div className="w-10 h-10 border-4 border-[var(--color-teal)] border-t-transparent
                      rounded-full animate-spin mx-auto mb-4" />
            <p className="font-mono text-sm text-[var(--color-muted)]">Loading challenge questions...</p>
        </div>
    )

    if (submitted) return (
        <div className="max-w-2xl mx-auto px-6 py-10 text-center">
            <div className="card overflow-hidden">
                <div className={`px-8 py-8 ${scorePct >= 70 ? 'bg-green-500' : scorePct >= 50 ? 'bg-[var(--color-teal)]' : 'bg-orange-500'}`}>
                    <div className="font-serif font-black text-8xl text-white">{scorePct}%</div>
                    <p className="text-white/80 font-mono uppercase text-sm tracking-widest mt-1">Your Score</p>
                </div>
                <div className="bg-white p-8 space-y-4">
                    <p className="font-serif font-bold text-2xl">{score}/{questions.length} correct</p>
                    <p className="text-[var(--color-muted)]">
                        {scorePct >= 80 ? '🎉 Excellent! You dominated this challenge!'
                            : scorePct >= 60 ? '💪 Good! Challenge someone else to beat this score.'
                                : '📚 Keep studying — review the questions below and try again.'}
                    </p>
                    <div className="flex gap-3 justify-center flex-wrap">
                        <button onClick={() => { navigator.clipboard.writeText(shareMsg); setCopied(true) }}
                            className={`btn-primary px-6 py-3 text-sm ${copied ? 'bg-green-600' : ''}`}>
                            {copied ? '✅ Copied!' : '📤 Share My Score'}
                        </button>
                        <Link to="/challenge" className="btn-secondary px-6 py-3 text-sm">⚔️ Create My Own</Link>
                    </div>
                </div>
            </div>
            {/* Review answers */}
            <div className="mt-6 space-y-3 text-left">
                {questions.map((q, i) => {
                    const isRight = answers[i] === q.correct_answer
                    return (
                        <div key={q.id} className={`card p-4 text-sm ${isRight ? 'border-l-4 border-green-500' : 'border-l-4 border-red-400'}`}>
                            <p className="font-medium mb-1">{i + 1}. {q.question_text?.slice(0, 100)}...</p>
                            <p className="text-xs text-[var(--color-muted)]">
                                Your answer: <strong>{answers[i] || '—'}</strong>  ·  Correct: <strong className="text-green-600">{q.correct_answer}</strong>
                            </p>
                        </div>
                    )
                })}
            </div>
        </div>
    )

    return (
        <div className="max-w-2xl mx-auto px-6 py-10">
            <div className="mb-6">
                <p className="font-mono text-xs text-[var(--color-gold)] uppercase tracking-widest mb-2">
                    ⚔️ Challenge · Seed: {seed} · {examType}
                </p>
                <h1 className="font-serif font-black text-4xl">Answer all {questions.length} questions</h1>
                <p className="text-[var(--color-muted)] text-sm mt-1">
                    {Object.keys(answers).length} / {questions.length} answered
                </p>
            </div>

            <div className="space-y-6 mb-8">
                {questions.map((q, i) => (
                    <div key={q.id} className="card overflow-hidden">
                        <div className="bg-[var(--color-ink)] px-5 py-3 flex items-center justify-between">
                            <span className="font-serif font-bold text-white text-sm">Question {i + 1}</span>
                            {answers[i] && <span className="text-white/60 text-xs font-mono">✓ Answered: {answers[i]}</span>}
                        </div>
                        <div className="bg-white p-5">
                            <p className="text-sm text-[var(--color-ink)] font-medium leading-relaxed mb-4">
                                {q.question_text}
                            </p>
                            <div className="space-y-2">
                                {OPTION_LETTERS.map(l => {
                                    const text = optText(q, l)
                                    if (!text) return null
                                    return (
                                        <button key={l} onClick={() => setAnswers(a => ({ ...a, [i]: l }))}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
                                 border-2 text-left text-sm transition-all
                        ${answers[i] === l
                                                    ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                                                    : 'border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:border-[var(--color-teal)]'}`}>
                                            <span className={`w-7 h-7 rounded-full flex items-center justify-center
                                       font-bold text-xs border-2 shrink-0
                        ${answers[i] === l
                                                    ? 'bg-[var(--color-teal)] border-[var(--color-teal)] text-white'
                                                    : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>{l}</span>
                                            {text}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={() => setSubmitted(true)}
                disabled={Object.keys(answers).length < questions.length}
                className="w-full btn-primary py-4 text-base justify-center flex disabled:opacity-50">
                Submit Challenge ({Object.keys(answers).length}/{questions.length} answered)
            </button>
        </div>
    )
}

// ── Router ───────────────────────────────────────────────────
export default function Challenge() {
    const { seed } = useParams()
    const params = new URLSearchParams(window.location.search)
    const examType = params.get('exam') || 'JAMB'

    if (!seed || seed === 'new') return <CreateChallenge />
    return <TakeChallenge seed={seed} examType={examType} />
}
