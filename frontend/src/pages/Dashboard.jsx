import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDashboardStats } from '../lib/progress'

import WelcomeBanner from '../components/WelcomeBanner'
import AppRating from '../components/AppRating'

function StatCard({ icon, label, value, sub, color = 'teal' }) {
  const colors = {
    teal:   'bg-[var(--color-teal)] text-white',
    gold:   'bg-[var(--color-gold)] text-[var(--color-ink)]',
    ink:    'bg-[var(--color-ink)] text-white',
    green:  'bg-green-500 text-white',
    red:    'bg-red-500 text-white',
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

function AccuracyBar({ topic, attempted, correct }) {
  const pct  = attempted > 0 ? Math.round((correct / attempted) * 100) : 0
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-ink)] truncate">{topic}</p>
        <p className="text-xs text-[var(--color-muted)]">
          {correct}/{attempted} correct
        </p>
      </div>
      <div className="w-24 h-2 bg-[var(--color-border)] rounded-full overflow-hidden shrink-0">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-sm font-bold w-10 text-right shrink-0
        ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
        {pct}%
      </span>
    </div>
  )
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadStats()
  }, [user])

  const loadStats = async () => {
    setLoading(true)
    const data = await getDashboardStats(user.id)
    setStats(data)
    setLoading(false)
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Student'

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

      {/* Header */}
      {/* Welcome banner */}
<WelcomeBanner compact />

{/* Original header */}
<div className="mb-8 flex items-end justify-between mt-6">
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
    <Link to="/practice" className="btn-primary px-5 py-2.5 text-sm">
      🎯 Practice
    </Link>
    <Link to="/teach" className="btn-secondary px-5 py-2.5 text-sm">
      📚 Study
    </Link>
  </div>
</div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Weak topics */}
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
              <div className="text-center py-4">
                <p className="text-green-600 font-medium">
                  🎉 No weak topics yet — keep practising!
                </p>
              </div>
            ) : (
              stats.weakTopics.map(t => (
                <AccuracyBar
                  key={t.topic}
                  topic={t.topic}
                  attempted={t.questions_attempted}
                  correct={t.questions_correct}
                />
              ))
            )}
            {stats.weakTopics.length > 0 && (
              <Link
                to="/practice"
                className="block text-center text-sm text-[var(--color-teal)]
                           font-semibold hover:underline mt-2"
              >
                Practice these topics →
              </Link>
            )}
          </div>
        </div>

        {/* Strong topics */}
        <div className="card overflow-hidden">
          <div className="bg-green-500 px-6 py-4">
            <p className="font-serif font-bold text-white text-lg">
              ✅ Your Strong Topics
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              Topics you've mastered
            </p>
          </div>
          <div className="bg-white p-6 space-y-4">
            {stats.strongTopics.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-[var(--color-muted)] text-sm">
                  Complete practice sessions to see your strong topics here.
                </p>
                <Link
                  to="/practice"
                  className="inline-block mt-3 text-sm text-[var(--color-teal)]
                             font-semibold hover:underline"
                >
                  Start practising →
                </Link>
              </div>
            ) : (
              stats.strongTopics.map(t => (
                <AccuracyBar
                  key={t.topic}
                  topic={t.topic}
                  attempted={t.questions_attempted}
                  correct={t.questions_correct}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent practice sessions */}
      {stats.recentSessions.length > 0 && (
        <div className="card overflow-hidden">
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
                  <p className="font-medium text-[var(--color-ink)]">
                    {session.topic}
                  </p>
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
            <Link to="/teach"    className="btn-primary px-6 py-3">📚 Start Learning</Link>
            <Link to="/practice" className="btn-secondary px-6 py-3">🎯 Practice Now</Link>
          </div>
        </div>
      )}
    </div>
  )
}