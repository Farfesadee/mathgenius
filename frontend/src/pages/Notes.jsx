import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getNotes, createNote, updateNote, deleteNote, togglePin } from '../lib/notes'

const COLORS = [
  { id: 'yellow', bg: 'bg-yellow-50',  border: 'border-yellow-300', dot: 'bg-yellow-400' },
  { id: 'teal',   bg: 'bg-[#e8f4f4]', border: 'border-[var(--color-teal)]', dot: 'bg-[var(--color-teal)]' },
  { id: 'pink',   bg: 'bg-pink-50',    border: 'border-pink-300',   dot: 'bg-pink-400'   },
  { id: 'purple', bg: 'bg-purple-50',  border: 'border-purple-300', dot: 'bg-purple-400' },
  { id: 'green',  bg: 'bg-green-50',   border: 'border-green-300',  dot: 'bg-green-400'  },
  { id: 'white',  bg: 'bg-white',      border: 'border-[var(--color-border)]', dot: 'bg-gray-300' },
]

function getColor(id) {
  return COLORS.find(c => c.id === id) || COLORS[0]
}

// ── Note Card ─────────────────────────────────────────────
function NoteCard({ note, onEdit, onDelete, onTogglePin, onPractice }) {
  const color = getColor(note.color)
  return (
    <div className={`${color.bg} border-2 ${color.border} rounded-2xl p-4
                     flex flex-col gap-3 relative group transition-all
                     hover:shadow-md`}>
      {note.pinned && (
        <span className="absolute -top-2 -right-2 text-base">📌</span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-serif font-bold text-[var(--color-ink)] text-sm
                        leading-snug">
            {note.title}
          </p>
          {note.topic && (
            <span className="font-mono text-[10px] uppercase tracking-widest
                             text-[var(--color-teal)]">
              {note.topic}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100
                        transition-opacity shrink-0">
          <button
            onClick={() => onPractice(note)}
            className="text-sm p-1 hover:bg-black/10 rounded-lg transition-colors"
            title="Practice from this note"
          >
            🤖
          </button>
          <button
            onClick={() => onTogglePin(note)}
            className="text-sm p-1 hover:bg-black/10 rounded-lg transition-colors"
            title={note.pinned ? 'Unpin' : 'Pin'}
          >
            📌
          </button>
          <button
            onClick={() => onEdit(note)}
            className="text-sm p-1 hover:bg-black/10 rounded-lg transition-colors"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="text-sm p-1 hover:bg-red-100 rounded-lg transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>
      <p className="text-sm text-[var(--color-ink)] leading-relaxed
                    whitespace-pre-wrap line-clamp-6">
        {note.content}
      </p>
      <div className="flex items-center justify-between mt-auto">
        <p className="text-[10px] text-[var(--color-muted)] font-mono">
          {new Date(note.updated_at).toLocaleDateString('en-GB')}
        </p>
        <button
          onClick={() => onPractice(note)}
          className="text-[10px] font-mono text-[var(--color-teal)]
                     hover:underline transition-colors opacity-0
                     group-hover:opacity-100"
        >
          🤖 Practice →
        </button>
      </div>
    </div>
  )
}

// ── Note Modal ────────────────────────────────────────────
function NoteModal({ note, onSave, onClose }) {
  const [title,   setTitle]   = useState(note?.title   || '')
  const [content, setContent] = useState(note?.content || '')
  const [topic,   setTopic]   = useState(note?.topic   || '')
  const [color,   setColor]   = useState(note?.color   || 'yellow')
  const [saving,  setSaving]  = useState(false)

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    await onSave({ title: title.trim(), content: content.trim(), topic: topic.trim(), color })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl border-2 border-[var(--color-ink)]
                      shadow-2xl w-full max-w-lg">
        <div className="bg-[var(--color-ink)] px-6 py-4 flex items-center
                        justify-between">
          <p className="font-serif font-bold text-white">
            {note ? '✏️ Edit Note' : '📝 New Note'}
          </p>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl">
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Note title..."
            className="w-full border-2 border-[var(--color-border)]
                       focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                       text-sm font-semibold transition-colors"
          />
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Topic (optional, e.g. Quadratic Equations)"
            className="w-full border-2 border-[var(--color-border)]
                       focus:border-[var(--color-teal)] rounded-xl px-4 py-2.5
                       text-sm transition-colors"
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your note here..."
            rows={6}
            className="w-full border-2 border-[var(--color-border)]
                       focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                       text-sm transition-colors resize-none"
          />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest
                           text-[var(--color-muted)] mb-2">
              Note colour
            </p>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={`w-7 h-7 rounded-full ${c.dot} border-2 transition-all
                    ${color === c.id
                      ? 'border-[var(--color-ink)] scale-125'
                      : 'border-transparent'}`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 btn-secondary py-3 text-sm">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || !content.trim() || saving}
              className="flex-1 btn-primary py-3 text-sm justify-center
                         disabled:opacity-50"
            >
              {saving ? 'Saving...' : '💾 Save Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Practice from Notes Modal ─────────────────────────────
function PracticeFromNotesModal({ note, onClose }) {
  const [questions, setQuestions] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [answers,   setAnswers]   = useState({})
  const [revealed,  setRevealed]  = useState(false)

  const generate = async () => {
    setLoading(true)
    setAnswers({})
    setRevealed(false)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a Nigerian maths exam question writer for WAEC/JAMB.

Read this student's note and generate 5 multiple choice questions based on it.

NOTE TITLE: ${note.title}
NOTE CONTENT: ${note.content}

Rules:
- Questions must test understanding of what's in the note
- 4 options each (A, B, C, D)
- One correct answer
- Difficulty: mix of easy and medium
- Keep questions concise

Respond ONLY with this exact JSON (no markdown, no extra text):
{
  "questions": [
    {
      "question": "Question text here",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correct": "A",
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}`,
          }],
        }),
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || '{}'
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      setQuestions(parsed.questions || [])
    } catch {
      setQuestions([])
    }
    setLoading(false)
  }

  useEffect(() => { generate() }, [])

  const score = revealed
    ? questions.filter((q, i) => answers[i] === q.correct).length
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/60 backdrop-blur-sm px-4 py-6">
      <div className="bg-white rounded-2xl border-2 border-[var(--color-ink)]
                      shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-[var(--color-ink)] px-6 py-4 flex items-center
                        justify-between sticky top-0 z-10">
          <div>
            <p className="font-serif font-bold text-white">
              🤖 Practice from: {note.title}
            </p>
            <p className="text-white/60 text-xs mt-0.5">
              Euler generated 5 questions from your note
            </p>
          </div>
          <button onClick={onClose}
            className="text-white/60 hover:text-white text-xl transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6">
          {/* Loading */}
          {loading && (
            <div className="py-16 text-center space-y-4">
              <div className="w-10 h-10 border-4 border-[var(--color-teal)]
                              border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[var(--color-muted)] text-sm">
                Euler is reading your notes and generating questions...
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && questions.length === 0 && (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">😕</div>
              <p className="text-[var(--color-muted)] mb-4">
                Could not generate questions. Try a longer, more detailed note.
              </p>
              <button onClick={generate} className="btn-primary px-6 py-3 text-sm">
                Try Again
              </button>
            </div>
          )}

          {/* Questions */}
          {!loading && questions.length > 0 && (
            <div className="space-y-6">

              {/* Score banner */}
              {revealed && (
                <div className={`rounded-2xl p-5 text-center border-2
                  ${score === questions.length
                    ? 'bg-green-50 border-green-400'
                    : score >= questions.length / 2
                    ? 'bg-yellow-50 border-yellow-400'
                    : 'bg-red-50 border-red-400'}`}>
                  <p className="font-serif font-black text-4xl text-[var(--color-ink)]">
                    {score}/{questions.length}
                  </p>
                  <p className={`text-sm font-semibold mt-1
                    ${score === questions.length ? 'text-green-700'
                      : score >= questions.length / 2 ? 'text-yellow-700'
                      : 'text-red-600'}`}>
                    {score === questions.length
                      ? '🎉 Perfect! Your notes are paying off!'
                      : score >= questions.length / 2
                      ? '📚 Good effort — review the red ones'
                      : '⚠️ Review your notes again and try once more'}
                  </p>
                </div>
              )}

              {/* Each question */}
              {questions.map((q, i) => (
                <div key={i}
                     className="border-2 border-[var(--color-border)]
                                rounded-2xl overflow-hidden">
                  <div className="bg-[var(--color-paper)] px-5 py-3">
                    <p className="font-semibold text-sm text-[var(--color-ink)]">
                      {i + 1}. {q.question}
                    </p>
                  </div>
                  <div className="p-4 space-y-2">
                    {Object.entries(q.options).map(([letter, text]) => {
                      let style = 'border-[var(--color-border)] bg-white hover:border-[var(--color-teal)]'
                      if (revealed) {
                        if (letter === q.correct)
                          style = 'border-green-500 bg-green-50 text-green-800'
                        else if (letter === answers[i] && letter !== q.correct)
                          style = 'border-red-400 bg-red-50 text-red-700'
                        else
                          style = 'border-[var(--color-border)] opacity-50'
                      } else if (answers[i] === letter) {
                        style = 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                      }
                      return (
                        <button key={letter}
                          onClick={() => !revealed && setAnswers(a => ({ ...a, [i]: letter }))}
                          disabled={revealed}
                          className={`w-full text-left flex items-center gap-3
                                      px-4 py-2.5 rounded-xl border-2 transition-all
                                      text-sm ${style}`}>
                          <span className="w-6 h-6 rounded-full border-2 border-current
                                           flex items-center justify-center text-xs
                                           font-bold shrink-0">
                            {letter}
                          </span>
                          <span className="flex-1">{text}</span>
                          {revealed && letter === q.correct &&
                            <span className="text-green-600 shrink-0">✓</span>}
                          {revealed && letter === answers[i] && letter !== q.correct &&
                            <span className="text-red-500 shrink-0">✗</span>}
                        </button>
                      )
                    })}

                    {/* Explanation */}
                    {revealed && q.explanation && (
                      <div className="mt-3 bg-[#e8f4f4] border border-[var(--color-teal)]
                                      rounded-xl px-4 py-3">
                        <p className="text-xs font-mono text-[var(--color-teal)]
                                      uppercase tracking-widest mb-1">
                          💡 Explanation
                        </p>
                        <p className="text-sm text-[var(--color-ink)]">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {!revealed ? (
                  <button
                    onClick={() => setRevealed(true)}
                    disabled={Object.keys(answers).length < questions.length}
                    className="flex-1 btn-primary py-3 text-sm justify-center
                               disabled:opacity-50"
                  >
                    {Object.keys(answers).length < questions.length
                      ? `Answer all ${questions.length} questions`
                      : 'Submit Answers'}
                  </button>
                ) : (
                  <button onClick={generate}
                    className="flex-1 btn-primary py-3 text-sm justify-center">
                    🔄 New Questions
                  </button>
                )}
                <button onClick={onClose}
                  className="btn-secondary px-6 py-3 text-sm">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Notes Page ───────────────────────────────────────
export default function Notes() {
  const { user }        = useAuth()
  const [notes,         setNotes]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showModal,     setShowModal]     = useState(false)
  const [editingNote,   setEditingNote]   = useState(null)
  const [practiceNote,  setPracticeNote]  = useState(null)
  const [search,        setSearch]        = useState('')
  const [filterTopic,   setFilterTopic]   = useState('')

  useEffect(() => {
    if (user) loadNotes()
  }, [user])

  const loadNotes = async () => {
    const data = await getNotes(user.id)
    setNotes(data)
    setLoading(false)
  }

  const handleSave = async (fields) => {
    if (editingNote) {
      const updated = await updateNote(editingNote.id, fields)
      setNotes(prev => prev.map(n => n.id === editingNote.id ? updated : n))
    } else {
      const created = await createNote(user.id, fields)
      setNotes(prev => [created, ...prev])
    }
    setShowModal(false)
    setEditingNote(null)
  }

  const handleDelete = async (id) => {
    await deleteNote(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const handleTogglePin = async (note) => {
    await togglePin(note.id, note.pinned)
    setNotes(prev =>
      prev
        .map(n => n.id === note.id ? { ...n, pinned: !n.pinned } : n)
        .sort((a, b) => b.pinned - a.pinned)
    )
  }

  const topics   = [...new Set(notes.map(n => n.topic).filter(Boolean))]
  const pinned   = notes.filter(n => n.pinned)

  const filtered = notes.filter(n => {
    const matchSearch = !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
    const matchTopic = !filterTopic || n.topic === filterTopic
    return matchSearch && matchTopic
  })

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">

      {/* Modals */}
      {(showModal || editingNote) && (
        <NoteModal
          note={editingNote}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingNote(null) }}
        />
      )}
      {practiceNote && (
        <PracticeFromNotesModal
          note={practiceNote}
          onClose={() => setPracticeNote(null)}
        />
      )}

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase
                        text-[var(--color-gold)] mb-2 flex items-center gap-3">
            <span className="block w-6 h-px bg-[var(--color-gold)]" />
            My Notes
          </p>
          <h1 className="font-serif font-black text-5xl tracking-tight">
            Notes & Highlights
          </h1>
          <p className="text-[var(--color-muted)] mt-2">
            Save important concepts while you study. Hover a note to practice from it.
          </p>
        </div>
        <button
          onClick={() => { setEditingNote(null); setShowModal(true) }}
          className="btn-primary px-6 py-3 text-sm"
        >
          + New Note
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="flex-1 min-w-[200px] border-2 border-[var(--color-border)]
                     focus:border-[var(--color-teal)] rounded-xl px-4 py-2.5
                     text-sm transition-colors bg-white"
        />
        {topics.length > 0 && (
          <select
            value={filterTopic}
            onChange={e => setFilterTopic(e.target.value)}
            className="border-2 border-[var(--color-border)]
                       focus:border-[var(--color-teal)] rounded-xl px-4 py-2.5
                       text-sm transition-colors bg-white"
          >
            <option value="">All Topics</option>
            {topics.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {/* Stats bar */}
      {!loading && notes.length > 0 && (
        <div className="flex gap-4 mb-6 text-xs font-mono text-[var(--color-muted)]">
          <span>{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
          {pinned.length > 0 && <span>📌 {pinned.length} pinned</span>}
          {topics.length > 0 && <span>🏷️ {topics.length} topic{topics.length !== 1 ? 's' : ''}</span>}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i}
                 className="h-40 bg-[var(--color-border)] rounded-2xl animate-pulse" />
          ))}
        </div>

      /* Empty */
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-[var(--color-muted)] text-lg mb-6">
            {notes.length === 0
              ? 'No notes yet — create your first one!'
              : 'No notes match your search.'}
          </p>
          {notes.length === 0 && (
            <button onClick={() => setShowModal(true)}
              className="btn-primary px-8 py-3">
              + Create First Note
            </button>
          )}
        </div>

      /* Grid */
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={(n)    => { setEditingNote(n); setShowModal(true) }}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
              onPractice={setPracticeNote}
            />
          ))}
        </div>
      )}
    </div>
  )
}