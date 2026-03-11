import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchPastQuestions, getPastQuestionMeta, getPastQuestionTopics } from '../services/api'
import { ExplanationBody } from '../utils/RenderMath'

// ── Constants ─────────────────────────────────────────────────────────────
const EXAM_COLORS = {
  WAEC:   { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  badge: 'bg-green-100'  },
  JAMB:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100'   },
  NECO:   { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100' },
  BECE:   { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100' },
  NABTEB: { bg: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-700',   badge: 'bg-pink-100'   },
  OTHER:  { bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-700',   badge: 'bg-gray-100'   },
}

const LEVEL_LABELS = { jss: 'JSS', sss: 'SSS', secondary: 'SSS', university: 'University' }

// ── Option label component ────────────────────────────────────────────────
function OptionRow({ option, answer, revealed }) {
  const letter = option.trim()[0]   // "A", "B", etc.
  const isCorrect = answer && letter === answer.trim()[0]
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm transition-all
      ${revealed && isCorrect
        ? 'bg-green-50 border border-green-300 text-green-800 font-semibold'
        : 'bg-[var(--color-paper)] border border-[var(--color-border)] text-[var(--color-ink)]'
      }`}>
      <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                        text-[11px] font-bold border
        ${revealed && isCorrect
          ? 'bg-green-500 border-green-500 text-white'
          : 'border-[var(--color-border)] text-[var(--color-muted)]'
        }`}>
        {letter}
      </span>
      <span className="leading-relaxed">{option.slice(2).trim()}</span>
      {revealed && isCorrect && (
        <span className="ml-auto shrink-0 text-green-600 font-bold">✓</span>
      )}
    </div>
  )
}

// ── Single question card ──────────────────────────────────────────────────
function QuestionCard({ q, onPractice }) {
  const [revealed, setRevealed]   = useState(false)
  const [expanded, setExpanded]   = useState(false)
  const ec = EXAM_COLORS[q.exam] || EXAM_COLORS.OTHER

  return (
    <div className={`card overflow-hidden border-2 ${ec.border} transition-all`}>
      {/* Card header */}
      <div className={`px-4 py-2.5 flex items-center justify-between ${ec.bg}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                            uppercase tracking-wide ${ec.badge} ${ec.text}`}>
            {q.exam}
          </span>
          <span className="font-mono text-[11px] text-[var(--color-muted)]">
            {q.year} · Q{q.question_number}
          </span>
          {q.topic && (
            <span className="px-2 py-0.5 rounded-full bg-white/70 border
                             border-[var(--color-border)] text-[10px] text-[var(--color-ink)]">
              {q.topic}
            </span>
          )}
          <span className="text-[10px] text-[var(--color-muted)]">
            {LEVEL_LABELS[q.level] || q.level}
          </span>
        </div>
        <span className="text-[10px] font-mono text-[var(--color-muted)] shrink-0">
          {q.question_type === 'mcq' ? '🔘 MCQ' : '📝 Theory'}
        </span>
      </div>

      {/* Question body */}
      <div className="bg-white px-5 py-4">
        <p className={`text-sm text-[var(--color-ink)] leading-relaxed font-medium
                       ${!expanded && q.body.length > 300 ? 'line-clamp-4' : ''}`}>
          {q.body}
        </p>
        {q.body.length > 300 && (
          <button onClick={() => setExpanded(e => !e)}
            className="text-xs text-[var(--color-teal)] hover:underline mt-1">
            {expanded ? '▲ Show less' : '▼ Show more'}
          </button>
        )}

        {/* MCQ Options */}
        {q.options && q.options.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {q.options.map((opt, i) => (
              <OptionRow key={i} option={opt} answer={q.answer} revealed={revealed} />
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          {q.answer && (
            <button
              onClick={() => setRevealed(r => !r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2
                          transition-all
                ${revealed
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-green-400 hover:text-green-600'
                }`}>
              {revealed
                ? (q.question_type === 'mcq' ? `✓ Answer: ${q.answer}` : '✓ Hide Answer')
                : '👁 Show Answer'
              }
            </button>
          )}

          {/* Theory answer reveal */}
          {revealed && q.question_type === 'theory' && q.answer && (
            <div className="w-full mt-2 bg-[var(--color-paper)] border border-[var(--color-border)]
                            rounded-xl p-4 text-sm">
              <ExplanationBody text={q.answer} />
            </div>
          )}

          <button
            onClick={() => onPractice(q)}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold
                       bg-[var(--color-teal)] text-white hover:opacity-90 transition-opacity
                       flex items-center gap-1.5">
            🚀 Practice this
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function QuestionBank() {
  const navigate = useNavigate()

  // Meta / filter options
  const [meta,         setMeta]         = useState(null)
  const [topics,       setTopics]       = useState([])
  const [metaLoading,  setMetaLoading]  = useState(true)

  // Active filters
  const [query,        setQuery]        = useState('')
  const [filterExam,   setFilterExam]   = useState('')
  const [filterYear,   setFilterYear]   = useState('')
  const [filterTopic,  setFilterTopic]  = useState('')
  const [filterLevel,  setFilterLevel]  = useState('')
  const [filterType,   setFilterType]   = useState('')

  // Results
  const [questions,    setQuestions]    = useState([])
  const [total,        setTotal]        = useState(0)
  const [pages,        setPages]        = useState(1)
  const [page,         setPage]         = useState(1)
  const [loading,      setLoading]      = useState(false)
  const [searched,     setSearched]     = useState(false)

  // Load meta on mount
  useEffect(() => {
    loadMeta()
  }, [])

  const loadMeta = async () => {
    setMetaLoading(true)
    try {
      const [metaRes, topicsRes] = await Promise.all([
        getPastQuestionMeta(),
        getPastQuestionTopics(),
      ])
      setMeta(metaRes.data)
      setTopics(topicsRes.data?.topics || [])
    } catch (e) {
      console.error('Failed to load meta', e)
    } finally {
      setMetaLoading(false)
    }
  }

  const doSearch = useCallback(async (pg = 1) => {
    setLoading(true)
    setSearched(true)
    try {
      const res = await searchPastQuestions({
        query:         query || null,
        exam:          filterExam  || null,
        year:          filterYear  ? parseInt(filterYear) : null,
        topic:         filterTopic || null,
        level:         filterLevel || null,
        question_type: filterType  || null,
        page:          pg,
        page_size:     20,
      })
      const d = res.data
      setQuestions(d.questions || [])
      setTotal(d.total || 0)
      setPages(d.pages || 1)
      setPage(pg)
    } catch (e) {
      console.error('Search failed', e)
    } finally {
      setLoading(false)
    }
  }, [query, filterExam, filterYear, filterTopic, filterLevel, filterType])

  const handlePractice = (q) => {
    // Navigate to Practice with the topic and level pre-filled via URL params
    navigate(`/practice?topic=${encodeURIComponent(q.topic || q.subject)}&level=${q.level}&auto=false`)
  }

  const clearFilters = () => {
    setQuery(''); setFilterExam(''); setFilterYear('')
    setFilterTopic(''); setFilterLevel(''); setFilterType('')
    setQuestions([]); setSearched(false)
  }

  const hasFilters = query || filterExam || filterYear || filterTopic || filterLevel || filterType

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase
                      text-[var(--color-gold)] mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" />
          Past Questions
        </p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif font-black text-5xl tracking-tight">
              Question Bank
            </h1>
            <p className="text-[var(--color-muted)] mt-2 text-lg">
              Searchable archive of WAEC, JAMB, NECO, BECE past questions.
            </p>
          </div>
          {!metaLoading && meta && (
            <div className="flex gap-4 shrink-0">
              {meta.exams?.map(e => (
                <div key={e.exam} className="text-center">
                  <div className="font-serif font-black text-2xl text-[var(--color-teal)]">
                    {e.count.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--color-muted)] uppercase">
                    {e.exam}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Search + filters ── */}
      <div className="card bg-white overflow-hidden mb-6">
        <div className="bg-[var(--color-teal)] px-5 py-3">
          <p className="font-serif font-bold text-white">🔍 Search & Filter</p>
        </div>
        <div className="p-5 space-y-4">

          {/* Text search */}
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch(1)}
              placeholder="Search questions by keyword, e.g. 'quadratic equation'..."
              className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                         focus:border-[var(--color-teal)] rounded-xl px-4 py-3 text-sm
                         text-[var(--color-ink)] placeholder:text-[var(--color-muted)]
                         transition-colors pr-24"
            />
            <button
              onClick={() => doSearch(1)}
              className="absolute right-2 top-2 px-3 py-1.5 rounded-lg
                         bg-[var(--color-teal)] text-white text-xs font-bold
                         hover:opacity-90 transition-opacity">
              Search
            </button>
          </div>

          {/* Filter row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">

            {/* Exam */}
            <div>
              <label className="font-mono text-[9px] uppercase tracking-widest
                                 text-[var(--color-muted)] block mb-1">Exam</label>
              <select
                value={filterExam}
                onChange={e => setFilterExam(e.target.value)}
                className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                           rounded-lg px-2 py-1.5 text-xs text-[var(--color-ink)] transition-colors
                           focus:border-[var(--color-teal)]">
                <option value="">All</option>
                {(meta?.exams || []).map(e => (
                  <option key={e.exam} value={e.exam}>{e.exam} ({e.count})</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="font-mono text-[9px] uppercase tracking-widest
                                 text-[var(--color-muted)] block mb-1">Year</label>
              <select
                value={filterYear}
                onChange={e => setFilterYear(e.target.value)}
                className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                           rounded-lg px-2 py-1.5 text-xs text-[var(--color-ink)] transition-colors
                           focus:border-[var(--color-teal)]">
                <option value="">All years</option>
                {(meta?.years || []).map(y => (
                  <option key={y.year} value={y.year}>{y.year} ({y.count})</option>
                ))}
              </select>
            </div>

            {/* Topic */}
            <div>
              <label className="font-mono text-[9px] uppercase tracking-widest
                                 text-[var(--color-muted)] block mb-1">Topic</label>
              <select
                value={filterTopic}
                onChange={e => setFilterTopic(e.target.value)}
                className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                           rounded-lg px-2 py-1.5 text-xs text-[var(--color-ink)] transition-colors
                           focus:border-[var(--color-teal)]">
                <option value="">All topics</option>
                {topics.map(t => (
                  <option key={t.topic} value={t.topic}>{t.topic} ({t.count})</option>
                ))}
              </select>
            </div>

            {/* Level */}
            <div>
              <label className="font-mono text-[9px] uppercase tracking-widest
                                 text-[var(--color-muted)] block mb-1">Level</label>
              <select
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value)}
                className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                           rounded-lg px-2 py-1.5 text-xs text-[var(--color-ink)] transition-colors
                           focus:border-[var(--color-teal)]">
                <option value="">All levels</option>
                <option value="jss">JSS</option>
                <option value="sss">SSS</option>
                <option value="university">University</option>
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="font-mono text-[9px] uppercase tracking-widest
                                 text-[var(--color-muted)] block mb-1">Type</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                           rounded-lg px-2 py-1.5 text-xs text-[var(--color-ink)] transition-colors
                           focus:border-[var(--color-teal)]">
                <option value="">All types</option>
                <option value="mcq">MCQ</option>
                <option value="theory">Theory</option>
              </select>
            </div>
          </div>

          {/* Action row */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              onClick={() => doSearch(1)}
              disabled={loading}
              className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white
                                     rounded-full animate-spin" /> Searching...</>
                : '🔍 Search Questions'
              }
            </button>
            {hasFilters && (
              <button onClick={clearFilters}
                className="text-xs text-[var(--color-muted)] hover:text-red-500 transition-colors">
                ✕ Clear filters
              </button>
            )}
            {searched && (
              <span className="text-xs text-[var(--color-muted)] ml-auto">
                {total.toLocaleString()} question{total !== 1 ? 's' : ''} found
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      {loading && (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-[var(--color-teal)] border-t-transparent
                          rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-[var(--color-muted)]">Searching question bank...</p>
        </div>
      )}

      {!loading && searched && questions.length === 0 && (
        <div className="card bg-white p-12 text-center">
          <p className="text-4xl mb-4">🔍</p>
          <p className="font-semibold text-[var(--color-ink)]">No questions found</p>
          <p className="text-sm text-[var(--color-muted)] mt-2">
            Try different filters or a broader search term.
          </p>
        </div>
      )}

      {!loading && !searched && (
        <div className="card bg-white p-12 text-center">
          <p className="text-4xl mb-4">📚</p>
          <p className="font-semibold text-[var(--color-ink)]">
            Search to browse past questions
          </p>
          <p className="text-sm text-[var(--color-muted)] mt-2 max-w-md mx-auto">
            Filter by exam, year, topic, or search for a keyword.
            Click "🚀 Practice this" on any question to drill it in Practice mode.
          </p>
        </div>
      )}

      {!loading && questions.length > 0 && (
        <div className="space-y-4">
          {questions.map(q => (
            <QuestionCard key={q.id} q={q} onPractice={handlePractice} />
          ))}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => doSearch(page - 1)}
                disabled={page <= 1}
                className="px-3 py-2 rounded-lg border-2 border-[var(--color-border)]
                           text-sm font-semibold text-[var(--color-muted)]
                           disabled:opacity-40 hover:border-[var(--color-teal)]
                           hover:text-[var(--color-teal)] transition-all">
                ← Prev
              </button>

              {Array.from({ length: Math.min(7, pages) }, (_, i) => {
                // Show pages around current
                let pg = i + 1
                if (pages > 7) {
                  if (page <= 4)       pg = i + 1
                  else if (page >= pages - 3) pg = pages - 6 + i
                  else                 pg = page - 3 + i
                }
                return (
                  <button key={pg}
                    onClick={() => doSearch(pg)}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold border-2 transition-all
                      ${pg === page
                        ? 'bg-[var(--color-teal)] border-[var(--color-teal)] text-white'
                        : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-teal)]'
                      }`}>
                    {pg}
                  </button>
                )
              })}

              <button
                onClick={() => doSearch(page + 1)}
                disabled={page >= pages}
                className="px-3 py-2 rounded-lg border-2 border-[var(--color-border)]
                           text-sm font-semibold text-[var(--color-muted)]
                           disabled:opacity-40 hover:border-[var(--color-teal)]
                           hover:text-[var(--color-teal)] transition-all">
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
