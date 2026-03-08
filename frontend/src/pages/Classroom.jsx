import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  createClassroom, getMyClassrooms, getJoinedClassrooms,
  joinClassroom, getClassroomLeaderboard, getStudentStats,
} from '../lib/classroom'

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }
const MASTERY_COLOR = {
  master: 'text-emerald-600', proficient: 'text-blue-600',
  developing: 'text-amber-600', beginner: 'text-slate-500',
}
const LEVEL_LABELS = {
  primary: 'Primary', jss: 'JSS', secondary: 'Secondary', university: 'University'
}

function MiniStatBox({ label, value, color = '' }) {
  return (
    <div className="bg-[var(--color-cream)] rounded-xl p-3 text-center">
      <div className={`text-xl font-black font-serif ${color || 'text-[var(--color-teal)]'}`}>{value}</div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-muted)] mt-0.5">{label}</div>
    </div>
  )
}

export default function Classroom() {
  const { user, profile } = useAuth()
  const isTeacher = profile?.role === 'teacher'
  const isParent  = profile?.role === 'parent'

  const [myClasses,    setMyClasses]    = useState([])
  const [joinedClasses, setJoinedClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [leaderboard,   setLeaderboard]   = useState([])
  const [loading,       setLoading]       = useState(true)

  // Create class form
  const [newName,  setNewName]  = useState('')
  const [newLevel, setNewLevel] = useState('secondary')
  const [creating, setCreating] = useState(false)

  // Join form
  const [code,     setCode]     = useState('')
  const [joining,  setJoining]  = useState(false)
  const [joinMsg,  setJoinMsg]  = useState('')

  // Student detail
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentStats,    setStudentStats]    = useState(null)

  useEffect(() => { if (user) loadAll() }, [user])

  const loadAll = async () => {
    setLoading(true)
    const [myRes, joinRes] = await Promise.all([
      isTeacher ? getMyClassrooms(user.id) : { data: [] },
      getJoinedClassrooms(user.id),
    ])
    setMyClasses(myRes.data || [])
    setJoinedClasses(joinRes.data || [])

    // Auto-select first class
    const first = (myRes.data || [])[0] || (joinRes.data || [])[0]?.classrooms
    if (first) selectClass(first)
    setLoading(false)
  }

  const selectClass = async (cls) => {
    setSelectedClass(cls)
    setSelectedStudent(null)
    const { data } = await getClassroomLeaderboard(cls.id)
    setLeaderboard(data || [])
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const { data } = await createClassroom(user.id, newName, newLevel)
    if (data) {
      setMyClasses(c => [data, ...c])
      setNewName('')
      selectClass(data)
    }
    setCreating(false)
  }

  const handleJoin = async () => {
    if (!code.trim()) return
    setJoining(true); setJoinMsg('')
    const { data, error } = await joinClassroom(user.id, code)
    if (error) {
      setJoinMsg('❌ ' + error)
    } else {
      setJoinMsg('✅ Joined!')
      setCode('')
      await loadAll()
    }
    setJoining(false)
  }

  const handleStudentClick = async (student) => {
    setSelectedStudent(student)
    const stats = await getStudentStats(student.userId)
    setStudentStats(stats)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-[var(--color-teal)] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase text-[var(--color-gold)]
                      mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" />
          {isTeacher ? 'Teacher Dashboard' : isParent ? 'Parent Dashboard' : 'My Class'}
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight">
          {isTeacher ? 'Manage Classrooms' : 'Class Leaderboard'}
        </h1>
        <p className="text-[var(--color-muted)] mt-2">
          {isTeacher
            ? 'Create classes, share invite codes, and track your students.'
            : 'See how you rank against your classmates and view your progress.'}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">

        {/* ── LEFT SIDEBAR ── */}
        <div className="space-y-4">

          {/* Teacher: Create class */}
          {isTeacher && (
            <div className="card p-4 space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                + New Classroom
              </p>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Class name e.g. JSS3 Gold"
                className="w-full border-2 border-[var(--color-border)] focus:border-[var(--color-teal)]
                           rounded-xl px-3 py-2 text-sm bg-[var(--color-paper)]" />
              <select value={newLevel} onChange={e => setNewLevel(e.target.value)}
                className="w-full border-2 border-[var(--color-border)] rounded-xl px-3 py-2
                           text-sm bg-[var(--color-paper)]">
                {Object.entries(LEVEL_LABELS).map(([v, l]) =>
                  <option key={v} value={v}>{l}</option>)}
              </select>
              <button onClick={handleCreate} disabled={creating || !newName.trim()}
                className="w-full btn-primary py-2 text-sm justify-center flex items-center gap-2
                           disabled:opacity-50">
                {creating ? '...' : 'Create Class'}
              </button>
            </div>
          )}

          {/* Join class */}
          {!isTeacher && (
            <div className="card p-4 space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                Join a Class
              </p>
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="8-letter invite code"
                maxLength={8}
                className="w-full border-2 border-[var(--color-border)] focus:border-[var(--color-teal)]
                           rounded-xl px-3 py-2 text-sm font-mono bg-[var(--color-paper)]" />
              {joinMsg && <p className="text-xs">{joinMsg}</p>}
              <button onClick={handleJoin} disabled={joining || code.length < 8}
                className="w-full btn-primary py-2 text-sm justify-center flex disabled:opacity-50">
                Join
              </button>
            </div>
          )}

          {/* Class list */}
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-ink)] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
                {isTeacher ? 'My Classes' : 'Enrolled Classes'}
              </p>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {(isTeacher ? myClasses : joinedClasses.map(j => j.classrooms))
                .filter(Boolean).map(cls => (
                <button key={cls.id} onClick={() => selectClass(cls)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-[var(--color-cream)]
                    ${selectedClass?.id === cls.id ? 'bg-[var(--color-cream)]' : ''}`}>
                  <p className="font-semibold text-sm text-[var(--color-ink)]">{cls.name}</p>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">
                    {LEVEL_LABELS[cls.level]} · Code: <span className="font-mono">{cls.invite_code}</span>
                  </p>
                </button>
              ))}
              {(isTeacher ? myClasses : joinedClasses).length === 0 && (
                <div className="p-6 text-center text-sm text-[var(--color-muted)]">
                  {isTeacher ? 'Create your first class above.' : 'No classes yet. Enter an invite code.'}
                </div>
              )}
            </div>
          </div>

          {/* Teacher: invite code card */}
          {isTeacher && selectedClass && (
            <div className="card p-4 text-center border-2 border-dashed border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-muted)] mb-1 font-mono uppercase tracking-widest">
                Invite Code
              </p>
              <p className="font-mono font-black text-3xl tracking-widest text-[var(--color-teal)]">
                {selectedClass.invite_code}
              </p>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Share this with students to join
              </p>
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="space-y-6">
          {!selectedClass ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]
                            text-center text-[var(--color-muted)]">
              <p className="text-4xl mb-3">🏫</p>
              <p className="font-semibold">Select a class to view the leaderboard</p>
            </div>
          ) : selectedStudent ? (
            // Student detail view
            <div>
              <button onClick={() => setSelectedStudent(null)}
                className="mb-4 text-sm font-medium text-[var(--color-teal)] hover:underline flex items-center gap-1">
                ← Back to Leaderboard
              </button>
              <div className="card overflow-hidden">
                <div className="bg-[var(--color-ink)] px-6 py-4">
                  <p className="text-white font-bold text-lg">{selectedStudent.name}</p>
                  <p className="text-white/60 text-xs font-mono">#{selectedStudent.rank} in class</p>
                </div>
                <div className="p-6">
                  {!studentStats ? (
                    <div className="flex justify-center py-8">
                      <span className="w-8 h-8 border-4 border-[var(--color-teal)] border-t-transparent
                                       rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-4 gap-3">
                        <MiniStatBox label="Avg Score" value={`${selectedStudent.avgScore}%`} />
                        <MiniStatBox label="Sessions"  value={selectedStudent.sessCount} />
                        <MiniStatBox label="Mastered"  value={selectedStudent.topicsMaster} />
                        <MiniStatBox label="Streak"
                          value={`${studentStats.streak.current_streak}🍌`}
                          color="text-amber-600" />
                      </div>
                      {studentStats.mastery.length > 0 && (
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-widest
                                         text-[var(--color-muted)] mb-3">Topic Mastery</p>
                          <div className="space-y-2">
                            {studentStats.mastery.slice(0, 8).map(m => (
                              <div key={m.topic} className="flex items-center gap-3">
                                <span className="text-xs text-[var(--color-ink)] w-40 truncate shrink-0">
                                  {m.topic}
                                </span>
                                <div className="flex-1 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                                  <div className="h-full bg-[var(--color-teal)] rounded-full"
                                       style={{ width: `${Math.min(100, m.avg_score || 0)}%` }} />
                                </div>
                                <span className={`text-xs font-semibold w-16 text-right shrink-0
                                  ${MASTERY_COLOR[m.mastery_level] || ''}`}>
                                  {m.mastery_level}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {studentStats.sessions.length > 0 && (
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-widest
                                         text-[var(--color-muted)] mb-3">Recent Sessions</p>
                          <div className="divide-y divide-[var(--color-border)]">
                            {studentStats.sessions.slice(0, 5).map(s => (
                              <div key={s.id} className="flex items-center justify-between py-2">
                                <div>
                                  <p className="text-sm font-medium">{s.topic}</p>
                                  <p className="text-xs text-[var(--color-muted)]">
                                    {s.difficulty} · {new Date(s.completed_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <span className={`font-bold font-serif text-lg
                                  ${s.score >= 80 ? 'text-green-600' : s.score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                  {s.score}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Leaderboard
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif font-bold text-2xl">{selectedClass.name}</h2>
                <span className="text-sm text-[var(--color-muted)]">
                  {leaderboard.length} student{leaderboard.length !== 1 ? 's' : ''}
                </span>
              </div>

              {leaderboard.length === 0 ? (
                <div className="card p-12 text-center">
                  <p className="text-4xl mb-3">🏆</p>
                  <p className="font-semibold text-[var(--color-ink)]">No students yet</p>
                  <p className="text-sm text-[var(--color-muted)] mt-1">
                    Share the invite code <span className="font-mono font-bold">{selectedClass.invite_code}</span> to get started.
                  </p>
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <div className="bg-[var(--color-ink)] px-6 py-3 grid grid-cols-12 text-white/60
                                  font-mono text-[10px] uppercase tracking-widest">
                    <span className="col-span-1">#</span>
                    <span className="col-span-4">Student</span>
                    <span className="col-span-2 text-center">Score</span>
                    <span className="col-span-2 text-center">Sessions</span>
                    <span className="col-span-2 text-center">Mastered</span>
                    <span className="col-span-1 text-center">Pts</span>
                  </div>
                  <div className="divide-y divide-[var(--color-border)]">
                    {leaderboard.map(student => (
                      <button key={student.userId}
                        onClick={() => isTeacher ? handleStudentClick(student) : null}
                        className={`w-full grid grid-cols-12 px-6 py-4 items-center text-left
                          ${isTeacher ? 'hover:bg-[var(--color-cream)] transition-colors' : ''}
                          ${student.userId === user?.id ? 'bg-[var(--color-teal)]/5' : ''}`}>
                        <span className="col-span-1 font-serif font-black text-lg">
                          {MEDAL[student.rank] || `#${student.rank}`}
                        </span>
                        <span className="col-span-4">
                          <span className="font-semibold text-sm text-[var(--color-ink)]">
                            {student.name}
                            {student.userId === user?.id && (
                              <span className="ml-2 text-[10px] font-normal px-1.5 py-0.5 rounded
                                               bg-[var(--color-teal)] text-white">You</span>
                            )}
                          </span>
                        </span>
                        <span className={`col-span-2 text-center font-bold text-sm
                          ${student.avgScore >= 70 ? 'text-green-600' : student.avgScore >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                          {student.avgScore}%
                        </span>
                        <span className="col-span-2 text-center text-sm text-[var(--color-muted)]">
                          {student.sessCount}
                        </span>
                        <span className="col-span-2 text-center text-sm text-[var(--color-teal)] font-semibold">
                          {student.topicsMaster} 🏆
                        </span>
                        <span className="col-span-1 text-center font-mono font-bold text-sm">
                          {student.points}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
