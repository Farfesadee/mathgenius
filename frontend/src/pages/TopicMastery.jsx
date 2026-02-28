import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getTopicMastery, getUserStats, xpProgress, BADGES } from '../lib/stats'
import { useNavigate } from 'react-router-dom'

function MasteryBar({ pct }) {
  const color = pct >= 80 ? 'bg-green-500'
    : pct >= 60 ? 'bg-[var(--color-teal)]'
    : pct >= 40 ? 'bg-yellow-400'
    : 'bg-red-400'

  return (
    <div className="w-full bg-[var(--color-border)] rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all duration-700`}
           style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function TopicMastery() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [mastery,  setMastery]  = useState([])
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')

  useEffect(() => {
    if (!user) return
    Promise.all([
      getTopicMastery(user.id),
      getUserStats(user.id),
    ]).then(([m, s]) => {
      setMastery(m)
      setStats(s)
      setLoading(false)
    })
  }, [user])

  const filtered = mastery.filter(t => {
    const pct = t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : 0
    if (filter === 'strong') return pct >= 70
    if (filter === 'weak')   return pct < 50
    if (filter === 'medium') return pct >= 50 && pct < 70
    return true
  })

  const { level, progress, current, needed } = stats
    ? xpProgress(stats.xp || 0)
    : { level: 1, progress: 0, current: 0, needed: 100 }

  const accuracy = stats && stats.total_attempted > 0
    ? Math.round((stats.total_correct / stats.total_attempted) * 100)
    : 0

  const strong = mastery.filter(t => t.attempted > 0 && (t.correct / t.attempted) >= 0.7).length
  const weak   = mastery.filter(t => t.attempted > 0 && (t.correct / t.attempted) <  0.5).length

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase
                      text-[var(--color-gold)] mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" />
          Your Progress
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight">
          Topic Mastery
        </h1>
        <p className="text-[var(--color-muted)] mt-2">
          See exactly which topics you've mastered and which need work.
        </p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Level',     value: level,                      color: 'text-[var(--color-teal)]',  emoji: '⭐' },
            { label: 'Total XP',  value: (stats.xp||0).toLocaleString(), color: 'text-[var(--color-gold)]', emoji: '⚡' },
            { label: 'Streak',    value: `${stats.streak_current||0}d`, color: 'text-orange-500',            emoji: '🔥' },
            { label: 'Accuracy',  value: `${accuracy}%`,              color: 'text-green-600',              emoji: '🎯' },
          ].map(s => (
            <div key={s.label} className="card bg-white p-5 text-center">
              <div className="text-2xl mb-1">{s.emoji}</div>
              <div className={`font-serif font-black text-2xl ${s.color}`}>
                {s.value}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest
                              text-[var(--color-muted)] mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Level XP bar */}
      {stats && (
        <div className="card bg-white p-5 mb-8">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm text-[var(--color-ink)]">
              Level {level} → Level {level + 1}
            </p>
            <p className="font-mono text-xs text-[var(--color-muted)]">
              {current} / {needed} XP
            </p>
          </div>
          <div className="w-full bg-[var(--color-border)] rounded-full h-3">
            <div className="bg-[var(--color-teal)] h-3 rounded-full transition-all duration-700"
                 style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Badges */}
      {stats?.badges?.length > 0 && (
        <div className="card bg-white p-5 mb-8">
          <p className="font-mono text-[10px] uppercase tracking-widest
                        text-[var(--color-muted)] mb-3">
            🏅 Badges Earned
          </p>
          <div className="flex flex-wrap gap-3">
            {(stats.badges || []).map(bId => {
              const badge = BADGES.find(b => b.id === bId)
              if (!badge) return null
              return (
                <div key={bId}
                     className="flex items-center gap-2 bg-[var(--color-paper)]
                                border border-[var(--color-border)] rounded-xl
                                px-3 py-2"
                     title={badge.desc}>
                  <span className="text-xl">{badge.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold text-[var(--color-ink)]">
                      {badge.label}
                    </p>
                    <p className="text-[10px] text-[var(--color-muted)]">
                      {badge.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Topic mastery */}
      <div className="card overflow-hidden">
        <div className="bg-[var(--color-ink)] px-6 py-4
                        flex flex-wrap items-center justify-between gap-3">
          <p className="font-serif font-bold text-white text-lg">
            📚 Topic Breakdown
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-white/50">
              {strong} strong · {weak} need work
            </span>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="bg-[var(--color-paper)] px-6 py-3 flex gap-2
                        border-b border-[var(--color-border)]">
          {[
            { value: 'all',    label: 'All Topics' },
            { value: 'strong', label: '💪 Strong (70%+)' },
            { value: 'medium', label: '📖 Getting There' },
            { value: 'weak',   label: '⚠️ Needs Work' },
          ].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold
                          border-2 transition-all
                ${filter === f.value
                  ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white p-8 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-[var(--color-border)] rounded animate-pulse w-1/3" />
                <div className="h-2 bg-[var(--color-border)] rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-12 text-center">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-[var(--color-muted)] mb-4">
              {mastery.length === 0
                ? 'Complete a CBT exam to see your topic mastery!'
                : 'No topics match this filter.'}
            </p>
            {mastery.length === 0 && (
              <button onClick={() => navigate('/cbt')} className="btn-primary px-6 py-2.5 text-sm">
                🖥️ Take a CBT Exam
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white divide-y divide-[var(--color-border)]">
            {filtered.map(t => {
              const pct   = t.attempted > 0
                ? Math.round((t.correct / t.attempted) * 100) : 0
              const label = pct >= 80 ? '💪 Strong'
                : pct >= 60 ? '📈 Good'
                : pct >= 40 ? '📖 Building'
                : '⚠️ Weak'
              const labelColor = pct >= 80 ? 'text-green-600'
                : pct >= 60 ? 'text-[var(--color-teal)]'
                : pct >= 40 ? 'text-yellow-600'
                : 'text-red-500'

              return (
                <div key={t.id} className="px-6 py-4 hover:bg-[var(--color-cream)]
                                           transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-sm text-[var(--color-ink)]">
                        {t.topic}
                      </p>
                      <span className={`text-xs font-mono font-bold ${labelColor}`}>
                        {label}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-serif font-black text-lg ${labelColor}`}>
                        {pct}%
                      </span>
                      <span className="text-xs text-[var(--color-muted)] ml-1">
                        ({t.correct}/{t.attempted})
                      </span>
                    </div>
                  </div>
                  <MasteryBar pct={pct} />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[10px] text-[var(--color-muted)] font-mono">
                      Last practiced: {new Date(t.last_practiced).toLocaleDateString('en-GB')}
                    </p>
                    <button
                      onClick={() => navigate(`/cbt`)}
                      className="text-[10px] font-mono text-[var(--color-teal)]
                                 hover:underline transition-colors">
                      Practice →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}