import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { generateQuestion, gradeAnswer } from '../services/api'
import { createSession, saveAttempt, completeSession, getSessionHistory } from '../lib/practice'
import { updateTopicProgress } from '../lib/progress'
import { ExplanationBody } from '../utils/RenderMath'

const DIFFICULTY_CONFIG = {
  easy:   { label: 'Easy',   color: 'text-green-600 bg-green-50 border-green-200', emoji: '🟢' },
  medium: { label: 'Medium', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', emoji: '🟡' },
  hard:   { label: 'Hard',   color: 'text-red-600 bg-red-50 border-red-200', emoji: '🔴' },
}

const TOPICS = [
  'Quadratic Equations', 'Linear Equations', 'Simultaneous Linear Equations',
  'Indices and Laws of Indices', 'Logarithms and Laws of Logarithms',
  'Sequences and Series (AP and GP)', 'Binomial Expansion',
  'Trigonometric Ratios (sin, cos, tan)', 'Bearings and Distances',
  'Circle Theorems (Chords, Tangents, Arcs)',
  'Mensuration (Perimeter, Area, Volume)',
  'Probability (Basic, Addition, Multiplication Rule)',
  'Vectors in 2D and 3D', 'Matrix Operations and Types',
  'Differentiation — All Rules', 'Integration by Substitution',
  'Limits and L\'Hôpital\'s Rule', 'Laplace Transforms',
]

function ResultBadge({ result }) {
  if (result === 'CORRECT')  return <span className="text-green-600 font-bold text-lg">✅ Correct!</span>
  if (result === 'PARTIAL')  return <span className="text-yellow-600 font-bold text-lg">🌗 Partially Correct</span>
  return <span className="text-red-500 font-bold text-lg">❌ Incorrect</span>
}

export default function Practice() {
  const { user } = useAuth()

  // Setup state
  const [topic,      setTopic]      = useState('')
  const [difficulty, setDifficulty] = useState('easy')
  const [started,    setStarted]    = useState(false)

  // Session state
  const [sessionId,      setSessionId]      = useState(null)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [question,       setQuestion]       = useState('')
  const [answer,         setAnswer]         = useState('')
  const [hint,           setHint]           = useState('')
  const [studentAnswer,  setStudentAnswer]  = useState('')
  const [showHint,       setShowHint]       = useState(false)
  const [submitted,      setSubmitted]      = useState(false)
  const [gradeResult,    setGradeResult]    = useState(null)
  const [showAnswer,     setShowAnswer]     = useState(false)

  // Progress
  const [score,     setScore]     = useState(0)
  const [loading,   setLoading]   = useState(false)
  const [finished,  setFinished]  = useState(false)
  const [history,   setHistory]   = useState([])

  // Timer
  const [elapsed,   setElapsed]   = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (user) loadHistory()
  }, [user])

  useEffect(() => {
    if (started && !submitted && !finished) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [started, submitted, finished, questionNumber])

  const loadHistory = async () => {
    const { data } = await getSessionHistory(user.id)
    setHistory(data || [])
  }

  const startSession = async () => {
    if (!topic) return
    setLoading(true)

    const { data: session } = await createSession(user.id, topic, 'secondary', difficulty)
    if (session) {
      setSessionId(session.id)
      await loadQuestion(1)
      setStarted(true)
      setScore(0)
      setQuestionNumber(1)
      setFinished(false)
    }
    setLoading(false)
  }

  const loadQuestion = async (num) => {
    setLoading(true)
    setStudentAnswer('')
    setSubmitted(false)
    setGradeResult(null)
    setShowHint(false)
    setShowAnswer(false)
    setElapsed(0)

    const res = await generateQuestion(topic, 'secondary', difficulty, num)
    setQuestion(res.data.question)
    setAnswer(res.data.answer)
    setHint(res.data.hint)
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!studentAnswer.trim() || submitted) return
    setLoading(true)
    clearInterval(timerRef.current)

    const res = await gradeAnswer(topic, question, answer, studentAnswer)
    const grade = res.data

    setGradeResult(grade)
    setSubmitted(true)

    const newScore = score + (grade.score || 0)
    setScore(newScore)

    // Save attempt
    if (sessionId) {
      await saveAttempt(sessionId, {
        questionText:  question,
        studentAnswer: studentAnswer,
        correctAnswer: answer,
        isCorrect:     grade.is_correct,
        feedback:      grade.feedback,
        timeTaken:     elapsed,
      })
    }

    setLoading(false)
  }

  const handleNext = async () => {
    if (questionNumber >= 5) {
      // Complete session
      const finalScore = Math.round(score / 5)
      if (sessionId) await completeSession(sessionId, finalScore)
      setFinished(true)
      await loadHistory()
    } else {
      const next = questionNumber + 1
      setQuestionNumber(next)
      await loadQuestion(next)
    }
  }

  const handleRestart = () => {
    setStarted(false)
    setFinished(false)
    setSessionId(null)
    setQuestion('')
    setAnswer('')
    setScore(0)
    setQuestionNumber(1)
  }

  const formatTime = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  // ── SETUP SCREEN ──────────────────────────────────────────
  if (!started) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="font-mono text-xs tracking-widest uppercase
                        text-[var(--color-gold)] mb-2 flex items-center gap-3">
            <span className="block w-6 h-px bg-[var(--color-gold)]" />
            Practice Mode
          </p>
          <h1 className="font-serif font-black text-5xl tracking-tight">
            Test Your Knowledge
          </h1>
          <p className="text-[var(--color-muted)] mt-2 text-lg">
            Euler generates 5 questions, marks your answers, and helps you improve.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Setup card */}
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-teal)] px-6 py-4">
              <p className="font-serif font-bold text-white text-lg">
                🎯 Start a Session
              </p>
            </div>
            <div className="bg-white p-6 space-y-5">

              {/* Topic */}
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] block mb-2">
                  Choose Topic
                </label>
                <select
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                             focus:border-[var(--color-teal)] rounded-xl px-4 py-3 text-sm
                             text-[var(--color-ink)] transition-colors"
                >
                  <option value="">Select a topic...</option>
                  {TOPICS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] block mb-2">
                  Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setDifficulty(key)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2
                                  transition-all duration-150
                        ${difficulty === key
                          ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                          : 'border-[var(--color-border)] text-[var(--color-muted)]'
                        }`}
                    >
                      {cfg.emoji} {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={startSession}
                disabled={!topic || loading}
                className="w-full btn-primary py-4 text-base justify-center
                           flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30
                                   border-t-white rounded-full animate-spin" />
                ) : '🚀 Start Practice Session'}
              </button>
            </div>
          </div>

          {/* Recent history */}
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-ink)] px-6 py-4">
              <p className="font-serif font-bold text-white text-lg">
                📊 Recent Sessions
              </p>
            </div>
            <div className="bg-white divide-y divide-[var(--color-border)]
                            max-h-80 overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[var(--color-muted)] text-sm">
                    No sessions yet — start your first practice!
                  </p>
                </div>
              ) : history.map(session => (
                <div key={session.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-[var(--color-ink)] truncate">
                        {session.topic}
                      </p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">
                        {DIFFICULTY_CONFIG[session.difficulty]?.emoji} {session.difficulty}
                        &nbsp;·&nbsp;
                        {new Date(session.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`text-lg font-black font-serif
                      ${session.score >= 80 ? 'text-green-600'
                        : session.score >= 50 ? 'text-yellow-600'
                        : 'text-red-500'}`}>
                      {session.score}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── FINISHED SCREEN ──────────────────────────────────────
  if (finished) {
    const finalPct = Math.round(score / 5)
    const grade    = finalPct >= 80 ? 'A' : finalPct >= 60 ? 'B' : finalPct >= 40 ? 'C' : 'D'
    const message  = finalPct >= 80
      ? "Excellent work! You've mastered this topic! 🎉"
      : finalPct >= 60
      ? "Good job! Keep practising to improve further! 💪"
      : finalPct >= 40
      ? "You're getting there! Review the topic and try again! 📚"
      : "Don't give up! Study the worked examples and try again! 🌟"

    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="card overflow-hidden">
          <div className="bg-[var(--color-teal)] px-6 py-8">
            <div className="text-7xl font-black font-serif text-white mb-2">
              {grade}
            </div>
            <p className="text-white/80 text-sm font-mono uppercase tracking-widest">
              Final Grade
            </p>
          </div>
          <div className="bg-white p-8 space-y-4">
            <div className="text-5xl font-black font-serif text-[var(--color-ink)]">
              {finalPct}%
            </div>
            <p className="font-medium text-[var(--color-ink)]">{message}</p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-[var(--color-paper)] rounded-xl p-4">
                <div className="font-serif font-black text-2xl text-[var(--color-teal)]">
                  {Math.round(score / 100 * 5)}/5
                </div>
                <div className="text-xs text-[var(--color-muted)] font-mono uppercase mt-1">
                  Questions Correct
                </div>
              </div>
              <div className="bg-[var(--color-paper)] rounded-xl p-4">
                <div className="font-serif font-black text-2xl text-[var(--color-teal)]">
                  {difficulty}
                </div>
                <div className="text-xs text-[var(--color-muted)] font-mono uppercase mt-1">
                  Difficulty
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleRestart}
                className="flex-1 btn-primary py-3 text-sm justify-center"
              >
                🔄 Try Again
              </button>
              <button
                onClick={() => { handleRestart(); setDifficulty('hard') }}
                className="flex-1 btn-secondary py-3 text-sm justify-center"
              >
                ⬆️ Try Harder
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── QUESTION SCREEN ──────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-[var(--color-muted)] uppercase tracking-widest">
            Question {questionNumber} of 5 — {topic}
          </span>
          <div className="flex items-center gap-3">
            <span className={`font-mono text-xs px-2 py-1 rounded-lg border
              ${DIFFICULTY_CONFIG[difficulty].color}`}>
              {DIFFICULTY_CONFIG[difficulty].emoji} {difficulty}
            </span>
            <span className="font-mono text-xs text-[var(--color-muted)]">
              ⏱ {formatTime(elapsed)}
            </span>
          </div>
        </div>
        <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-teal)] rounded-full transition-all duration-500"
            style={{ width: `${((questionNumber - 1) / 5) * 100}%` }}
          />
        </div>
      </div>

      {loading ? (
        <div className="card bg-white p-12 text-center">
          <div className="w-10 h-10 border-4 border-[var(--color-teal)] border-t-transparent
                          rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-[var(--color-muted)]">
            Euler is preparing your question...
          </p>
        </div>
      ) : (
        <div className="space-y-5">

          {/* Question card */}
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-ink)] px-6 py-3 flex items-center
                            justify-between">
              <span className="font-serif text-white font-semibold">
                Question {questionNumber}
              </span>
              <span className="font-mono text-white/60 text-xs">
                Score: {Math.round(score / questionNumber - 1 || 0)}%
              </span>
            </div>
            <div className="bg-white p-6">
              <p className="text-[var(--color-ink)] text-base leading-relaxed font-medium">
                {question}
              </p>

              {/* Hint */}
              {hint && !submitted && (
                <div className="mt-4">
                  {showHint ? (
                    <div className="bg-yellow-50 border border-yellow-200
                                    rounded-xl p-4 text-sm text-yellow-800">
                      💡 <strong>Hint:</strong> {hint}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowHint(true)}
                      className="text-xs text-[var(--color-muted)] hover:text-[var(--color-teal)]
                                 font-mono uppercase tracking-widest transition-colors"
                    >
                      💡 Show hint
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Answer input */}
          {!submitted && (
            <div className="card bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--color-border)]">
                <label className="font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)]">
                  Your Answer
                </label>
              </div>
              <div className="p-5 space-y-4">
                <textarea
                  value={studentAnswer}
                  onChange={e => setStudentAnswer(e.target.value)}
                  placeholder="Type your full working and answer here..."
                  rows={5}
                  className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                             focus:border-[var(--color-teal)] rounded-xl px-4 py-3 text-sm
                             text-[var(--color-ink)] placeholder:text-[var(--color-muted)]
                             resize-none transition-colors"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!studentAnswer.trim() || loading}
                  className="w-full btn-primary py-3.5 justify-center flex
                             items-center gap-2 disabled:opacity-50"
                >
                  Submit Answer ➤
                </button>
              </div>
            </div>
          )}

          {/* Grade result */}
          {submitted && gradeResult && (
            <div className="card overflow-hidden">
              <div className={`px-6 py-4 flex items-center justify-between
                ${gradeResult.is_correct ? 'bg-green-50' : 'bg-red-50'}`}>
                <ResultBadge result={gradeResult.result} />
                <span className={`font-serif font-black text-2xl
                  ${gradeResult.is_correct ? 'text-green-600' : 'text-red-500'}`}>
                  +{gradeResult.score}pts
                </span>
              </div>
              <div className="bg-white p-6 space-y-4">
                <p className="text-[var(--color-ink)] leading-relaxed">
                  {gradeResult.feedback}
                </p>
                <p className="text-[var(--color-teal)] font-medium italic text-sm">
                  "{gradeResult.motivation}"
                </p>

                {/* Show correct answer */}
                <div>
                  <button
                    onClick={() => setShowAnswer(a => !a)}
                    className="text-sm font-medium text-[var(--color-teal)]
                               hover:underline transition-all"
                  >
                    {showAnswer ? '▲ Hide Solution' : '▼ Show Full Solution'}
                  </button>
                  {showAnswer && (
                    <div className="mt-3 bg-[var(--color-paper)] border
                                    border-[var(--color-border)] rounded-xl p-4">
                      <ExplanationBody text={answer} />
                    </div>
                  )}
                </div>

                <button
                  onClick={handleNext}
                  className="w-full btn-primary py-3.5 justify-center flex items-center gap-2"
                >
                  {questionNumber >= 5 ? '🏁 Finish Session' : 'Next Question ➤'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}