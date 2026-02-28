import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  fetchCBTQuestions, createCBTSession, completeCBTSession,
  getCBTHistory, getAvailableTopics, getAvailableYears,
  getQuestionBankStats,
} from '../lib/cbt'
import { explainCBTAnswer, generateCBTReport, getUserProfile } from '../services/api'
import { ExplanationBody } from '../utils/RenderMath'
import { recordCBTResult, updateStreak } from '../lib/stats'
import XPToast from '../components/XPToast'
import { createNotification } from '../lib/notifications'

const EXAM_TYPES = ['JAMB', 'WAEC', 'NECO', 'Mixed']
const DURATIONS = [10, 20, 30, 45, 60]
const COUNTS = [10, 20, 30, 40, 50]
const DIFFICULTIES = [
  { value: 'mixed', label: 'Mixed', emoji: '🎲' },
  { value: 'easy', label: 'Easy', emoji: '🟢' },
  { value: 'medium', label: 'Medium', emoji: '🟡' },
  { value: 'hard', label: 'Hard', emoji: '🔴' },
]

const GRADE_CONFIG = {
  A: { color: 'text-green-600', bg: 'bg-green-500', label: 'Excellent!' },
  B: { color: 'text-blue-600', bg: 'bg-blue-500', label: 'Very Good!' },
  C: { color: 'text-yellow-600', bg: 'bg-yellow-500', label: 'Good' },
  D: { color: 'text-orange-500', bg: 'bg-orange-400', label: 'Pass' },
  F: { color: 'text-red-500', bg: 'bg-red-500', label: 'Fail' },
}

function getGrade(pct) {
  if (pct >= 70) return 'A'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  if (pct >= 45) return 'D'
  return 'F'
}

function formatTime(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function OptionBtn({ letter, text, selected, correct, revealed, onClick }) {
  let style = 'border-[var(--color-border)] bg-white hover:border-[var(--color-teal)] hover:bg-[#e8f4f4]'
  if (revealed) {
    if (letter === correct) style = 'border-green-500 bg-green-50 text-green-800'
    else if (letter === selected && letter !== correct) style = 'border-red-400 bg-red-50 text-red-700'
    else style = 'border-[var(--color-border)] bg-white opacity-60'
  } else if (selected === letter) {
    style = 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
  }
  return (
    <button
      onClick={() => !revealed && onClick(letter)}
      disabled={revealed}
      className={`w-full text-left flex items-start gap-3 px-4 py-3
                  rounded-xl border-2 transition-all duration-150 ${style}`}
    >
      <span className="shrink-0 w-7 h-7 rounded-full border-2 border-current
                       flex items-center justify-center text-xs font-bold mt-0.5">
        {letter}
      </span>
      <span className="text-sm leading-snug flex-1">{text}</span>
      {revealed && letter === correct && <span className="shrink-0 text-green-600 text-lg">✓</span>}
      {revealed && letter === selected && letter !== correct && <span className="shrink-0 text-red-500 text-lg">✗</span>}
    </button>
  )
}

function SubmitModal({ answered, total, onConfirm, onCancel }) {
  const unanswered = total - answered
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl border-2 border-[var(--color-ink)]
                      shadow-2xl p-8 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">📝</div>
        <h3 className="font-serif font-black text-2xl text-[var(--color-ink)] mb-2">
          Submit Exam?
        </h3>
        <p className="text-[var(--color-muted)] text-sm mb-2">
          You have answered{' '}
          <span className="font-bold text-[var(--color-ink)]">{answered}</span>
          {' '}of{' '}
          <span className="font-bold">{total}</span> questions.
        </p>
        {unanswered > 0 ? (
          <p className="text-orange-500 text-sm font-semibold mb-6">
            ⚠️ {unanswered} question{unanswered !== 1 ? 's' : ''} still unanswered
          </p>
        ) : (
          <p className="text-green-600 text-sm font-semibold mb-6">
            ✅ All questions answered!
          </p>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-secondary py-3 text-sm">
            ← Go Back
          </button>
          <button onClick={onConfirm} className="flex-1 btn-primary py-3 text-sm justify-center">
            Submit Now
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CBT() {
  const { user } = useAuth()
  const [screen, setScreen] = useState('setup')

  // Config
  const [examType, setExamType] = useState('JAMB')
  const [topics, setTopics] = useState([])
  const [difficulty, setDifficulty] = useState('mixed')
  const [duration, setDuration] = useState(30)
  const [count, setCount] = useState(20)
  const [year, setYear] = useState('')

  const topic = topics.length === 1
    ? topics[0]
    : topics.length > 1 ? topics.join(', ') : ''

  // Available options
  const [availTopics, setAvailTopics] = useState([])
  const [availYears, setAvailYears] = useState([])
  const [bankStats, setBankStats] = useState({})
  const [history, setHistory] = useState([])
  const [loadingSetup, setLoadingSetup] = useState(false)

  // Exam state
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [flagged, setFlagged] = useState({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const timerRef = useRef(null)

  // Report state
  const [report, setReport] = useState(null)
  const [expandedQ, setExpandedQ] = useState(null)
  const [explanations, setExplanations] = useState({})
  const [loadingExpl, setLoadingExpl] = useState({})
  const [aiSummary, setAiSummary] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => { if (user) { loadSetupData(); loadHistory(); loadPreferredTopics() } }, [user])
  useEffect(() => { if (examType) loadTopicsAndYears() }, [examType])

  const loadSetupData = async () => {
    const stats = await getQuestionBankStats()
    setBankStats(stats)
  }

  const loadPreferredTopics = async () => {
    try {
      const res = await getUserProfile(user.id)
      const prof = res?.data?.profile
      if (prof?.preferred_topics?.length) {
        setTopics(prof.preferred_topics)
      }
    } catch { /* non-fatal */ }
  }

  const loadTopicsAndYears = async () => {
    const [t, y] = await Promise.all([
      getAvailableTopics(examType),
      getAvailableYears(examType),
    ])
    setAvailTopics(t)
    setAvailYears(y)
  }

  const loadHistory = async () => {
    const { data } = await getCBTHistory(user.id)
    setHistory(data || [])
  }

  const toggleTopic = (t) =>
    setTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const startExam = async () => {
    setLoadingSetup(true)
    const { data: qs } = await fetchCBTQuestions({
      examType: examType === 'Mixed' ? null : examType,
      topics: topics.length > 0 ? topics : null,
      difficulty,
      year: year ? parseInt(year) : null,
      count,
    })

    if (!qs || qs.length === 0) {
      alert('No questions found for these settings. Try different filters or upload more questions.')
      setLoadingSetup(false)
      return
    }

    const { data: session } = await createCBTSession(user.id, {
      examType, topic: topic || null, difficulty,
      year: year ? parseInt(year) : null, duration, count: qs.length,
    })

    setQuestions(qs)
    setSessionId(session?.id)
    setCurrentIdx(0)
    setAnswers({})
    setFlagged({})
    setTimeLeft(duration * 60)
    setStartTime(Date.now())
    setScreen('exam')
    setLoadingSetup(false)
  }

  useEffect(() => {
    if (screen !== 'exam') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleSubmit(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [screen])

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (submitting) return
    clearInterval(timerRef.current)
    setSubmitting(true)
    setShowSubmitModal(false)

    const timeTaken = Math.round((Date.now() - startTime) / 1000)

    // ── FIX 1: include option_e in answerRows ──────────────────────
    const answerRows = questions.map(q => ({
      question_id: q.id,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      option_e: q.option_e || null,
      correct_answer: q.correct_answer,
      student_answer: answers[q.id] || null,
      is_correct: answers[q.id] === q.correct_answer,
      topic: q.topic,
    }))

    const { score, percentage } = await completeCBTSession(sessionId, answerRows, timeTaken)

    // Award XP + update streak
    try {
      const [statResult, streakResult] = await Promise.all([
        recordCBTResult(user.id, {
          score, total: questions.length,
          timeTaken, answers: answerRows, examType,
        }),
        updateStreak(user.id),
      ])
      const allNewBadges = [
        ...(statResult?.newBadges || []),
        ...(streakResult?.newBadges || []),
      ]
      setToast({ xpGained: statResult?.xpGained || 0, newBadges: allNewBadges })

      await createNotification(user.id, {
        type: 'cbt_complete',
        title: `CBT Result: ${percentage}% (${getGrade(percentage)})`,
        message: `${examType} · ${score}/${questions.length} correct · ${Math.round(timeTaken / 60)}m`,
        icon: percentage >= 70 ? '🏆' : percentage >= 50 ? '📊' : '📝',
        link: '/cbt-history',
      })

      if (streakResult?.streakIncreased && streakResult.newStreak > 1) {
        await createNotification(user.id, {
          type: 'streak',
          title: `🔥 ${streakResult.newStreak}-day streak!`,
          message: 'Keep it up — study again tomorrow to extend your streak.',
          icon: '🔥',
          link: '/mastery',
        })
      }
    } catch {
      // stats failure is non-critical
    }

    try {
      const res = await generateCBTReport(
        answerRows, score, questions.length, timeTaken, examType, topic
      )
      setAiSummary(res.data.summary)
    } catch { setAiSummary('') }

    setReport({
      answers: answerRows, score, percentage,
      total: questions.length, timeTaken,
      autoSubmit, examType, topic, difficulty,
    })
    setScreen('report')
    setSubmitting(false)
    await loadHistory()
  }, [questions, answers, sessionId, startTime, submitting, examType, topic, difficulty])

  const fetchExplanation = async (answer) => {
    const id = answer.question_id
    if (explanations[id] || loadingExpl[id]) return
    setLoadingExpl(prev => ({ ...prev, [id]: true }))
    try {
      const res = await explainCBTAnswer({
        question_text: answer.question_text,
        option_a: answer.option_a,
        option_b: answer.option_b,
        option_c: answer.option_c,
        option_d: answer.option_d,
        option_e: answer.option_e || null,
        correct_answer: answer.correct_answer,
        student_answer: answer.student_answer,
        topic: answer.topic,
      })
      setExplanations(prev => ({ ...prev, [id]: res.data.explanation }))
    } catch {
      setExplanations(prev => ({ ...prev, [id]: 'Could not load explanation.' }))
    }
    setLoadingExpl(prev => ({ ...prev, [id]: false }))
  }

  const currentQ = questions[currentIdx]
  const answered = Object.keys(answers).length
  const unanswered = questions.length - answered
  const timerUrgent = timeLeft <= 60

  // ── SETUP ────────────────────────────────────────────────
  if (screen === 'setup') {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="font-mono text-xs tracking-widest uppercase
                        text-[var(--color-gold)] mb-2 flex items-center gap-3">
            <span className="block w-6 h-px bg-[var(--color-gold)]" />
            CBT Mode
          </p>
          <h1 className="font-serif font-black text-5xl tracking-tight">
            Computer Based Test
          </h1>
          <p className="text-[var(--color-muted)] mt-2 text-lg">
            Timed exam simulation with real WAEC, NECO and JAMB questions.
          </p>
        </div>

        {Object.keys(bankStats).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {Object.entries(bankStats).map(([type, stat]) => (
              <div key={type} className="card bg-white p-4 text-center">
                <div className="font-serif font-black text-2xl text-[var(--color-teal)]">
                  {stat.total}
                </div>
                <div className="font-bold text-sm text-[var(--color-ink)]">{type}</div>
                <div className="text-xs text-[var(--color-muted)] mt-0.5">
                  {stat.years} year{stat.years !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-teal)] px-6 py-4">
              <p className="font-serif font-bold text-white text-lg">
                ⚙️ Configure Your Exam
              </p>
            </div>
            <div className="bg-white p-6 space-y-5">

              {/* Exam type */}
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] block mb-2">
                  Exam Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXAM_TYPES.map(et => (
                    <button key={et}
                      onClick={() => { setExamType(et); setTopics([]); setYear('') }}
                      className={`px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all
                        ${examType === et
                          ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                          : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                      {et}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic multi-select */}
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] block mb-2">
                  Topics — select one or more (blank = all topics)
                </label>
                {availTopics.length === 0 ? (
                  <p className="text-xs text-[var(--color-muted)] italic">
                    Upload questions first to see available topics
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto
                                  border-2 border-[var(--color-border)] rounded-xl p-3">
                    {availTopics.map(t => (
                      <button key={t} type="button" onClick={() => toggleTopic(t)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all
                          ${topics.includes(t)
                            ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                            : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-ink)]'}`}>
                        {topics.includes(t) ? '✓ ' : ''}{t}
                      </button>
                    ))}
                  </div>
                )}
                {topics.length > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-[var(--color-teal)] font-medium">
                      {topics.length} topic{topics.length !== 1 ? 's' : ''} selected
                    </span>
                    <button onClick={() => setTopics([])}
                      className="text-xs text-[var(--color-muted)] hover:text-red-500 transition-colors">
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              {/* Year */}
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] block mb-2">
                  Year (Optional)
                </label>
                <select value={year} onChange={e => setYear(e.target.value)}
                  className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                             focus:border-[var(--color-teal)] rounded-xl px-4 py-3 text-sm transition-colors">
                  <option value="">Any Year</option>
                  {availYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] block mb-2">
                  Difficulty
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DIFFICULTIES.map(d => (
                    <button key={d.value} onClick={() => setDifficulty(d.value)}
                      className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all text-center
                        ${difficulty === d.value
                          ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                          : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                      {d.emoji} {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration + Count */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest
                                     text-[var(--color-muted)] block mb-2">
                    Duration (mins)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DURATIONS.map(d => (
                      <button key={d} onClick={() => setDuration(d)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all
                          ${duration === d
                            ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                            : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                        {d}m
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest
                                     text-[var(--color-muted)] block mb-2">
                    No. of Questions
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COUNTS.map(c => (
                      <button key={c} onClick={() => setCount(c)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all
                          ${count === c
                            ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                            : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={startExam} disabled={loadingSetup}
                className="w-full btn-primary py-4 text-base justify-center
                           flex items-center gap-2 disabled:opacity-50">
                {loadingSetup ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30
                                     border-t-white rounded-full animate-spin" />
                    Preparing questions...
                  </>
                ) : `🚀 Start ${count}-Question ${examType} Exam`}
              </button>
            </div>
          </div>

          {/* History */}
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-ink)] px-5 py-4">
              <p className="font-serif font-bold text-white">📊 Recent Exams</p>
            </div>
            <div className="bg-white divide-y divide-[var(--color-border)] max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[var(--color-muted)] text-sm">No exams taken yet</p>
                </div>
              ) : history.map(h => {
                const grade = getGrade(h.percentage)
                const cfg = GRADE_CONFIG[grade]
                return (
                  <div key={h.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-ink)]">
                        {h.exam_type} {h.year || ''}
                        {h.topic ? ` · ${h.topic.slice(0, 20)}` : ''}
                      </p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">
                        {h.total_questions}Q · {h.difficulty} · {new Date(h.completed_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <div className={`font-serif font-black text-xl ${cfg.color}`}>
                      {h.percentage}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── EXAM ─────────────────────────────────────────────────
  if (screen === 'exam' && currentQ) {
    const qId = currentQ.id
    const userAnswer = answers[qId]
    const isFlagged = flagged[qId]

    return (
      <div className="max-w-4xl mx-auto px-4 py-6">

        {showSubmitModal && (
          <SubmitModal
            answered={answered}
            total={questions.length}
            onConfirm={() => handleSubmit(false)}
            onCancel={() => setShowSubmitModal(false)}
          />
        )}

        {/* Top bar */}
        <div className={`sticky top-16 z-30 mb-5 rounded-2xl border-2
                         flex items-center justify-between px-5 py-3 transition-colors
          ${timerUrgent ? 'bg-red-50 border-red-400' : 'bg-white border-[var(--color-ink)]'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-sm text-[var(--color-muted)] shrink-0">
              Q {currentIdx + 1}/{questions.length}
            </span>
            <span className="text-xs px-2 py-1 bg-[var(--color-cream)]
                             border border-[var(--color-border)] rounded-lg
                             text-[var(--color-muted)] font-mono shrink-0">
              {answered} done · {unanswered} left
            </span>
            {topic && (
              <span className="hidden sm:block text-xs text-[var(--color-teal)]
                               font-medium truncate max-w-[120px]">
                {topic}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className={`font-mono font-black text-xl tabular-nums
              ${timerUrgent ? 'text-red-500 animate-pulse' : 'text-[var(--color-ink)]'}`}>
              ⏱ {formatTime(timeLeft)}
            </div>
            <button
              onClick={() => setShowSubmitModal(true)}
              disabled={submitting}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
              {submitting ? '⏳' : 'Submit'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-5">
          <div className="space-y-4">
            <div className="card bg-white overflow-hidden">
              <div className="bg-[var(--color-ink)] px-5 py-3 flex items-center justify-between">
                <span className="font-serif font-bold text-white">
                  Question {currentIdx + 1}
                </span>
                <div className="flex items-center gap-2">
                  {currentQ.year && (
                    <span className="text-white/60 text-xs font-mono">
                      {examType} {currentQ.year}
                    </span>
                  )}
                  <button
                    onClick={() => setFlagged(f => ({ ...f, [qId]: !f[qId] }))}
                    className={`text-lg transition-all
                      ${isFlagged ? 'opacity-100' : 'opacity-40 hover:opacity-80'}`}
                    title="Flag for review">
                    🚩
                  </button>
                </div>
              </div>
              <div className="p-5">
                {currentQ.topic && (
                  <p className="font-mono text-[10px] uppercase tracking-widest
                                 text-[var(--color-teal)] mb-3">
                    {currentQ.topic}
                  </p>
                )}
                <p className="text-[var(--color-ink)] text-base leading-relaxed font-medium mb-5">
                  {currentQ.question_text}
                </p>

                {/* Question image */}
                {currentQ.image_url && (
                  <div className="mb-5 flex justify-center">
                    <img
                      src={currentQ.image_url}
                      alt="Question diagram"
                      className="max-w-full max-h-64 rounded-xl border-2
                                 border-[var(--color-border)] object-contain"
                      onError={e => e.target.style.display = 'none'}
                    />
                  </div>
                )}

                {/* ── FIX 2: option E support in live exam ── */}
                <div className="space-y-2.5">
                  {['A', 'B', 'C', 'D', ...(currentQ.option_e ? ['E'] : [])].map(letter => (
                    <OptionBtn key={letter} letter={letter}
                      text={currentQ[`option_${letter.toLowerCase()}`]}
                      selected={userAnswer} correct={null} revealed={false}
                      onClick={(l) => setAnswers(a => ({ ...a, [qId]: l }))}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="btn-secondary px-5 py-2.5 text-sm disabled:opacity-40">
                ← Prev
              </button>
              <button onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
                disabled={currentIdx === questions.length - 1}
                className="btn-primary px-5 py-2.5 text-sm flex-1 justify-center disabled:opacity-40">
                Next →
              </button>
            </div>
          </div>

          {/* Navigator */}
          <div className="card bg-white overflow-hidden h-fit">
            <div className="bg-[var(--color-teal)] px-4 py-2.5">
              <p className="text-white font-semibold text-xs uppercase tracking-wide">
                Navigator
              </p>
            </div>
            <div className="p-3 grid grid-cols-5 gap-1.5">
              {questions.map((q, i) => {
                const isAnswered = !!answers[q.id]
                const isFlag = flagged[q.id]
                const isCurrent = i === currentIdx
                return (
                  <button key={q.id} onClick={() => setCurrentIdx(i)}
                    className={`w-full aspect-square rounded-lg text-xs font-bold
                                transition-all border-2 relative
                      ${isCurrent
                        ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                        : isAnswered
                          ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                          : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                    {i + 1}
                    {isFlag && <span className="absolute -top-1 -right-1 text-[8px]">🚩</span>}
                  </button>
                )
              })}
            </div>
            <div className="px-3 pb-3 space-y-1.5 text-[10px] font-mono text-[var(--color-muted)]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border-2 border-[var(--color-teal)] bg-[#e8f4f4]" />
                Answered ({answered})
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border-2 border-[var(--color-border)]" />
                Unanswered ({unanswered})
              </div>
              <div className="flex items-center gap-2">
                <span>🚩</span> Flagged
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── REPORT ───────────────────────────────────────────────
  if (screen === 'report' && report) {
    const grade = getGrade(report.percentage)
    const cfg = GRADE_CONFIG[grade]
    const mins = Math.floor(report.timeTaken / 60)
    const secs = report.timeTaken % 60
    const wrong = report.answers.filter(a => !a.is_correct)
    const correct = report.answers.filter(a => a.is_correct)

    return (
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* XP Toast */}
        {toast && (
          <XPToast
            xpGained={toast.xpGained}
            newBadges={toast.newBadges}
            onDone={() => setToast(null)}
          />
        )}

        <div className="card overflow-hidden mb-6">
          <div className={`${cfg.bg} px-8 py-8 text-center text-white`}>
            {report.autoSubmit && (
              <div className="bg-white/20 rounded-xl px-4 py-2 text-sm mb-4 inline-block">
                ⏰ Time expired — auto submitted
              </div>
            )}
            <div className="font-serif font-black text-8xl mb-2">{grade}</div>
            <div className="text-3xl font-black mb-1">{report.percentage}%</div>
            <div className="text-white/80 text-lg">{cfg.label}</div>
          </div>

          <div className="bg-white p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Correct', value: report.score, color: 'text-green-600' },
                { label: 'Wrong', value: wrong.length, color: 'text-red-500' },
                { label: 'Total', value: report.total, color: 'text-[var(--color-ink)]' },
                { label: 'Time', value: `${mins}m ${secs}s`, color: 'text-[var(--color-teal)]' },
              ].map(s => (
                <div key={s.label} className="bg-[var(--color-paper)] rounded-xl p-4 text-center">
                  <div className={`font-serif font-black text-2xl ${s.color}`}>{s.value}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest
                                  text-[var(--color-muted)] mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {aiSummary && (
              <div className="bg-[#e8f4f4] border border-[var(--color-teal)]
                              rounded-2xl p-5 mb-4">
                <p className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-teal)] mb-2">
                  🧠 Euler's Feedback
                </p>
                <p className="text-[var(--color-ink)] text-sm leading-relaxed">{aiSummary}</p>
              </div>
            )}

            <button onClick={() => setScreen('setup')}
              className="w-full btn-primary py-3 text-sm justify-center">
              🔄 New Exam
            </button>
          </div>
        </div>

        {/* Question review */}
        <div className="card overflow-hidden">
          <div className="bg-[var(--color-ink)] px-6 py-4 flex items-center justify-between">
            <p className="font-serif font-bold text-white text-lg">📋 Question Review</p>
            <div className="flex gap-3 text-sm text-white/70">
              <span>✅ {correct.length} correct</span>
              <span>❌ {wrong.length} wrong</span>
            </div>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {report.answers.map((a, i) => (
              <div key={i} className="bg-white">
                <button
                  onClick={() => {
                    setExpandedQ(expandedQ === i ? null : i)
                    if (!explanations[a.question_id] && !loadingExpl[a.question_id]) {
                      fetchExplanation(a)
                    }
                  }}
                  className="w-full text-left px-5 py-4 flex items-start gap-3
                             hover:bg-[var(--color-cream)] transition-colors"
                >
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center
                                    justify-center text-white text-xs font-bold mt-0.5
                    ${a.is_correct ? 'bg-green-500' : 'bg-red-500'}`}>
                    {a.is_correct ? '✓' : '✗'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-ink)] leading-snug">
                      {i + 1}. {a.question_text}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap">
                      <span className={a.is_correct ? 'text-green-600' : 'text-red-500'}>
                        You: {a.student_answer || 'Skipped'}
                      </span>
                      {!a.is_correct && (
                        <span className="text-green-600">Correct: {a.correct_answer}</span>
                      )}
                      {a.topic && (
                        <span className="text-[var(--color-muted)]">{a.topic}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[var(--color-muted)] text-xs shrink-0 mt-1">
                    {expandedQ === i ? '▲' : '▼'}
                  </span>
                </button>

                {expandedQ === i && (
                  <div className="px-5 pb-5 bg-[var(--color-paper)]
                                  border-t border-[var(--color-border)]">

                    {/* Question image in review */}
                    {questions.find(q => q.id === a.question_id)?.image_url && (
                      <div className="mt-4 mb-2 flex justify-center">
                        <img
                          src={questions.find(q => q.id === a.question_id).image_url}
                          alt="Question diagram"
                          className="max-w-full max-h-64 rounded-xl border-2
                                     border-[var(--color-border)] object-contain"
                          onError={e => e.target.style.display = 'none'}
                        />
                      </div>
                    )}

                    {/* ── FIX 3: use a.option_e not currentQ.option_e ── */}
                    <div className="space-y-2 mt-4 mb-4">
                      {['A', 'B', 'C', 'D', ...(a.option_e ? ['E'] : [])].map(letter => (
                        <OptionBtn key={letter} letter={letter}
                          text={a[`option_${letter.toLowerCase()}`]}
                          selected={a.student_answer} correct={a.correct_answer}
                          revealed={true} onClick={() => { }}
                        />
                      ))}
                    </div>

                    <div className="bg-white border border-[var(--color-border)]
                                    rounded-xl p-4 mt-3">
                      <p className="font-mono text-[10px] uppercase tracking-widest
                                     text-[var(--color-teal)] mb-2">
                        🧠 Euler's Explanation
                      </p>
                      {loadingExpl[a.question_id] ? (
                        <div className="space-y-2">
                          {[...Array(3)].map((_, j) => (
                            <div key={j} className="h-3 bg-[var(--color-border)]
                                                     rounded animate-pulse" />
                          ))}
                        </div>
                      ) : explanations[a.question_id] ? (
                        <ExplanationBody text={explanations[a.question_id]} />
                      ) : (
                        <p className="text-sm text-[var(--color-muted)]">
                          Loading explanation...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
}
