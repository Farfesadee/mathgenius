import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  getMyClassrooms, getJoinedClassrooms,
  getClassroomLeaderboard, getStudentStats, getChildren, linkChild,
} from '../lib/classroom'
import { getStrugglingAlerts, resolveAlert } from '../lib/social2'
import { downloadProgressReport } from '../services/api'

// ── Tiny helpers ────────────────────────────────────────────────────
const MASTERY_CFG = {
  master:     { icon: '🏆', color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  proficient: { icon: '⭐', color: '#3b82f6', bg: 'bg-blue-50',    border: 'border-blue-200'    },
  developing: { icon: '📈', color: '#f59e0b', bg: 'bg-amber-50',   border: 'border-amber-200'   },
  beginner:   { icon: '🌱', color: '#94a3b8', bg: 'bg-slate-50',   border: 'border-slate-200'   },
}

function scoreColor(s) {
  if (s >= 75) return 'text-emerald-600'
  if (s >= 55) return 'text-amber-600'
  return 'text-red-500'
}

function MiniBar({ value, max = 100, color = '#1a8a7a' }) {
  return (
    <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
           style={{ width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }} />
    </div>
  )
}

function StatTile({ label, value, sub, icon, color = 'var(--color-teal)' }) {
  return (
    <div className="bg-[var(--color-paper)] border-2 border-[var(--color-border)] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="font-mono text-[10px] tracking-widest uppercase text-[var(--color-muted)]">
          {label}
        </span>
      </div>
      <div className="font-serif font-black text-3xl" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-[var(--color-muted)] mt-1">{sub}</div>}
    </div>
  )
}

// ── Student card (compact, clickable) ──────────────────────────────
function StudentCard({ student, rank, onClick, isTeacher }) {
  const topMastery = student.mastery?.[0]
  const mCfg = topMastery ? MASTERY_CFG[topMastery.mastery_level] || MASTERY_CFG.beginner : null

  return (
    <button onClick={onClick}
      className="w-full text-left bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                 rounded-2xl p-5 hover:border-[var(--color-teal)] transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {rank <= 3 ? (
            <span className="text-2xl">{['🥇','🥈','🥉'][rank - 1]}</span>
          ) : (
            <span className="w-8 h-8 rounded-full bg-[var(--color-cream)] flex items-center
                             justify-center font-mono font-bold text-sm text-[var(--color-muted)]">
              {rank}
            </span>
          )}
          <div>
            <p className="font-bold text-sm text-[var(--color-ink)]">{student.name}</p>
            {mCfg && (
              <p className="text-[10px] font-mono mt-0.5" style={{ color: mCfg.color }}>
                {mCfg.icon} {topMastery.mastery_level} · {topMastery.topic}
              </p>
            )}
          </div>
        </div>
        <span className={`font-serif font-black text-xl ${scoreColor(student.avgScore)}`}>
          {student.avgScore}%
        </span>
      </div>

      <MiniBar value={student.avgScore} color="#1a8a7a" />

      <div className="flex items-center justify-between mt-3 text-xs text-[var(--color-muted)]">
        <span>📝 {student.sessCount} session{student.sessCount !== 1 ? 's' : ''}</span>
        <span>🏆 {student.topicsMaster} mastered</span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity font-medium
                         text-[var(--color-teal)]">
          {isTeacher ? 'View detail →' : 'View progress →'}
        </span>
      </div>
    </button>
  )
}

// ── Student detail panel ───────────────────────────────────────────
function StudentDetail({ student, stats, onBack, onDownloadPDF, downloadingPDF }) {
  const [tab, setTab] = useState('overview')  // overview | topics | sessions

  if (!stats) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-[var(--color-teal)] border-t-transparent
                      rounded-full animate-spin" />
    </div>
  )

  const topics   = stats.mastery || []
  const sessions = stats.sessions || []
  const streak   = stats.streak  || {}

  const avgScore = sessions.length
    ? Math.round(sessions.reduce((s, x) => s + (x.score || 0), 0) / sessions.length) : 0
  const weakTopics   = topics.filter(t => t.avg_score < 50)
  const strongTopics = topics.filter(t => t.avg_score >= 80)

  return (
    <div>
      <button onClick={onBack}
        className="mb-5 text-sm font-medium text-[var(--color-teal)] hover:underline
                   flex items-center gap-1">
        ← All students
      </button>

      {/* Student header */}
      <div className="bg-[var(--color-ink)] rounded-2xl p-6 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif font-black text-3xl text-white">{student.name}</h2>
            <p className="text-white/50 text-sm font-mono mt-1">
              #{student.rank} in class · {streak.current_streak || 0} day streak 🍌
            </p>
          </div>
          <div className="text-right space-y-3">
            <div>
              <div className={`font-serif font-black text-5xl ${scoreColor(avgScore)} 
                               [--tw-text-opacity:1]`}
                   style={{ color: avgScore >= 75 ? '#10b981' : avgScore >= 55 ? '#f59e0b' : '#ef4444' }}>
                {avgScore}%
              </div>
              <p className="text-white/40 text-xs mt-1">avg score</p>
            </div>
            <button
              onClick={onDownloadPDF}
              disabled={downloadingPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                         bg-white/10 hover:bg-white/20 text-white text-xs
                         font-semibold transition-colors disabled:opacity-50">
              {downloadingPDF
                ? <><span className="w-3 h-3 border border-white/40 border-t-white
                                     rounded-full animate-spin" /> Generating…</>
                : <>📄 Download Report</>}
            </button>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatTile label="Sessions"    value={sessions.length}           icon="📝" />
        <StatTile label="Topics done" value={topics.length}             icon="📚" />
        <StatTile label="Mastered"    value={strongTopics.length}       icon="🏆" color="#10b981" />
        <StatTile label="Need work"   value={weakTopics.length}         icon="⚠️" color="#f59e0b" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b-2 border-[var(--color-border)] mb-5">
        {[['overview','Overview'], ['topics','Topic Mastery'], ['sessions','Recent Sessions']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-all
              ${tab === id
                ? 'border-[var(--color-ink)] text-[var(--color-ink)]'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* Score trend chart (bar chart from sessions) */}
          {sessions.length > 0 && (
            <div className="card p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-4">
                Score Trend (last {Math.min(8, sessions.length)} sessions)
              </p>
              <div className="flex items-end gap-2 h-24">
                {sessions.slice(0, 8).reverse().map((s, i) => {
                  const h   = Math.max(4, ((s.score || 0) / 100) * 96)
                  const col = s.score >= 75 ? '#10b981' : s.score >= 50 ? '#f59e0b' : '#ef4444'
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] font-mono text-[var(--color-muted)]">{s.score}%</span>
                      <div className="w-full rounded-t-lg transition-all"
                           style={{ height: h, backgroundColor: col }} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Weak topics callout */}
          {weakTopics.length > 0 && (
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
              <p className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                ⚠️ Topics needing attention
              </p>
              <div className="space-y-2">
                {weakTopics.map(t => (
                  <div key={t.topic} className="flex items-center justify-between">
                    <span className="text-sm text-amber-900">{t.topic}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24">
                        <MiniBar value={t.avg_score} color="#f59e0b" />
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-700 w-8 text-right">
                        {Math.round(t.avg_score || 0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strong topics */}
          {strongTopics.length > 0 && (
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
              <p className="font-semibold text-emerald-800 mb-3">🏆 Strong topics</p>
              <div className="flex flex-wrap gap-2">
                {strongTopics.map(t => (
                  <span key={t.topic}
                    className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-700
                               text-xs font-semibold border border-emerald-200">
                    {t.topic} · {Math.round(t.avg_score)}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Topics tab */}
      {tab === 'topics' && (
        <div className="space-y-2">
          {topics.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)] text-center py-10">No practice sessions yet.</p>
          ) : topics.map(t => {
            const mc = MASTERY_CFG[t.mastery_level] || MASTERY_CFG.beginner
            return (
              <div key={t.topic}
                className={`flex items-center gap-4 p-3 rounded-xl border-2 ${mc.border} ${mc.bg}`}>
                <span className="text-lg shrink-0">{mc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-[var(--color-ink)] truncate">{t.topic}</span>
                    <span className="text-xs font-mono ml-2 shrink-0" style={{ color: mc.color }}>
                      {t.mastery_level} · {Math.round(t.avg_score || 0)}%
                    </span>
                  </div>
                  <MiniBar value={t.avg_score || 0} color={mc.color} />
                </div>
                <span className="text-xs text-[var(--color-muted)] shrink-0">
                  {t.sessions_done || t.times_studied || 0} sessions
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Sessions tab */}
      {tab === 'sessions' && (
        <div className="card overflow-hidden">
          {sessions.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)] text-center py-10">No completed sessions.</p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {sessions.map(s => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-medium text-sm text-[var(--color-ink)]">{s.topic || '—'}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {s.difficulty} · {new Date(s.completed_at).toLocaleDateString('en-NG', {
                        day:'numeric', month:'short', year:'numeric'
                      })}
                    </p>
                  </div>
                  <span className={`font-serif font-black text-xl ${scoreColor(s.score)}`}>
                    {s.score}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────
export default function TeacherParentDashboard() {
  const { user, profile } = useAuth()
  const isTeacher = profile?.role === 'teacher'
  const isParent  = profile?.role === 'parent'

  const [loading,     setLoading]     = useState(true)
  const [classes,     setClasses]     = useState([])       // teacher: my classrooms; parent: joined
  const [selectedCls, setSelectedCls] = useState(null)
  const [students,    setStudents]    = useState([])       // leaderboard-style list
  const [selStudent,  setSelStudent]  = useState(null)
  const [studentStats, setStudentStats] = useState(null)
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  // Struggling student alerts
  const [alerts,      setAlerts]      = useState([])
  const [alertsLoaded,setAlertsLoaded]= useState(false)

  // Parent: link child
  const [childEmail,  setChildEmail]  = useState('')
  const [linkMsg,     setLinkMsg]     = useState('')
  const [linking,     setLinking]     = useState(false)

  // Parent: children list
  const [children,   setChildren]    = useState([])

  useEffect(() => { if (user) init() }, [user])

  const init = async () => {
    setLoading(true)
    if (isTeacher) {
      const { data } = await getMyClassrooms(user.id)
      setClasses(data || [])
      if (data?.[0]) await loadClass(data[0])
    } else if (isParent) {
      const { data: childLinks } = await getChildren(user.id)
      const kids = (childLinks || []).map(c => ({
        id:   c.child_id,
        name: c.profiles?.display_name || c.profiles?.email?.split('@')[0] || 'Student',
      }))
      setChildren(kids)
      // Also get any classes they're monitoring
      const { data: joined } = await getJoinedClassrooms(user.id)
      setClasses((joined || []).map(j => j.classrooms).filter(Boolean))
      // Auto-load first child
      if (kids[0]) loadSingleStudent(kids[0])
    }
    // Load struggling alerts for this teacher/parent
    const { data: alertData } = await getStrugglingAlerts(user.id)
    setAlerts(alertData || [])
    setAlertsLoaded(true)
    setLoading(false)
  }

  const handleDownloadPDF = async () => {
    if (!selStudent || !studentStats) return
    setDownloadingPDF(true)
    try {
      const sessions  = studentStats.sessions || []
      const mastery   = studentStats.mastery  || []
      const streak    = studentStats.streak   || {}
      const attempted = mastery.reduce((s, t) => s + (t.questions_attempted || 0), 0)
      const correct   = mastery.reduce((s, t) => s + (t.questions_correct   || 0), 0)
      const avgScore  = sessions.length
        ? Math.round(sessions.reduce((s, x) => s + (x.score || 0), 0) / sessions.length) : 0
      const weakTopics   = mastery.filter(t => (t.avg_score || 0) < 50).slice(0, 5)
        .map(t => ({ topic: t.topic, avg_score: t.avg_score || 0 }))
      const strongTopics = mastery.filter(t => (t.avg_score || 0) >= 80).slice(0, 5)
        .map(t => ({ topic: t.topic, avg_score: t.avg_score || 0 }))

      await downloadProgressReport({
        student_name:  selStudent.name,
        teacher_name:  profile?.display_name || profile?.email?.split('@')[0] || 'Teacher',
        period_label:  'Last 30 Days',
        sessions:      sessions.slice(0, 10),
        mastery,
        streak,
        weak_topics:   weakTopics,
        strong_topics: strongTopics,
        accuracy:      attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
        avg_score:     avgScore,
      })
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setDownloadingPDF(false)
    }
  }

  const handleResolveAlert = async (alertId) => {
    await resolveAlert(alertId)
    setAlerts(prev => prev.filter(a => a.id !== alertId))
  }

  const loadClass = async (cls) => {
    setSelectedCls(cls)
    setSelStudent(null)
    setStudentStats(null)
    const { data: board } = await getClassroomLeaderboard(cls.id)
    // Enrich with mastery for top topic
    const enriched = await Promise.all((board || []).map(async s => {
      const st = await getStudentStats(s.userId)
      return { ...s, mastery: st.mastery?.slice(0, 1) }
    }))
    setStudents(enriched)
  }

  const loadSingleStudent = async (student) => {
    setSelStudent(student)
    setStudentStats(null)
    const stats = await getStudentStats(student.userId || student.id)
    setStudentStats(stats)
  }

  const handleLinkChild = async () => {
    if (!childEmail.trim()) return
    setLinking(true); setLinkMsg('')
    const { error } = await linkChild(user.id, childEmail.trim())
    if (error) setLinkMsg('❌ ' + error)
    else {
      setLinkMsg('✅ Child linked!')
      setChildEmail('')
      await init()
    }
    setLinking(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-[var(--color-teal)] border-t-transparent
                      rounded-full animate-spin" />
    </div>
  )

  // If user is not teacher or parent, show instructions
  if (!isTeacher && !isParent) return (
    <div className="max-w-lg mx-auto px-6 py-20 text-center">
      <p className="text-5xl mb-4">🔒</p>
      <h2 className="font-serif font-black text-2xl mb-2">Teacher & Parent Access Only</h2>
      <p className="text-[var(--color-muted)] text-sm">
        This dashboard is for teachers and parents monitoring student progress.
        If you're a teacher or parent, ask your school admin to update your account role.
      </p>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase text-[var(--color-gold)]
                      mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" />
          {isTeacher ? 'Teacher Dashboard' : 'Parent Dashboard'}
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight">
          {isTeacher ? 'Student Progress' : 'My Child\'s Progress'}
        </h1>
        <p className="text-[var(--color-muted)] mt-2">
          {isTeacher
            ? 'Track every student\'s scores, mastery levels and weak topics across all your classes.'
            : 'Monitor your child\'s learning journey — scores, streaks, and topic mastery at a glance.'}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-6">

        {/* ── SIDEBAR ── */}
        <div className="space-y-4">

          {/* Teacher: class picker */}
          {isTeacher && classes.length > 0 && (
            <div className="card overflow-hidden">
              <div className="bg-[var(--color-ink)] px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
                  My Classes
                </p>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {classes.map(cls => (
                  <button key={cls.id} onClick={() => loadClass(cls)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-[var(--color-cream)]
                      ${selectedCls?.id === cls.id ? 'bg-[var(--color-cream)]' : ''}`}>
                    <p className="font-semibold text-sm">{cls.name}</p>
                    <p className="text-xs text-[var(--color-muted)] font-mono mt-0.5">
                      Code: {cls.invite_code}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Parent: link child form */}
          {isParent && (
            <div className="card p-4 space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                Link a Child
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                Enter your child's MathGenius account email to see their progress.
              </p>
              <input value={childEmail} onChange={e => setChildEmail(e.target.value)}
                placeholder="child@email.com"
                type="email"
                className="w-full border-2 border-[var(--color-border)] focus:border-[var(--color-teal)]
                           rounded-xl px-3 py-2 text-sm bg-[var(--color-paper)]" />
              {linkMsg && <p className="text-xs">{linkMsg}</p>}
              <button onClick={handleLinkChild} disabled={linking || !childEmail.trim()}
                className="w-full btn-primary py-2 text-sm justify-center flex disabled:opacity-50">
                {linking ? 'Linking...' : 'Link Child'}
              </button>
            </div>
          )}

          {/* Parent: child list */}
          {isParent && children.length > 0 && (
            <div className="card overflow-hidden">
              <div className="bg-[var(--color-ink)] px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
                  My Children
                </p>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {children.map(child => (
                  <button key={child.id} onClick={() => loadSingleStudent(child)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-[var(--color-cream)]
                      ${selStudent?.id === child.id ? 'bg-[var(--color-cream)]' : ''}`}>
                    <p className="font-semibold text-sm">{child.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Overview stats (teacher only when class loaded) */}
          {isTeacher && students.length > 0 && (
            <div className="card p-4 space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                Class Overview
              </p>
              {[
                { label: 'Students',   value: students.length },
                { label: 'Class avg',  value: `${Math.round(students.reduce((s,x) => s + x.avgScore, 0) / students.length)}%` },
                { label: 'Top scorer', value: students[0]?.name || '—' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-muted)]">{s.label}</span>
                  <span className="text-sm font-bold text-[var(--color-ink)]">{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div>
          {/* Student detail */}
          {selStudent ? (
            <StudentDetail
              student={selStudent}
              stats={studentStats}
              onBack={() => { setSelStudent(null); setStudentStats(null) }}
              onDownloadPDF={handleDownloadPDF}
              downloadingPDF={downloadingPDF}
            />
          ) : students.length > 0 ? (
            // Class grid
            <div>
              {/* ── Struggling Student Alerts ── */}
              {alertsLoaded && alerts.length > 0 && (
                <div className="mb-6 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-red-600 font-bold">
                      ⚠️ {alerts.length} Struggling Student{alerts.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  {alerts.map(a => {
                    const name = a.profiles?.display_name
                      || a.profiles?.email?.split('@')[0] || 'Student'
                    return (
                      <div key={a.id}
                        className="flex items-center justify-between gap-3 px-4 py-3
                                   bg-red-50 border-2 border-red-200 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 border border-red-300
                                          flex items-center justify-center text-sm font-bold
                                          text-red-600">
                            {name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-red-800">{name}</p>
                            <p className="text-xs text-red-600 mt-0.5">
                              3 sessions averaging <b>{a.avg_score}%</b>
                              {a.topics ? ` · ${a.topics}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              const student = students.find(s => s.userId === a.student_id)
                              if (student) loadSingleStudent(student)
                            }}
                            className="text-xs px-3 py-1.5 rounded-xl bg-red-500
                                       hover:bg-red-600 text-white font-semibold transition-colors">
                            View →
                          </button>
                          <button
                            onClick={() => handleResolveAlert(a.id)}
                            className="text-xs px-3 py-1.5 rounded-xl border border-red-300
                                       text-red-600 hover:bg-red-100 transition-colors">
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif font-bold text-xl">
                  {selectedCls?.name || 'Students'}
                </h2>
                <span className="text-sm text-[var(--color-muted)]">
                  Click a student to see full detail
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {students.map((s, i) => (
                  <StudentCard key={s.userId} student={s} rank={i + 1}
                    isTeacher={isTeacher}
                    onClick={() => loadSingleStudent({ ...s, id: s.userId })} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <p className="text-5xl mb-3">
                {isTeacher ? '🏫' : '👨‍👩‍👧'}
              </p>
              <p className="font-semibold text-[var(--color-ink)]">
                {isTeacher ? 'Select a class from the sidebar' : 'Link your child to get started'}
              </p>
              <p className="text-sm text-[var(--color-muted)] mt-1 max-w-xs">
                {isTeacher
                  ? 'Once students join your class, you\'ll see their progress here.'
                  : 'Enter your child\'s email on the left to start monitoring their progress.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
