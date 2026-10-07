import { useEffect, useState } from 'react'
import {
  adminMe, adminStats, adminFlags, adminFlagStatus,
  adminFeedback, adminRoom, adminRoomDelete, adminUsers,
} from '../services/api'
import {
  ShieldAlert, Users, ThumbsUp, ThumbsDown, Trash2, Search, Lock,
} from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'flags', label: 'Flags' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'room', label: 'Room' },
  { id: 'users', label: 'Users' },
]

const FLAG_STATUSES = ['open', 'reviewing', 'fixed', 'dismissed']

function StatCard({ label, value }) {
  return (
    <div className="card bg-white p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest
                    text-[var(--color-muted)] mb-1">
        {label}
      </p>
      <p className="font-serif font-black text-3xl text-[var(--color-ink)]">
        {value}
      </p>
    </div>
  )
}

function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function Admin() {
  const [gate, setGate] = useState('checking') // checking | open | locked
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [flags, setFlags] = useState([])
  const [flagFilter, setFlagFilter] = useState('open')
  const [feedback, setFeedback] = useState([])
  const [fbFilter, setFbFilter] = useState('')
  const [room, setRoom] = useState([])
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    adminMe()
      .then(() => {
        setGate('open')
        loadStats()
      })
      .catch(() => setGate('locked'))
  }, [])

  const loadStats = async () => {
    try {
      const s = await adminStats()
      setStats(s)
    } catch { /* stats optional */ }
  }

  const loadTab = async (id, ff = flagFilter, fb = fbFilter, q = userSearch) => {
    setLoading(true)
    setError('')
    try {
      if (id === 'flags') setFlags((await adminFlags(ff))?.flags || [])
      if (id === 'feedback') setFeedback((await adminFeedback(fb))?.feedback || [])
      if (id === 'room') setRoom((await adminRoom())?.solutions || [])
      if (id === 'users') setUsers((await adminUsers(q))?.users || [])
    } catch {
      setError('Could not load. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (id) => {
    setTab(id)
    loadTab(id)
  }

  const setFlag = async (flagId, status) => {
    try {
      await adminFlagStatus(flagId, status)
      setFlags(prev => prev.map(f => f.id === flagId ? { ...f, status } : f))
    } catch {
      setError('Could not update that flag.')
    }
  }

  const removePost = async (solutionId) => {
    if (!window.confirm('Delete this shared solution permanently?')) return
    try {
      await adminRoomDelete(solutionId)
      setRoom(prev => prev.filter(s => s.id !== solutionId))
    } catch {
      setError('Could not delete that post.')
    }
  }

  if (gate === 'checking') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="font-mono text-sm text-[var(--color-muted)]">Checking access...</p>
      </div>
    )
  }

  if (gate === 'locked') {
    return (
      <div className="max-w-md mx-auto px-6 py-20">
        <div className="card overflow-hidden">
          <div className="bg-[var(--color-ink)] px-6 py-8 text-center">
            <Lock size={40} className="text-white mx-auto mb-3" />
            <h1 className="font-serif font-black text-2xl text-white">Restricted area</h1>
            <p className="text-white/60 text-sm mt-1">
              This control room is for MathGenius admins only.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-6">
        <p className="font-mono text-xs tracking-widest uppercase
                      text-[var(--color-gold)] mb-2 flex items-center gap-2">
          <ShieldAlert size={16} /> Control room
        </p>
        <h1 className="font-serif font-black text-4xl tracking-tight">Admin</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => switchTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all
              ${tab === t.id
                ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]'
                : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-ink)]'}`}>
            {t.label}
            {t.id === 'flags' && stats?.open_flags > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">
                {stats.open_flags}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-4">{error}</p>
      )}

      {tab === 'overview' && (
        stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total users" value={stats.signups_total} />
              <StatCard label="New (7d)" value={stats.signups_week} />
              <StatCard label="Open flags" value={stats.open_flags} />
              <StatCard label="Room posts" value={stats.room_posts} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard label="Room likes" value={stats.room_likes} />
              <StatCard label="Thumbs up (100)" value={stats.thumbs_up_100} />
              <StatCard label="Thumbs down (100)" value={stats.thumbs_down_100} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">Loading stats...</p>
        )
      )}

      {tab === 'flags' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['open', 'reviewing', 'fixed', 'dismissed', 'all'].map(s => (
              <button key={s} onClick={() => { setFlagFilter(s); loadTab('flags', s) }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all
                  ${flagFilter === s
                    ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                    : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-ink)]'}`}>
                {s}
              </button>
            ))}
          </div>
          {loading && <p className="text-sm text-[var(--color-muted)]">Loading...</p>}
          {!loading && flags.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">Nothing here.</p>
          )}
          {flags.map(f => (
            <div key={f.id} className="card bg-white p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-[10px] uppercase tracking-widest
                                 px-2 py-1 rounded-lg bg-[var(--color-cream)]
                                 text-[var(--color-ink)]">
                  {f.exam_type || 'General'} · {f.topic || 'Unspecified'}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest
                                 px-2 py-1 rounded-lg bg-amber-100 text-amber-700">
                  {f.status}
                </span>
                <span className="ml-auto text-[11px] text-[var(--color-muted)]">
                  {f.username || f.user_email} · {timeAgo(f.created_at)}
                </span>
              </div>
              <p className="text-sm text-[var(--color-ink)] mb-1">
                <strong>Q:</strong> {f.question_text}
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                <strong>Reason:</strong> {f.reason || '—'}
                {f.note ? ` — ${f.note}` : ''}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {FLAG_STATUSES.filter(s => s !== f.status).map(s => (
                  <button key={s} onClick={() => setFlag(f.id, s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold
                               border-2 border-[var(--color-border)]
                               hover:border-[var(--color-teal)]
                               hover:text-[var(--color-teal)] transition-all">
                    Mark {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'feedback' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {['', 'down', 'up'].map(r => (
              <button key={r} onClick={() => { setFbFilter(r); loadTab('feedback', flagFilter, r) }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all
                  ${fbFilter === r
                    ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                    : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-ink)]'}`}>
                {r === '' ? 'All' : r === 'down' ? 'Thumbs down' : 'Thumbs up'}
              </button>
            ))}
          </div>
          {loading && <p className="text-sm text-[var(--color-muted)]">Loading...</p>}
          {!loading && feedback.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">Nothing here.</p>
          )}
          {feedback.map(f => (
            <div key={f.id} className="card bg-white p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-[var(--color-ink)] mb-1">
                {f.rating === 'down'
                  ? <ThumbsDown size={16} className="text-red-500" />
                  : <ThumbsUp size={16} className="text-green-500" />}
                {f.topic || 'General'}
                <span className="ml-auto text-[11px] font-normal text-[var(--color-muted)]">
                  {timeAgo(f.created_at)}
                </span>
              </p>
              <p className="text-xs text-[var(--color-muted)] mb-1">
                <strong>Q:</strong> {f.question}
              </p>
              {f.comment && (
                <p className="text-xs text-[var(--color-ink)] mb-1">
                  <strong>Note:</strong> {f.comment}
                </p>
              )}
              {f.response_preview && (
                <p className="text-xs text-[var(--color-muted)] truncate">
                  Euler said: {f.response_preview}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'room' && (
        <div className="space-y-4">
          {loading && <p className="text-sm text-[var(--color-muted)]">Loading...</p>}
          {!loading && room.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">No posts yet.</p>
          )}
          {room.map(s => (
            <div key={s.id} className="card bg-white p-5">
              <p className="text-xs text-[var(--color-muted)] font-mono mb-1">
                @{s.username || '?'} · {s.topic} · {s.exam_type} · {s.likes_count || 0} likes · {timeAgo(s.created_at)}
              </p>
              <p className="text-sm font-semibold text-[var(--color-ink)] mb-1">{s.question_text}</p>
              <p className="text-xs text-[var(--color-muted)] line-clamp-3 mb-3">{s.solution_text}</p>
              <button onClick={() => removePost(s.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                           font-bold text-red-500 border-2 border-red-200
                           hover:bg-red-500 hover:text-white transition-all">
                <Trash2 size={14} /> Delete post
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); loadTab('users') }}
            className="flex gap-2">
            <div className="flex items-center gap-2 flex-1 border-2 border-[var(--color-border)]
                            focus-within:border-[var(--color-teal)] rounded-xl px-3 transition-colors">
              <Search size={16} className="text-[var(--color-muted)] shrink-0" />
              <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search username or name..."
                className="flex-1 bg-transparent outline-none py-2.5 text-sm" />
            </div>
            <button type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold
                         bg-[var(--color-ink)] text-[var(--color-paper)]
                         hover:bg-[var(--color-teal)] transition-colors">
              Go
            </button>
          </form>
          {loading && <p className="text-sm text-[var(--color-muted)]">Loading...</p>}
          {!loading && users.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">
              <Users size={16} className="inline mr-1" /> Search above, or load recent signups with an empty search.
            </p>
          )}
          {users.map(u => (
            <div key={u.id} className="card bg-white px-5 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--color-teal)]
                              flex items-center justify-center text-white
                              font-bold text-xs shrink-0">
                {(u.username || u.full_name || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-ink)] truncate">
                  @{u.username || '—'} · {u.full_name || 'Student'}
                </p>
                <p className="text-[11px] text-[var(--color-muted)] font-mono truncate">
                  {u.school || ''} · {u.exam_target || ''} · {u.role || 'student'} · {timeAgo(u.created_at)}
                </p>
              </div>
              {u.role === 'teacher' || u.role === 'parent' ? (
                <span className="ml-auto shrink-0 font-mono text-[10px] uppercase
                                 px-2 py-1 rounded-lg bg-blue-100 text-blue-700">
                  {u.role}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
