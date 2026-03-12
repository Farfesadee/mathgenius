// src/pages/StudyPlanner.jsx
//
// AI-powered personalised study plan page
// - Loads saved plan from Supabase on mount
// - Lets student regenerate at any time
// - Streams plan from Groq via backend
// - Displays day-by-day cards with topics, tasks, and duration

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getStudyPlan, generateStudyPlan, getTopicProgress } from '../services/api'
import { supabase } from '../lib/supabase'

// ── Helpers ────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  return diff > 0 ? diff : 0
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function masteryColor(level) {
  if (level === 'beginner')     return 'bg-red-100 text-red-700'
  if (level === 'intermediate') return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

function topicEmoji(score) {
  if (score >= 75) return '✅'
  if (score >= 50) return '⚠️'
  return '🔴'
}

// ── Sub-components ─────────────────────────────────────────────────

function DayCard({ day, isToday }) {
  const [open, setOpen] = useState(isToday)

  return (
    <div className={`card bg-white rounded-2xl overflow-hidden border-2 transition-all
      ${isToday
        ? 'border-[var(--color-teal)] shadow-md'
        : 'border-[var(--color-border)] hover:border-[var(--color-teal)]'
      }`}>

      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center
            font-black text-sm
            ${isToday
              ? 'bg-[var(--color-teal)] text-white'
              : 'bg-[var(--color-bg)] text-[var(--color-ink)]'
            }`}>
            {day.day}
          </div>
          <div>
            <p className="font-semibold text-sm text-[var(--color-ink)]">
              {day.topic}
              {isToday && (
                <span className="ml-2 text-xs bg-[var(--color-teal)] text-white
                                 px-2 py-0.5 rounded-full">Today</span>
              )}
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              {formatDate(day.date)} · {day.duration_mins || 45} mins
            </p>
          </div>
        </div>
        <span className="text-[var(--color-muted)] text-lg">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-[var(--color-border)] pt-3">
          {day.focus && (
            <p className="text-sm text-[var(--color-muted)] italic">
              🎯 {day.focus}
            </p>
          )}
          <ul className="space-y-2">
            {(day.tasks || []).map((task, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-ink)]">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-[#e8f4f4]
                                 text-[var(--color-teal)] flex items-center
                                 justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </span>
                {task}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}


function WeakTopicsBadges({ topics }) {
  if (!topics || topics.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {topics.map(t => (
        <span key={t.topic}
          className={`text-xs px-2 py-1 rounded-full font-medium
            ${masteryColor(t.mastery_level)}`}>
          {topicEmoji(t.avg_score || 0)} {t.topic}
          {t.avg_score != null && ` · ${Math.round(t.avg_score)}%`}
        </span>
      ))}
    </div>
  )
}


// ── Main page ──────────────────────────────────────────────────────

export default function StudyPlanner() {
  const { user, profile } = useAuth()

  const [plan,         setPlan]         = useState(null)   // saved plan object
  const [weakTopics,   setWeakTopics]   = useState([])
  const [generating,   setGenerating]   = useState(false)
  const [streaming,    setStreaming]     = useState('')     // raw streamed text
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(true)
  const [activeTab,    setActiveTab]    = useState('plan') // 'plan' | 'topics'
  const abortRef = useRef(null)

  const examTarget = profile?.exam_target || 'WAEC'
  const examDate   = profile?.exam_date   || null
  const daysLeft   = daysUntil(examDate)

  // ── Load saved plan + weak topics on mount ─────────────────────
  useEffect(() => {
    if (!user) return
    Promise.all([
      loadSavedPlan(),
      loadWeakTopics(),
    ]).finally(() => setLoading(false))
  }, [user])

  async function loadSavedPlan() {
    try {
      const res = await getStudyPlan(user.id)
      if (res.data) setPlan(res.data)
    } catch {
      // 404 = no plan yet, that's fine
    }
  }

  async function loadWeakTopics() {
    try {
      const { data } = await getTopicProgress(user.id)
      if (data) {
        const weak = data.filter(t =>
          t.mastery_level === 'beginner' ||
          t.mastery_level === 'intermediate' ||
          (t.avg_score ?? 100) < 60
        )
        setWeakTopics(weak)
      }
    } catch {
      // topic_progress might be empty for new users
    }
  }

  // ── Generate plan ──────────────────────────────────────────────
  async function handleGenerate() {
    setGenerating(true)
    setStreaming('')
    setError('')

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/study-plan/generate`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            Authorization:   `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            user_id:     user.id,
            exam_target: examTarget,
            exam_date:   examDate,
            days_until:  daysLeft,
          }),
        }
      )

      if (!response.ok) throw new Error(`Server error ${response.status}`)

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let   raw     = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        raw += chunk
        setStreaming(raw)
      }

      // Parse completed JSON
      try {
        let clean = raw.trim()
        if (clean.startsWith('```')) {
          clean = clean.split('```')[1]
          if (clean.startsWith('json')) clean = clean.slice(4)
        }
        const parsed = JSON.parse(clean.trim())
        setPlan({
          plan:        parsed,
          exam_target: examTarget,
          exam_date:   examDate,
          days_until:  daysLeft,
          weak_topics: weakTopics.map(t => t.topic),
          generated_at: new Date().toISOString(),
        })
        setStreaming('')
      } catch {
        setError('Plan was generated but could not be parsed. Please try again.')
      }

    } catch (err) {
      setError(err.message || 'Failed to generate plan. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Derived ────────────────────────────────────────────────────
  const days     = plan?.plan?.days || []
  const todayStr = new Date().toISOString().split('T')[0]
  const todayIdx = days.findIndex(d => d.date === todayStr)

  // ── Render ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10
                        border-4 border-[var(--color-teal)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="font-serif font-black text-4xl tracking-tight
                       text-[var(--color-ink)]">
          Study Plan
        </h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">
          {examTarget} prep
          {daysLeft != null && ` · ${daysLeft} days to go`}
          {examDate  && ` · Exam: ${formatDate(examDate)}`}
        </p>
      </div>

      {/* ── Exam info missing warning ───────────────────────────── */}
      {!examDate && (
        <div className="card bg-amber-50 border border-amber-200 rounded-2xl p-4
                        flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-sm text-amber-800">No exam date set</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Set your exam date in{' '}
              <a href="/profile" className="underline font-medium">Profile → Settings</a>
              {' '}for a more accurate plan.
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-[var(--color-bg)] rounded-xl p-1">
        {[
          { id: 'plan',   label: '📅 Study Plan' },
          { id: 'topics', label: `🔴 Weak Topics (${weakTopics.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
              ${activeTab === t.id
                ? 'bg-white text-[var(--color-teal)] shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: PLAN ══════════════════════════════════════════════ */}
      {activeTab === 'plan' && (
        <div className="space-y-4">

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full btn-primary py-3 text-sm font-semibold
                       flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {generating
              ? <><span className="animate-spin">⏳</span> Generating your plan...</>
              : plan
                ? '🔄 Regenerate Plan'
                : '✨ Generate My Study Plan'
            }
          </button>

          {/* Error */}
          {error && (
            <div className="card bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Streaming progress */}
          {streaming && !plan && (
            <div className="card bg-white rounded-2xl p-4 space-y-2">
              <p className="text-sm font-semibold text-[var(--color-teal)] animate-pulse">
                ✨ Euler is building your plan...
              </p>
              <p className="text-xs text-[var(--color-muted)] font-mono
                            max-h-32 overflow-hidden">
                {streaming.slice(-300)}
              </p>
            </div>
          )}

          {/* Plan summary */}
          {plan && plan.plan?.summary && (
            <div className="card bg-[#f0fdfa] border border-[#99f6e4] rounded-2xl p-4">
              <p className="text-sm font-semibold text-[var(--color-teal)] mb-1">
                📋 Strategy
              </p>
              <p className="text-sm text-[var(--color-ink)]">{plan.plan.summary}</p>
              <p className="text-xs text-[var(--color-muted)] mt-2">
                Generated {plan.generated_at
                  ? new Date(plan.generated_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })
                  : 'just now'}
                {' '}· {days.length} days
              </p>
            </div>
          )}

          {/* No plan yet */}
          {!plan && !generating && !streaming && (
            <div className="card bg-white rounded-2xl p-8 text-center space-y-3">
              <p className="text-4xl">📚</p>
              <p className="font-semibold text-[var(--color-ink)]">
                No study plan yet
              </p>
              <p className="text-sm text-[var(--color-muted)]">
                Tap the button above and Euler will build a personalised
                day-by-day plan based on your weak topics and exam date.
              </p>
            </div>
          )}

          {/* Day cards */}
          {days.length > 0 && (
            <div className="space-y-3">
              {days.map((day, i) => (
                <DayCard
                  key={day.day || i}
                  day={day}
                  isToday={i === todayIdx}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: WEAK TOPICS ═══════════════════════════════════════ */}
      {activeTab === 'topics' && (
        <div className="space-y-4">
          {weakTopics.length === 0 ? (
            <div className="card bg-white rounded-2xl p-8 text-center space-y-3">
              <p className="text-4xl">🎉</p>
              <p className="font-semibold text-[var(--color-ink)]">
                No weak topics yet!
              </p>
              <p className="text-sm text-[var(--color-muted)]">
                Complete some practice sessions and your weak topics
                will appear here automatically.
              </p>
              <a href="/practice"
                className="inline-block btn-primary px-6 py-2.5 text-sm mt-2">
                Start Practising →
              </a>
            </div>
          ) : (
            weakTopics.map(t => (
              <div key={t.topic}
                className="card bg-white rounded-2xl p-4 flex items-center
                           justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--color-ink)] truncate">
                    {t.topic}
                  </p>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">
                    {t.sessions_done || 0} session{t.sessions_done !== 1 ? 's' : ''} done
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Score bar */}
                  <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(t.avg_score || 0, 100)}%`,
                        background: (t.avg_score || 0) >= 60
                          ? 'var(--color-teal)'
                          : (t.avg_score || 0) >= 40
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-[var(--color-ink)] w-10 text-right">
                    {Math.round(t.avg_score || 0)}%
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${masteryColor(t.mastery_level)}`}>
                    {t.mastery_level || 'beginner'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
