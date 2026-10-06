import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  shareRoomSolution, getRoomFeed, toggleRoomLike, deleteRoomSolution,
} from '../services/api'
import { ExplanationBody } from '../utils/RenderMath'
import ReportQuestionModal from '../components/ReportQuestionModal'
import { reportContentFlag } from '../services/api'
import {
  Users, Heart, Flag, Trash2, Send, Check, ChevronDown,
} from 'lucide-react'

const EXAMS = ['All', 'WAEC', 'NECO', 'JAMB', 'BECE', 'Practice']

function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  const d = Math.floor(s / 86400)
  return d === 1 ? 'yesterday' : `${d}d ago`
}

export default function SolutionsRoom() {
  const { user } = useAuth()
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterExam, setFilterExam] = useState('All')
  const [filterTopic, setFilterTopic] = useState('')
  // Share form
  const [showForm, setShowForm] = useState(false)
  const [qText, setQText] = useState('')
  const [sText, setSText] = useState('')
  const [qTopic, setQTopic] = useState('')
  const [qExam, setQExam] = useState('WAEC')
  const [sharing, setSharing] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  // Report modal
  const [reportTarget, setReportTarget] = useState(null)
  const [reportSending, setReportSending] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [reportError, setReportError] = useState('')

  const load = async (exam = filterExam, topic = filterTopic) => {
    setLoading(true)
    try {
      const params = {}
      if (exam && exam !== 'All') params.exam_type = exam
      if (topic.trim()) params.topic = topic.trim()
      const res = await getRoomFeed(params)
      setFeed(res?.solutions || res || [])
    } catch {
      setFeed([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const applyFilter = (e) => {
    e.preventDefault()
    load()
  }

  const handleShare = async (e) => {
    e.preventDefault()
    setShareMsg('')
    if (qText.trim().length < 10 || sText.trim().length < 10) {
      setShareMsg('Please add a fuller question and solution (at least 10 characters each).')
      return
    }
    setSharing(true)
    try {
      await shareRoomSolution({
        question_text: qText.trim(),
        solution_text: sText.trim(),
        topic: qTopic.trim(),
        exam_type: qExam,
        source: 'solutions-room',
      })
      setQText(''); setSText(''); setQTopic('')
      setShowForm(false)
      load()
    } catch (err) {
      setShareMsg(err?.detail || err?.message || 'Could not share. Please try again.')
    } finally {
      setSharing(false)
    }
  }

  const handleLike = async (sol) => {
    setFeed(prev => prev.map(s => s.id === sol.id
      ? { ...s, liked_by_me: !s.liked_by_me, likes_count: (s.likes_count || 0) + (s.liked_by_me ? -1 : 1) }
      : s))
    try {
      const res = await toggleRoomLike(sol.id)
      setFeed(prev => prev.map(s => s.id === sol.id
        ? { ...s, liked_by_me: res.liked, likes_count: res.likes_count }
        : s))
    } catch {
      load() // reconcile on failure
    }
  }

  const handleDelete = async (sol) => {
    if (!window.confirm('Delete your shared solution? This cannot be undone.')) return
    try {
      await deleteRoomSolution(sol.id)
      setFeed(prev => prev.filter(s => s.id !== sol.id))
    } catch { /* keep the card on failure */ }
  }

  const openReport = (sol) => {
    setReportTarget(sol)
    setReportSent(false)
    setReportError('')
  }

  const submitReport = async ({ reason, note }) => {
    if (!reportTarget) return
    setReportSending(true)
    setReportError('')
    try {
      await reportContentFlag({
        question_text: reportTarget.question_text || '',
        topic: reportTarget.topic || '',
        exam_type: reportTarget.exam_type || '',
        source: 'solutions-room',
        level: '',
        reason,
        note,
      })
      setReportSent(true)
    } catch {
      setReportError('Could not send. Check your connection and try again.')
    } finally {
      setReportSending(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase
                      text-[var(--color-gold)] mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" />
          Community
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight
                       flex items-center gap-3">
          <Users size={44} className="text-[var(--color-teal)]" />
          Solutions Room
        </h1>
        <p className="text-[var(--color-muted)] mt-2">
          Real solutions shared by students, for students. Be kind, be accurate.
        </p>
      </div>

      <button onClick={() => setShowForm(v => !v)}
        className="w-full btn-primary py-3.5 justify-center mb-6
                   flex items-center gap-2">
        <Send size={18} /> {showForm ? 'Close sharing form' : 'Share a solution'}
      </button>

      {showForm && (
        <form onSubmit={handleShare} className="card bg-white p-6 space-y-4 mb-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest
                                 text-[var(--color-muted)] block mb-2">Topic</label>
              <input type="text" value={qTopic} onChange={(e) => setQTopic(e.target.value)}
                placeholder="e.g. Quadratic Equations" maxLength={80}
                className="w-full border-2 border-[var(--color-border)]
                           focus:border-[var(--color-teal)] rounded-xl px-4 py-2.5
                           text-sm transition-colors" />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest
                                 text-[var(--color-muted)] block mb-2">Exam</label>
              <div className="flex flex-wrap gap-2">
                {EXAMS.filter(x => x !== 'All').map(x => (
                  <button type="button" key={x} onClick={() => setQExam(x)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold
                                border-2 transition-all
                      ${qExam === x
                        ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                        : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-ink)]'}`}>
                    {x}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-muted)] block mb-2">Question</label>
            <textarea value={qText} onChange={(e) => setQText(e.target.value)}
              rows={3} placeholder="Paste the exact question..."
              className="w-full border-2 border-[var(--color-border)]
                         focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                         text-sm transition-colors resize-none" />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-muted)] block mb-2">Your solution</label>
            <textarea value={sText} onChange={(e) => setSText(e.target.value)}
              rows={5} placeholder="Show your working step by step..."
              className="w-full border-2 border-[var(--color-border)]
                         focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                         text-sm transition-colors resize-none" />
          </div>
          {shareMsg && <p className="text-xs text-red-600">{shareMsg}</p>}
          <button type="submit" disabled={sharing}
            className="w-full btn-primary py-3 justify-center
                       flex items-center gap-2 disabled:opacity-50">
            {sharing
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Check size={18} />}
            {sharing ? 'Sharing...' : 'Post to the Room'}
          </button>
        </form>
      )}

      <form onSubmit={applyFilter} className="flex flex-wrap gap-2 mb-6">
        <div className="flex flex-wrap gap-2 flex-1">
          {EXAMS.map(x => (
            <button type="button" key={x}
              onClick={() => { setFilterExam(x); load(x, filterTopic) }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold
                          border-2 transition-all
                ${filterExam === x
                  ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-ink)]'}`}>
              {x}
            </button>
          ))}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input type="text" value={filterTopic}
            onChange={(e) => setFilterTopic(e.target.value)}
            placeholder="Filter by topic..."
            className="flex-1 sm:w-44 border-2 border-[var(--color-border)]
                       focus:border-[var(--color-teal)] rounded-xl px-3 py-1.5
                       text-xs transition-colors" />
          <button type="submit"
            className="px-4 py-1.5 rounded-xl text-xs font-bold shrink-0
                       bg-[var(--color-cream)] border-2 border-[var(--color-border)]
                       hover:border-[var(--color-ink)] transition-all">
            Go
          </button>
        </div>
      </form>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card bg-white p-6 space-y-3">
              <div className="h-3 bg-[var(--color-border)] rounded animate-pulse w-2/3" />
              <div className="h-2 bg-[var(--color-border)] rounded animate-pulse w-full" />
              <div className="h-2 bg-[var(--color-border)] rounded animate-pulse w-5/6" />
            </div>
          ))}
        </div>
      ) : feed.length === 0 ? (
        <div className="card bg-white p-12 text-center">
          <Users size={48} className="mx-auto mb-3 text-[var(--color-muted)]" />
          <p className="text-[var(--color-muted)]">
            The Room is quiet. Be the first to share a solution!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map(sol => (
            <article key={sol.id} className="card bg-white overflow-hidden">
              <div className="px-6 pt-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[var(--color-teal)]
                                  flex items-center justify-center text-white
                                  font-bold text-xs shrink-0">
                    {(sol.username || 'S')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[var(--color-ink)] truncate">
                      @{sol.username || 'student'}
                    </p>
                    <p className="text-[11px] text-[var(--color-muted)] font-mono">
                      {timeAgo(sol.created_at)}
                      {sol.topic ? ` · ${sol.topic}` : ''}
                      {sol.exam_type ? ` · ${sol.exam_type}` : ''}
                    </p>
                  </div>
                </div>
                {sol.mine && (
                  <button onClick={() => handleDelete(sol)}
                    title="Delete your share"
                    className="shrink-0 p-2 rounded-lg text-[var(--color-muted)]
                               hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="px-6 pt-3">
                <p className="font-medium text-[var(--color-ink)] text-[15px] leading-relaxed">
                  {sol.question_text}
                </p>
              </div>
              <div className="px-6 py-3">
                <ExplanationBody text={sol.solution_text} />
              </div>
              <div className="px-6 py-3 border-t border-[var(--color-border)]
                              flex items-center gap-2">
                <button onClick={() => handleLike(sol)}
                  title={sol.liked_by_me ? 'Unlike' : 'Like this solution'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                              text-xs font-bold border-2 transition-all
                    ${sol.liked_by_me
                      ? 'border-red-300 bg-red-50 text-red-500'
                      : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-red-300 hover:text-red-500'}`}>
                  <Heart size={14} className={sol.liked_by_me ? 'fill-current' : ''} />
                  {sol.likes_count || 0}
                </button>
                <button onClick={() => openReport(sol)}
                  title="Report a problem with this solution"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                             text-xs font-semibold text-[var(--color-muted)]
                             hover:text-red-500 transition-colors">
                  <Flag size={14} /> Report
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ReportQuestionModal open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={submitReport}
        sending={reportSending}
        sent={reportSent}
        error={reportError} />
    </div>
  )
}
