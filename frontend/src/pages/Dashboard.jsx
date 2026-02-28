import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDashboardStats } from '../lib/progress'
import { getUserStats, xpProgress } from '../lib/stats'
import WelcomeBanner from '../components/WelcomeBanner'
import AppRating from '../components/AppRating'

const TODAY = new Date().toISOString().slice(0, 10)
const DAILY_KEY = `dailyChallenge_${TODAY}`

// ── Spaced Review Due Card ────────────────────────────────
function SpacedReviewCard({ userId }) {
  const [due, setDue] = useState(null)
  useEffect(() => {
    if (!userId) return
    const base = import.meta.env.VITE_API_URL
    fetch(`${base}/tracking/spaced-due/${userId}`)
      .then(r => r.json())
      .then(d => setDue(d.due_count || 0))
      .catch(() => setDue(0))
  }, [userId])
  if (due === null || due === 0) return null
  return (
    <Link to="/review"
      className="block rounded-2xl px-6 py-4 mb-6 bg-purple-600
                 flex items-center justify-between hover:bg-purple-700 transition-colors">
      <div>
        <p className="font-mono text-[10px] text-white/70 uppercase tracking-widest mb-0.5">
          Spaced Repetition
        </p>
        <p className="font-serif font-bold text-white text-xl">
          🧠 {due} card{due !== 1 ? 's' : ''} due for review
        </p>
        <p className="text-white/70 text-xs mt-0.5">Click to start your review session</p>
      </div>
      <span className="w-3 h-3 rounded-full bg-white animate-pulse shrink-0" />
    </Link>
  )
}

// ── Stat Card ─────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = 'teal' }) {
  const colors = {
    teal: 'bg-[var(--color-teal)] text-white',
    gold: 'bg-[var(--color-gold)] text-[var(--color-ink)]',
    ink: 'bg-[var(--color-ink)] text-white',
    green: 'bg-green-500 text-white',
    red: 'bg-red-500 text-white',
  }
  return (
    <div className="card overflow-hidden">
      <div className={`${colors[color]} px-5 py-4 flex items-center gap-3`}>
        <span className="text-3xl">{icon}</span>
        <div>
          <div className="font-serif font-black text-3xl leading-none">{value}</div>
          <div className="text-sm font-medium opacity-80 mt-0.5">{label}</div>
        </div>
      </div>
      {sub && (
        <div className="bg-white px-5 py-2.5 text-xs text-[var(--color-muted)]">
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Performance Prediction ───────────────────────────
function PredictionWidget({ stats, xpStats }) {
  const acc = stats?.accuracy || 0
  const total = stats?.totalAttempted || 0
  const streak = xpStats?.streak_current || 0
  if (total < 10) return null  // need enough data

  const bonus = Math.min(10, Math.floor(streak / 7))
  const predicted = Math.min(100, acc + bonus)
  const emoji = predicted >= 75 ? '🏆' : predicted >= 50 ? '📈' : '⚠️'
  const color = predicted >= 75 ? 'bg-green-500' : predicted >= 50 ? 'bg-[var(--color-teal)]' : 'bg-orange-500'
  const msg = predicted >= 75
    ? 'On track for Distinction! Keep this consistency.'
    : predicted >= 50
      ? 'Predicted to pass. Push weak topics to reach Distinction.'
      : 'Need more practice to reach the 50% pass mark. Drill weak topics daily.'

  return (
    <div className="card overflow-hidden mb-6">
      <div className={`${color} px-6 py-4 flex items-center justify-between`}>
        <div>
          <p className="font-mono text-[10px] text-white/70 uppercase tracking-widest mb-1">
            Performance Prediction
          </p>
          <p className="font-serif font-bold text-white text-xl">{emoji} WAEC Estimate: ~{predicted}%</p>
          <p className="text-white/80 text-xs mt-0.5">{msg}</p>
        </div>
        <div className="font-serif font-black text-5xl text-white shrink-0 ml-4">{predicted}%</div>
      </div>
      <div className="bg-white px-6 py-4 space-y-2">
        <div className="relative h-3 bg-[var(--color-border)] rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-red-100 rounded-full" style={{ width: '50%' }} />
          <div className="absolute inset-0 bg-yellow-100 rounded-full" style={{ width: '75%' }} />
          <div className={`absolute inset-0 ${color} rounded-full transition-all duration-700`}
            style={{ width: `${predicted}%` }} />
          <div className="absolute top-0 h-full w-0.5 bg-white/70" style={{ left: '50%' }} />
          <div className="absolute top-0 h-full w-0.5 bg-white/70" style={{ left: '75%' }} />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-[var(--color-muted)]">
          <span>0%</span><span className="text-red-400">Pass 50%</span>
          <span className="text-yellow-500">Distinct. 75%</span><span>100%</span>
        </div>
        <p className="text-[10px] text-[var(--color-muted)] font-mono">
          From: {total} questions · {acc}% accuracy · 🔥{streak}d streak · +{bonus}% streak bonus
        </p>
      </div>
    </div>
  )
}

// ── Accuracy Bar ──────────────────────────────────────────
function AccuracyBar({ topic, attempted, correct }) {
  const pct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-ink)] truncate">{topic}</p>
        <p className="text-xs text-[var(--color-muted)]">{correct}/{attempted} correct</p>
      </div>
      <div className="w-24 h-2 bg-[var(--color-border)] rounded-full overflow-hidden shrink-0">
        <div className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-sm font-bold w-10 text-right shrink-0
        ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
        {pct}%
      </span>
    </div>
  )
}

// ── Exam Countdown ────────────────────────────────────────
function ExamCountdown({ profile }) {
  if (!profile?.exam_date) return null

  const days = Math.max(0, Math.ceil(
    (new Date(profile.exam_date) - new Date()) / 86400000
  ))
  const target = profile.exam_target || 'Exam'
  const urgency = days <= 7 ? 'bg-red-500'
    : days <= 30 ? 'bg-orange-400'
      : days <= 60 ? 'bg-yellow-500'
        : 'bg-[var(--color-teal)]'

  return (
    <div className={`${urgency} rounded-2xl px-6 py-5 text-white mb-6
                     flex items-center justify-between`}>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest
                      text-white/60 mb-1">Countdown</p>
        <p className="font-serif font-black text-3xl">
          {days === 0 ? 'Today!' : `${days} day${days !== 1 ? 's' : ''}`}
        </p>
        <p className="text-white/80 text-sm">until {target}</p>
      </div>
      <div className="text-5xl">
        {days === 0 ? '🎯' : days <= 7 ? '🔥' : days <= 30 ? '📚' : '⏳'}
      </div>
    </div>
  )
}

// ── XP Progress Bar ───────────────────────────────────────
function XPBar({ xpStats }) {
  if (!xpStats) return null
  const { level, progress, current, needed } = xpProgress(xpStats.xp || 0)

  return (
    <div className="card bg-white p-5 mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-teal)] flex items-center
                          justify-center font-serif font-black text-white text-lg">
            {level}
          </div>
          <div>
            <p className="font-semibold text-sm text-[var(--color-ink)]">Level {level}</p>
            <p className="text-xs text-[var(--color-muted)]">
              ⚡ {(xpStats.xp || 0).toLocaleString()} XP total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-orange-500 font-bold">
            🔥 {xpStats.streak_current || 0} day streak
          </span>
          <span className="text-[var(--color-muted)]">
            Best: {xpStats.streak_best || 0}d
          </span>
        </div>
      </div>

      <div className="flex justify-between text-[10px] font-mono
                      text-[var(--color-muted)] mb-1.5">
        <span>Lv.{level}</span>
        <span>{current} / {needed} XP to Lv.{level + 1}</span>
      </div>
      <div className="w-full bg-[var(--color-border)] rounded-full h-2.5">
        <div className="bg-[var(--color-teal)] h-2.5 rounded-full transition-all duration-700"
          style={{ width: `${progress}%` }} />
      </div>

      {/* Mini badge row */}
      {xpStats.badges?.length > 0 && (
        <div className="flex gap-1 mt-3 flex-wrap">
          {xpStats.badges.slice(0, 8).map((b, i) => {
            const EMOJI = {
              first_exam: '🎯', streak_3: '🔥', streak_7: '⚡', streak_30: '👑',
              perfect: '💯', century: '🏆', level_5: '⭐', level_10: '🌟',
              speed_demon: '⚡', consistent: '📚',
            }
            return (
              <span key={i} className="text-lg" title={b}>
                {EMOJI[b] || '🏅'}
              </span>
            )
          })}
          {xpStats.badges.length > 8 && (
            <span className="text-xs text-[var(--color-muted)] font-mono self-center">
              +{xpStats.badges.length - 8} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Quick Actions ─────────────────────────────────────────
function QuickActions() {
  const actions = [
    { path: '/daily', icon: '🔥', label: 'Daily', color: 'bg-orange-500 text-white' },
    { path: '/cbt', icon: '🖥️', label: 'CBT Exam', color: 'bg-[var(--color-ink)] text-white' },
    { path: '/practice', icon: '🎯', label: 'Practice', color: 'bg-[var(--color-teal)] text-white' },
    { path: '/teach', icon: '📚', label: 'Study', color: 'bg-[var(--color-gold)] text-[var(--color-ink)]' },
    { path: '/planner', icon: '📅', label: 'Planner', color: 'bg-purple-500 text-white' },
    { path: '/mastery', icon: '📊', label: 'Mastery', color: 'bg-green-500 text-white' },
    { path: '/leaderboard', icon: '🏆', label: 'Leaders', color: 'bg-orange-400 text-white' },
    { path: '/formulas', icon: '📐', label: 'Formulas', color: 'bg-blue-500 text-white' },
  ]
  return (
    <div className="card bg-white overflow-hidden mb-6">
      <div className="bg-[var(--color-ink)] px-6 py-4">
        <p className="font-serif font-bold text-white">⚡ Quick Actions</p>
      </div>
      <div className="p-4 grid grid-cols-4 sm:grid-cols-8 gap-2">
        {actions.map(a => (
          <Link key={a.path} to={a.path}
            className={`${a.color} rounded-xl flex flex-col items-center
                        justify-center gap-1.5 py-3 px-2 text-center
                        hover:opacity-90 transition-opacity`}>
            <span className="text-xl">{a.icon}</span>
            <span className="font-mono text-[9px] uppercase tracking-wide
                             font-bold leading-none">
              {a.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────
export default function Dashboard() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [xpStats, setXpStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadAll()
  }, [user])

  const loadAll = async () => {
    setLoading(true)
    const [data, xp] = await Promise.all([
      getDashboardStats(user.id),
      getUserStats(user.id),
    ])
    setStats(data)
    setXpStats(xp)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="h-12 w-64 bg-[var(--color-border)] rounded-2xl animate-pulse mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-[var(--color-border)] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">

      {/* Welcome banner */}
      <WelcomeBanner compact />

      {/* Page header */}
      <div className="mb-6 flex items-end justify-between mt-6 flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase
                        text-[var(--color-gold)] mb-2 flex items-center gap-3">
            <span className="block w-6 h-px bg-[var(--color-gold)]" />
            Dashboard
          </p>
          <h1 className="font-serif font-black text-5xl tracking-tight">
            Your Progress
          </h1>
        </div>
        <div className="flex gap-3">
          <Link to="/practice" className="btn-primary px-5 py-2.5 text-sm">🎯 Practice</Link>
          <Link to="/teach" className="btn-secondary px-5 py-2.5 text-sm">📚 Study</Link>
        </div>
      </div>

      {/* Exam countdown (only shows if exam_date set in profile) */}
      <ExamCountdown profile={profile} />

      {/* XP / Level bar */}
      <XPBar xpStats={xpStats} />

      {/* Spaced review due */}
      <SpacedReviewCard userId={user?.id} />

      {/* Quick actions */}
      <QuickActions />

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon="📚" label="Topics Studied"
          value={stats.topicsStudied}
          sub="Keep exploring new topics!"
          color="teal"
        />
        <StatCard
          icon="🎯" label="Questions Done"
          value={stats.totalAttempted}
          sub={`${stats.totalCorrect} answered correctly`}
          color="ink"
        />
        <StatCard
          icon="📊" label="Accuracy"
          value={`${stats.accuracy}%`}
          sub={`Avg practice score: ${stats.avgScore}%`}
          color={stats.accuracy >= 70 ? 'green' : 'gold'}
        />
        <StatCard
          icon="🔖" label="Bookmarks"
          value={stats.bookmarkCount}
          sub={`${stats.conversationCount} conversations`}
          color="gold"
        />
      </div>

      {/* Prediction widget */}
      <PredictionWidget stats={stats} xpStats={xpStats} />

      {/* Weak + strong topics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card overflow-hidden">
          <div className="bg-red-500 px-6 py-4">
            <p className="font-serif font-bold text-white text-lg">
              ⚠️ Topics Needing Work
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              Focus here to improve your score
            </p>
          </div>
          <div className="bg-white p-6 space-y-4">
            {stats.weakTopics.length === 0 ? (
              <p className="text-green-600 font-medium text-center py-4">
                🎉 No weak topics yet — keep practising!
              </p>
            ) : stats.weakTopics.map(t => {
              const pct = t.questions_attempted > 0
                ? Math.round((t.questions_correct / t.questions_attempted) * 100) : 0
              return (
                <div key={t.topic}>
                  <AccuracyBar topic={t.topic}
                    attempted={t.questions_attempted} correct={t.questions_correct} />
                  <Link
                    to={`/practice?topic=${encodeURIComponent(t.topic)}&auto=true`}
                    className="inline-flex items-center gap-1 mt-1 ml-0 text-xs
                               text-[var(--color-teal)] font-semibold hover:underline">
                    ⚡ Quick Drill
                  </Link>
                </div>
              )
            })}
            {stats.weakTopics.length > 0 && (
              <Link to="/practice"
                className="block text-center text-sm text-[var(--color-teal)]
                           font-semibold hover:underline mt-2">
                Practice these topics →
              </Link>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="bg-green-500 px-6 py-4">
            <p className="font-serif font-bold text-white text-lg">
              ✅ Your Strong Topics
            </p>
            <p className="text-white/70 text-xs mt-0.5">Topics you've mastered</p>
          </div>
          <div className="bg-white p-6 space-y-4">
            {stats.strongTopics.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-[var(--color-muted)] text-sm">
                  Complete practice sessions to see your strong topics here.
                </p>
                <Link to="/practice"
                  className="inline-block mt-3 text-sm text-[var(--color-teal)]
                             font-semibold hover:underline">
                  Start practising →
                </Link>
              </div>
            ) : stats.strongTopics.map(t => (
              <AccuracyBar key={t.topic} topic={t.topic}
                attempted={t.questions_attempted} correct={t.questions_correct} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Daily Challenge Card ── */}
      {(() => {
        const done = localStorage.getItem(DAILY_KEY)
        return (
          <div className={`rounded-2xl px-6 py-5 flex items-center justify-between mb-6
            ${done ? 'bg-green-500' : 'bg-orange-500'}`}>
            <div>
              <p className="font-mono text-[10px] text-white/70 uppercase tracking-widest mb-1">
                Daily Challenge · {TODAY}
              </p>
              <p className="font-serif font-bold text-white text-xl">
                {done ? '✅ Completed Today!' : '🔥 Today\'s Challenge'}
              </p>
              <p className="text-white/80 text-sm mt-0.5">
                {done ? 'Great job! Come back tomorrow for a new question.' : 'Answer 1 question — earn 50 XP'}
              </p>
            </div>
            {done
              ? <span className="text-4xl">🎉</span>
              : <Link to="/daily"
                className="bg-white text-orange-500 font-bold font-serif
                             px-5 py-2.5 rounded-xl text-sm hover:bg-orange-50
                             transition-colors shrink-0">
                Play →
              </Link>
            }
          </div>
        )
      })()}

      {/* ── Recent sessions ── */}
      {stats.recentSessions.length > 0 && (
        <div className="card overflow-hidden mb-6">
          <div className="bg-[var(--color-ink)] px-6 py-4">
            <p className="font-serif font-bold text-white text-lg">
              🕒 Recent Practice Sessions
            </p>
          </div>
          <div className="bg-white divide-y divide-[var(--color-border)]">
            {stats.recentSessions.map(session => (
              <div key={session.id}
                className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--color-ink)]">{session.topic}</p>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">
                    {session.difficulty} difficulty · {' '}
                    {new Date(session.completed_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </p>
                </div>
                <div className={`font-serif font-black text-2xl
                  ${session.score >= 80 ? 'text-green-600'
                    : session.score >= 60 ? 'text-yellow-600'
                      : 'text-red-500'}`}>
                  {session.score}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* App rating */}
      <AppRating />

      {/* Empty state */}
      {stats.topicsStudied === 0 && (
        <div className="card bg-white p-12 text-center mt-6">
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="font-serif font-bold text-2xl text-[var(--color-ink)] mb-2">
            Your journey starts here!
          </h3>
          <p className="text-[var(--color-muted)] mb-6 max-w-sm mx-auto">
            Study topics in the Teach module and practice questions
            to start tracking your progress.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/teach" className="btn-primary px-6 py-3">📚 Start Learning</Link>
            <Link to="/practice" className="btn-secondary px-6 py-3">🎯 Practice Now</Link>
          </div>
        </div>
      )}
    </div>
  )
}