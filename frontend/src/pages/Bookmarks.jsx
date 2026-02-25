import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getBookmarks, deleteBookmark } from '../lib/bookmarks'
import { ExplanationBody } from '../utils/RenderMath'
import { BlockMath } from 'react-katex'

const TYPE_LABELS = {
  solution:    { icon: '⚙️', label: 'Solution',    color: 'bg-blue-50   border-blue-200   text-blue-700'   },
  explanation: { icon: '🧠', label: 'Explanation', color: 'bg-teal-50   border-teal-200   text-teal-700'   },
  message:     { icon: '💬', label: 'Message',     color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
}

function BookmarkCard({ bookmark, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const meta = TYPE_LABELS[bookmark.type] || TYPE_LABELS.message

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(bookmark.id)
  }

  return (
    <div className="card overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="px-5 py-4 bg-white flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-2xl shrink-0">{meta.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-bold text-[var(--color-ink)] text-base
                           leading-snug truncate">
              {bookmark.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] font-mono uppercase tracking-widest
                               px-2 py-0.5 rounded-full border ${meta.color}`}>
                {meta.label}
              </span>
              {bookmark.topic && (
                <span className="text-[10px] text-[var(--color-muted)]">
                  {bookmark.topic}
                </span>
              )}
              <span className="text-[10px] text-[var(--color-muted)]">
                {new Date(bookmark.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs px-3 py-1.5 bg-[var(--color-cream)]
                       border border-[var(--color-border)] rounded-lg
                       hover:bg-[var(--color-ink)] hover:text-white
                       transition-all font-medium"
          >
            {expanded ? 'Collapse' : 'View'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs px-3 py-1.5 bg-red-50 border border-red-200
                       text-red-500 rounded-lg hover:bg-red-500 hover:text-white
                       transition-all font-medium disabled:opacity-50"
          >
            {deleting ? '...' : '🗑️'}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t-2 border-[var(--color-ink)] bg-[var(--color-paper)] p-5">
          {bookmark.expression && (
            <div className="mb-4 bg-white border border-[var(--color-border)]
                            rounded-xl p-4 text-center overflow-x-auto">
              <BlockMath math={bookmark.expression} />
            </div>
          )}
          <ExplanationBody text={bookmark.content} />
        </div>
      )}
    </div>
  )
}

export default function Bookmarks() {
  const { user } = useAuth()
  const [bookmarks, setBookmarks] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('all')
  const [search,    setSearch]    = useState('')

  useEffect(() => {
    if (user) loadBookmarks()
  }, [user])

  const loadBookmarks = async () => {
    setLoading(true)
    const { data } = await getBookmarks(user.id)
    setBookmarks(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    await deleteBookmark(id)
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  const filtered = bookmarks.filter(b => {
    const matchFilter = filter === 'all' || b.type === filter
    const matchSearch = !search ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.topic?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase
                      text-[var(--color-gold)] mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" />
          My Bookmarks
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight">
          Saved Items
        </h1>
        <p className="text-[var(--color-muted)] mt-2 text-lg">
          Your saved solutions, explanations and notes for exam revision.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search bookmarks..."
          className="flex-1 bg-white border-2 border-[var(--color-border)]
                     focus:border-[var(--color-teal)] rounded-xl px-4 py-2.5
                     text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)]
                     transition-colors"
        />

        {/* Filter tabs */}
        <div className="flex border-2 border-[var(--color-ink)] rounded-xl
                        overflow-hidden shrink-0">
          {['all', 'solution', 'explanation', 'message'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 text-xs font-semibold capitalize transition-all
                ${filter === f
                  ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
                  : 'bg-white text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Saved',   value: bookmarks.length,                          icon: '🔖' },
          { label: 'Solutions',     value: bookmarks.filter(b => b.type === 'solution').length,     icon: '⚙️' },
          { label: 'Explanations',  value: bookmarks.filter(b => b.type === 'explanation').length,  icon: '🧠' },
        ].map(stat => (
          <div key={stat.label}
               className="card bg-white p-4 text-center">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="font-serif font-black text-3xl text-[var(--color-ink)]">
              {stat.value}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest
                            text-[var(--color-muted)] mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Bookmark list */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-[var(--color-border)]
                                    rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card bg-white p-12 text-center">
          <div className="text-5xl mb-4">🔖</div>
          <h3 className="font-serif font-bold text-xl text-[var(--color-ink)] mb-2">
            {bookmarks.length === 0 ? 'No bookmarks yet' : 'No results found'}
          </h3>
          <p className="text-[var(--color-muted)] text-sm">
            {bookmarks.length === 0
              ? 'Save solutions and explanations from the Solve and Teach modules.'
              : 'Try a different search or filter.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(bookmark => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}