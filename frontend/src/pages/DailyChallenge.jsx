import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDailyChallenge } from '../services/api'
import { awardXP, XP, updateStreak } from '../lib/stats'

const TODAY = new Date().toISOString().slice(0, 10)
const DONE_KEY = `dailyChallenge_${TODAY}`
const DAILY_XP = XP.DAILY_CHALLENGE

const OPTION_LABELS = ['A', 'B', 'C', 'D']

function optionText(q, letter) {
  const map = {
    A: q.option_a,
    B: q.option_b,
    C: q.option_c,
    D: q.option_d,
  }
  return map[letter] || ''
}

export default function DailyChallenge() {
  const { user } = useAuth()

  const [question, setQuestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [examType, setExamType] = useState('JAMB')
  const [xpAwarded, setXpAwarded] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(DONE_KEY)
    if (done) {
      setAlreadyDone(true)
      setLoading(false)
      return
    }
    loadChallenge(examType)
  }, [])

  const loadChallenge = async (type) => {
    setLoading(true)
    setQuestion(null)
    setSelected(null)
    setSubmitted(false)
    setCorrect(false)

    try {
      const res = await getDailyChallenge(type)
      setQuestion(res.data.question)
    } catch {
      setQuestion(null)
    }

    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!selected || submitted || !user) return

    const isCorrect = selected === question.correct_answer
    setCorrect(isCorrect)
    setSubmitted(true)

    if (isCorrect && !xpAwarded) {
      localStorage.setItem(DONE_KEY, 'done')
      setAlreadyDone(true)

      try {
        await awardXP(user.id, DAILY_XP, 'daily_challenge')
        await updateStreak(user.id)
      } catch (err) {
        console.error('XP award failed:', err)
      }

      setXpAwarded(true)
    }
  }

  // ── Already completed today ─────────────────────────────
  if (alreadyDone && !submitted) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="text-7xl mb-4">🎉</div>
        <h1 className="font-serif font-black text-4xl mb-3">
          Challenge Complete!
        </h1>
        <p className="text-[var(--color-muted)] text-lg mb-8">
          You've already done today's challenge. Come back tomorrow for a new one!
        </p>
        <p className="font-mono text-sm text-[var(--color-teal)] mb-8 font-bold">
          +{DAILY_XP} XP awarded ✅
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link to="/cbt" className="btn-primary px-6 py-3">
            🖥️ Try a Full CBT
          </Link>
          <Link to="/practice" className="btn-secondary px-6 py-3">
            🎯 Practice Now
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase text-[var(--color-gold)] mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" />
          Daily Challenge · {TODAY}
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight">
          🔥 Daily Challenge
        </h1>
        <p className="text-[var(--color-muted)] mt-2">
          One question per day. Answer correctly to earn{' '}
          <strong>{DAILY_XP} XP</strong>.
        </p>
      </div>

      {/* Exam Type Selector */}
      {!submitted && (
        <div className="flex gap-2 mb-6">
          {['JAMB', 'WAEC', 'NECO'].map((t) => (
            <button
              key={t}
              onClick={() => {
                setExamType(t)
                loadChallenge(t)
              }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all
              ${
                examType === t
                  ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card bg-white p-12 text-center">
          <div className="w-10 h-10 border-4 border-[var(--color-teal)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-[var(--color-muted)]">
            Loading today's challenge...
          </p>
        </div>
      )}

      {/* Question */}
      {!loading && question && (
        <div className="space-y-5">
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-teal)] px-6 py-4 flex items-center justify-between">
              <span className="font-serif font-bold text-white text-lg">
                Today's Question
              </span>
              <span className="font-mono text-white/70 text-xs uppercase tracking-widest">
                {question.exam_type} {question.year || ''}
              </span>
            </div>
            <div className="bg-white p-6">
              {question.image_url && (
                <img
                  src={question.image_url}
                  alt="Question figure"
                  className="max-w-full mb-4 rounded-xl border border-[var(--color-border)]"
                />
              )}
              <p className="text-[var(--color-ink)] text-base leading-relaxed font-medium">
                {question.question_text}
              </p>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {OPTION_LABELS.map((letter) => {
              const text = optionText(question, letter)
              if (!text) return null

              const isCorrectAnswer = letter === question.correct_answer
              const isSelected = letter === selected

              let style =
                'border-[var(--color-border)] bg-white hover:border-[var(--color-teal)]'

              if (submitted) {
                if (isCorrectAnswer) style = 'border-green-500 bg-green-50'
                else if (isSelected) style = 'border-red-400 bg-red-50'
                else style = 'border-[var(--color-border)] bg-white opacity-60'
              } else if (isSelected) {
                style = 'border-[var(--color-teal)] bg-[#e8f4f4]'
              }

              return (
                <button
                  key={letter}
                  disabled={submitted}
                  onClick={() => setSelected(letter)}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-150 ${style}`}
                >
                  <span className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-sm border-2">
                    {letter}
                  </span>
                  <span className="text-sm text-[var(--color-ink)] pt-0.5">
                    {text}
                  </span>
                </button>
              )
            })}
          </div>

          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={!selected}
              className="w-full btn-primary py-4 text-base justify-center flex disabled:opacity-50"
            >
              Submit Answer ➤
            </button>
          ) : (
            <div className="card p-6 bg-white text-center">
              <div className="text-3xl mb-3">
                {correct ? '🎉' : '❌'}
              </div>
              <p className="font-bold text-lg mb-2">
                {correct
                  ? `Correct! +${DAILY_XP} XP earned!`
                  : `Incorrect — Correct answer: ${question.correct_answer}`}
              </p>

              {question.explanation && (
                <div className="bg-gray-50 rounded-xl p-4 text-sm mt-4">
                  <p className="font-semibold mb-1">📖 Explanation</p>
                  {question.explanation}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Link
                  to="/cbt"
                  className="flex-1 btn-primary py-3 text-sm text-center"
                >
                  🖥️ Full CBT
                </Link>
                <Link
                  to="/practice"
                  className="flex-1 btn-secondary py-3 text-sm text-center"
                >
                  🎯 Practice
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !question && (
        <div className="card bg-white p-10 text-center">
          ⚠️ Could not load today's challenge. Make sure the backend is running.
        </div>
      )}
    </div>
  )
}