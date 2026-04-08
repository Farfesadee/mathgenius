import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function getGrade(pct) {
  if (pct >= 75) return { grade: 'A', color: 'text-green-600',  bg: 'bg-green-500'  }
  if (pct >= 60) return { grade: 'B', color: 'text-blue-600',   bg: 'bg-blue-500'   }
  if (pct >= 50) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-500' }
  if (pct >= 45) return { grade: 'D', color: 'text-orange-500', bg: 'bg-orange-400' }
  return              { grade: 'F', color: 'text-red-500',    bg: 'bg-red-500'    }
}

export default function CBTHistory() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const selectedSessionId = location.state?.sessionId || null
  const [sessions,  setSessions]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [expanded,  setExpanded]  = useState(null)
  const [answers,   setAnswers]   = useState({})
  const [filter,    setFilter]    = useState('all')

  useEffect(() => {
    if (user) loadHistory()
  }, [user])

  const loadHistory = async () => {
    const { data } = await supabase
      .from('cbt_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
    setSessions(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!loading && selectedSessionId && sessions.length > 0) {
      const sessionExists = sessions.some(s => s.id === selectedSessionId)
      if (sessionExists) {
        handleExpand(selectedSessionId)
      }
    }
  }, [loading, selectedSessionId, sessions])

  const loadAnswers = async (sessionId) => {
    if (answers[sessionId]) return
    const { data } = await supabase
      .from('cbt_answers')
      .select('*')
      .eq('session_id', sessionId)
    setAnswers(prev => ({ ...prev, [sessionId]: data || [] }))
  }

  const handleExpand = async (sessionId) => {
    if (expanded === sessionId) {
      setExpanded(null)
      return
    }
    setExpanded(sessionId)
    await loadAnswers(sessionId)
  }

  const filtered = sessions.filter(s => {
    if (filter === 'all') return true
    const { grade } = getGrade(s.percentage)
    if (filter === 'pass') return s.percentage >= 45
    if (filter === 'fail') return s.percentage < 45
    return s.exam_type === filter
  })

  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.percentage, 0) / sessions.length)
    : 0

  const best = sessions.length > 0
    ? Math.max(...sessions.map(s => s.percentage))
    : 0

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-widest uppercase
                          text-[var(--color-gold)] mb-2 flex items-center gap-3">
              <span className="block w-6 h-px bg-[var(--color-gold)]" />
              CBT Records
            </p>
            <h1 className="font-serif font-black text-5xl tracking-tight">
              Exam History
            </h1>
          </div>
          <button onClick={() => navigate('/cbt')}
            className="btn-secondary px-4 py-3 text-sm rounded-xl">
            ← Back to CBT
          </button>
        </div>
        <p className="text-[var(--color-muted)]">
          Full record of all your past CBT sessions.
        </p>
      </div>

      {/* Stats */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Exams', value: sessions.length,      color: 'text-[var(--color-ink)]',  icon: '📝' },
            { label: 'Average',     value: `${avgScore}%`,        color: 'text-[var(--color-teal)]', icon: '📊' },
            { label: 'Best Score',  value: `${best}%`,            color: 'text-green-600',            icon: '🏆' },
            { label: 'Pass Rate',   value: `${Math.round((sessions.filter(s => s.percentage >= 45).length / sessions.length) * 100)}%`,
              color: 'text-[var(--color-gold)]', icon: '✅' },
          ].map(s => (
            <div key={s.label} className="card bg-white p-4 text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className={`font-serif font-black text-2xl ${s.color}`}>{s.value}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest
                              text-[var(--color-muted)] mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { value: 'all',  label: 'All'  },
          { value: 'JAMB', label: 'JAMB' },
          { value: 'WAEC', label: 'WAEC' },
          { value: 'NECO', label: 'NECO' },
          { value: 'BECE', label: 'BECE' },
          { value: 'pass', label: '✅ Passed' },
          { value: 'fail', label: '❌ Failed' },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border-2 transition-all
              ${filter === f.value
                ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-[var(--color-border)] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-[var(--color-muted)] text-lg mb-6">
            {sessions.length === 0 ? 'No exams taken yet.' : 'No exams match this filter.'}
          </p>
          {sessions.length === 0 && (
            <button onClick={() => navigate('/cbt')} className="btn-primary px-8 py-3">
              🚀 Take First Exam
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="bg-[var(--color-ink)] px-6 py-4">
            <p className="font-serif font-bold text-white">
              📋 {filtered.length} Session{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map(s => {
              const { grade, color, bg } = getGrade(s.percentage)
              const mins = Math.floor((s.time_taken_secs || 0) / 60)
              const secs = (s.time_taken_secs || 0) % 60
              const isOpen = expanded === s.id
              const sessionAnswers = answers[s.id] || []
              const correct = sessionAnswers.filter(a => a.is_correct).length

              return (
                <div key={s.id} className="bg-white">
                  <button
                    onClick={() => handleExpand(s.id)}
                    className="w-full text-left px-6 py-4 flex items-center gap-4
                               hover:bg-[var(--color-cream)] transition-colors"
                  >
                    {/* Grade badge */}
                    <div className={`${bg} w-10 h-10 rounded-xl flex items-center
                                     justify-center font-serif font-black text-white
                                     text-lg shrink-0`}>
                      {grade}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-[var(--color-ink)]">
                          {s.exam_type} {s.year || ''}
                        </p>
                        {s.topic && (
                          <span className="text-xs text-[var(--color-teal)] font-mono">
                            {s.topic.slice(0, 25)}
                          </span>
                        )}
                        <span className="text-xs text-[var(--color-muted)]">
                          {s.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs
                                      text-[var(--color-muted)]">
                        <span>{s.total_questions}Q</span>
                        <span>⏱ {mins}m {secs}s</span>
                        <span>{new Date(s.completed_at).toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`font-serif font-black text-2xl ${color}`}>
                        {s.percentage}%
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {s.score}/{s.total_questions}
                      </p>
                    </div>

                    <span className="text-[var(--color-muted)] text-xs shrink-0">
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 bg-[var(--color-paper)]
                                    border-t border-[var(--color-border)]">
                      {sessionAnswers.length === 0 ? (
                        <div className="py-8 text-center">
                          <div className="w-6 h-6 border-2 border-[var(--color-teal)]
                                          border-t-transparent rounded-full animate-spin
                                          mx-auto mb-2" />
                          <p className="text-sm text-[var(--color-muted)]">
                            Loading answers...
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Mini stats */}
                          <div className="grid grid-cols-3 gap-3 my-4">
                            {[
                              { label: 'Correct', value: correct,                        color: 'text-green-600' },
                              { label: 'Wrong',   value: sessionAnswers.length - correct, color: 'text-red-500'   },
                              { label: 'Skipped', value: sessionAnswers.filter(a => !a.student_answer).length,
                                color: 'text-[var(--color-muted)]' },
                            ].map(st => (
                              <div key={st.label}
                                   className="bg-white rounded-xl p-3 text-center border
                                              border-[var(--color-border)]">
                                <div className={`font-serif font-black text-xl ${st.color}`}>
                                  {st.value}
                                </div>
                                <div className="text-[10px] font-mono uppercase
                                                tracking-widest text-[var(--color-muted)] mt-0.5">
                                  {st.label}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Question list */}
                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {sessionAnswers.map((a, i) => (
                              <div key={i}
                                   className="bg-white rounded-xl px-4 py-3
                                              flex items-start gap-3 border
                                              border-[var(--color-border)]">
                                <span className={`shrink-0 w-6 h-6 rounded-full
                                                  flex items-center justify-center
                                                  text-white text-xs font-bold mt-0.5
                                  ${a.is_correct ? 'bg-green-500' : 'bg-red-500'}`}>
                                  {a.is_correct ? '✓' : '✗'}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-[var(--color-ink)]
                                                leading-snug line-clamp-2">
                                    {i + 1}. {a.question_text}
                                  </p>
                                  <div className="flex gap-3 mt-1 text-[10px]">
                                    <span className={a.is_correct
                                      ? 'text-green-600' : 'text-red-500'}>
                                      You: {a.student_answer || '—'}
                                    </span>
                                    {!a.is_correct && (
                                      <span className="text-green-600">
                                        Ans: {a.correct_answer}
                                      </span>
                                    )}
                                    {a.topic && (
                                      <span className="text-[var(--color-muted)]">
                                        {a.topic}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}