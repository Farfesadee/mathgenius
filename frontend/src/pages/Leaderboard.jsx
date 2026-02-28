import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getLeaderboard, xpProgress, BADGES } from '../lib/stats'

export default function Leaderboard() {
  const { user } = useAuth()
  const [board,   setBoard]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLeaderboard().then(data => {
      setBoard(data)
      setLoading(false)
    })
  }, [])

  const myRank = board.findIndex(r => r.id === user?.id) + 1

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase
                      text-[var(--color-gold)] mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" />
          Rankings
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight">
          Leaderboard
        </h1>
        <p className="text-[var(--color-muted)] mt-2">
          Top students ranked by XP earned
        </p>
      </div>

      {/* Your rank banner */}
      {myRank > 0 && (
        <div className="bg-[var(--color-teal)] rounded-2xl px-6 py-4
                        flex items-center justify-between mb-6 text-white">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest
                          text-white/60 mb-0.5">
              Your Rank
            </p>
            <p className="font-serif font-black text-2xl">#{myRank}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest
                          text-white/60 mb-0.5">
              XP
            </p>
            <p className="font-serif font-black text-2xl">
              {board[myRank - 1]?.xp?.toLocaleString() || 0}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-widest
                          text-white/60 mb-0.5">
              Streak
            </p>
            <p className="font-serif font-black text-2xl">
              🔥 {board[myRank - 1]?.streak_current || 0}
            </p>
          </div>
        </div>
      )}

      {/* Board */}
      <div className="card overflow-hidden">
        <div className="bg-[var(--color-ink)] px-6 py-4">
          <p className="font-serif font-bold text-white text-lg">
            🏆 Top Students
          </p>
        </div>

        {loading ? (
          <div className="bg-white divide-y divide-[var(--color-border)]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-[var(--color-border)] animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[var(--color-border)] rounded animate-pulse w-1/3" />
                  <div className="h-2 bg-[var(--color-border)] rounded animate-pulse w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : board.length === 0 ? (
          <div className="bg-white p-12 text-center">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-[var(--color-muted)]">
              No rankings yet — complete a CBT exam to appear here!
            </p>
          </div>
        ) : (
          <div className="bg-white divide-y divide-[var(--color-border)]">
            {board.map((entry, i) => {
              const rank     = i + 1
              const isMe     = entry.id === user?.id
              const { level, progress } = xpProgress(entry.xp || 0)
              const firstName = entry.full_name?.split(' ')[0] || 'Student'
              const initials  = entry.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

              const rankDisplay = rank === 1 ? '🥇'
                : rank === 2 ? '🥈'
                : rank === 3 ? '🥉'
                : `#${rank}`

              return (
                <div key={entry.id}
                     className={`px-6 py-4 flex items-center gap-4 transition-colors
                       ${isMe ? 'bg-[#e8f4f4]' : 'hover:bg-[var(--color-cream)]'}`}>

                  {/* Rank */}
                  <div className="w-10 text-center font-serif font-black text-lg
                                  text-[var(--color-ink)] shrink-0">
                    {rankDisplay}
                  </div>

                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center
                                   font-bold text-sm shrink-0
                    ${isMe
                      ? 'bg-[var(--color-teal)] text-white'
                      : 'bg-[var(--color-ink)] text-white'
                    }`}>
                    {initials}
                  </div>

                  {/* Name + XP bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`font-semibold text-sm truncate
                        ${isMe ? 'text-[var(--color-teal)]' : 'text-[var(--color-ink)]'}`}>
                        {firstName}
                        {isMe && <span className="ml-1 text-[10px] font-mono
                                                   text-[var(--color-teal)]">(you)</span>}
                      </p>
                      <span className="shrink-0 font-mono text-[10px] text-[var(--color-muted)]">
                        Lv.{level}
                      </span>
                      {/* Badges */}
                      <div className="flex gap-0.5">
                        {(entry.badges || []).slice(0, 3).map(bId => {
                          const b = BADGES.find(x => x.id === bId)
                          return b ? (
                            <span key={bId} title={b.label} className="text-xs">
                              {b.emoji}
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>

                    {/* XP progress bar */}
                    <div className="w-full bg-[var(--color-border)] rounded-full h-1.5">
                      <div
                        className="bg-[var(--color-teal)] h-1.5 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="font-serif font-black text-lg text-[var(--color-ink)]">
                      {(entry.xp || 0).toLocaleString()}
                      <span className="font-mono text-[10px] text-[var(--color-muted)]"> XP</span>
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      🔥 {entry.streak_current || 0} day streak
                    </p>
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