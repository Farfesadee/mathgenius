import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  getOrCreateGoal, updateGoal, getWeekSessions,
  getWeekStart, getWeekDays, getAIStudyPlan,
} from '../lib/planner'
import { getTopicMastery } from '../lib/stats'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const ACTIVITIES = [
  { id: 'teach',    label: 'Learn with Euler', icon: '📚', path: '/teach'    },
  { id: 'practice', label: 'Practice',          icon: '🎯', path: '/practice' },
  { id: 'cbt',      label: 'CBT Exam',          icon: '🖥️', path: '/cbt'      },
]

export default function StudyPlanner() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const weekStart  = getWeekStart()
  const weekDays   = getWeekDays(weekStart)
  const today      = new Date().toISOString().split('T')[0]

  const [goal,        setGoal]        = useState(null)
  const [sessions,    setSessions]    = useState([])
  const [plan,        setPlan]        = useState(null)
  const [mastery,     setMastery]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [generating,  setGenerating]  = useState(false)
  const [dailyTarget, setDailyTarget] = useState(30)
  const [examDate,    setExamDate]    = useState('')

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    const [g, s, m] = await Promise.all([
      getOrCreateGoal(user.id, weekStart),
      getWeekSessions(user.id, weekStart),
      getTopicMastery(user.id),
    ])
    setGoal(g)
    setDailyTarget(g?.daily_target || 30)
    setSessions(s)
    setMastery(m)
    if (g?.plan_data) setPlan(JSON.parse(g.plan_data))
    setLoading(false)
  }

  const handleGeneratePlan = async () => {
    setGenerating(true)
    const weakTopics = mastery
      .filter(t => t.attempted > 0 && (t.correct / t.attempted) < 0.5)
      .map(t => t.topic)
      .slice(0, 5)

    const allTopics = mastery.map(t => t.topic).slice(0, 10)

    const result = await getAIStudyPlan(allTopics, weakTopics, dailyTarget, examDate)
    if (result) {
      setPlan(result)
      if (goal) {
        const updated = await updateGoal(goal.id, {
          daily_target: dailyTarget,
          plan_data:    JSON.stringify(result),
        })
        setGoal(updated)
      }
    }
    setGenerating(false)
  }

  const getSessionForDay = (dateStr) =>
    sessions.find(s => s.date === dateStr)

  const totalMinsThisWeek = sessions.reduce((sum, s) => sum + (s.minutes || 0), 0)
  const daysStudied = sessions.filter(s => s.minutes > 0).length
  const weeklyTarget = dailyTarget * 7

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-[var(--color-border)] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase
                      text-[var(--color-gold)] mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" />
          AI Study Planner
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight">
          Study Planner
        </h1>
        <p className="text-[var(--color-muted)] mt-2">
          Your personalised weekly study plan, powered by Euler.
        </p>
      </div>

      {/* Week summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Mins This Week', value: totalMinsThisWeek, icon: '⏱️', color: 'text-[var(--color-teal)]' },
          { label: 'Daily Target',   value: `${dailyTarget}m`,  icon: '🎯', color: 'text-[var(--color-gold)]' },
          { label: 'Days Studied',   value: `${daysStudied}/7`, icon: '📅', color: 'text-green-600'           },
          { label: 'Weekly Goal',    value: `${weeklyTarget}m`, icon: '🏆', color: 'text-[var(--color-ink)]'  },
        ].map(s => (
          <div key={s.label} className="card bg-white p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className={`font-serif font-black text-2xl ${s.color}`}>{s.value}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest
                            text-[var(--color-muted)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Weekly progress bar */}
      <div className="card bg-white p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-sm text-[var(--color-ink)]">
            Weekly Progress
          </p>
          <p className="font-mono text-xs text-[var(--color-muted)]">
            {totalMinsThisWeek} / {weeklyTarget} mins
          </p>
        </div>
        <div className="w-full bg-[var(--color-border)] rounded-full h-3 mb-4">
          <div
            className="bg-[var(--color-teal)] h-3 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, Math.round((totalMinsThisWeek / weeklyTarget) * 100))}%` }}
          />
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((dateStr, i) => {
            const session   = getSessionForDay(dateStr)
            const mins      = session?.minutes || 0
            const isToday   = dateStr === today
            const isPast    = dateStr < today
            const met       = mins >= dailyTarget

            return (
              <div key={dateStr} className="text-center">
                <p className={`font-mono text-[10px] uppercase mb-1
                  ${isToday ? 'text-[var(--color-teal)] font-bold' : 'text-[var(--color-muted)]'}`}>
                  {DAYS[i]}
                </p>
                <div className={`w-full aspect-square rounded-xl flex items-center
                                 justify-center text-xs font-bold border-2 transition-all
                  ${isToday
                    ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                    : met
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : isPast && mins > 0
                    ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                    : isPast
                    ? 'border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-muted)]'
                    : 'border-dashed border-[var(--color-border)] text-[var(--color-muted)]'
                  }`}>
                  {mins > 0 ? `${mins}m` : isToday ? '📅' : '·'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Plan generator */}
      <div className="card overflow-hidden mb-6">
        <div className="bg-[var(--color-teal)] px-6 py-4">
          <p className="font-serif font-bold text-white text-lg">
            🤖 Generate AI Study Plan
          </p>
        </div>
        <div className="bg-white p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest
                                 text-[var(--color-muted)] block mb-2">
                Daily Study Target (minutes)
              </label>
              <div className="flex gap-2">
                {[15, 30, 45, 60, 90].map(m => (
                  <button key={m} onClick={() => setDailyTarget(m)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold
                                border-2 transition-all
                      ${dailyTarget === m
                        ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                        : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                    {m}m
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest
                                 text-[var(--color-muted)] block mb-2">
                Exam Date (Optional)
              </label>
              <input
                type="date"
                value={examDate}
                onChange={e => setExamDate(e.target.value)}
                className="w-full border-2 border-[var(--color-border)]
                           focus:border-[var(--color-teal)] rounded-xl px-4 py-2.5
                           text-sm transition-colors"
              />
            </div>
          </div>

          {mastery.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
              <p className="text-sm text-yellow-700">
                💡 Take a CBT exam first so Euler can identify your weak topics and
                create a personalised plan.
              </p>
            </div>
          )}

          <button
            onClick={handleGeneratePlan}
            disabled={generating}
            className="w-full btn-primary py-4 text-sm justify-center
                       flex items-center gap-2 disabled:opacity-50"
          >
            {generating ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30
                                 border-t-white rounded-full animate-spin" />
                Euler is building your plan...
              </>
            ) : '🤖 Generate My Study Plan'}
          </button>
        </div>
      </div>

      {/* AI Plan display */}
      {plan && (
        <div className="card overflow-hidden">
          <div className="bg-[var(--color-ink)] px-6 py-4">
            <p className="font-serif font-bold text-white text-lg">
              📅 Your 7-Day Plan
            </p>
            {plan.summary && (
              <p className="text-white/70 text-sm mt-1">{plan.summary}</p>
            )}
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {(plan.days || []).map((day, i) => {
              const dateStr  = weekDays[i] || ''
              const isToday  = dateStr === today
              const session  = getSessionForDay(dateStr)
              const done     = session && session.minutes >= dailyTarget
              const activity = ACTIVITIES.find(a => a.id === day.activity) || ACTIVITIES[0]

              return (
                <div key={i}
                     className={`bg-white px-6 py-4 flex items-start gap-4
                       ${isToday ? 'bg-[#e8f4f4]' : ''}`}>
                  <div className="shrink-0 text-center w-12">
                    <p className={`font-mono text-xs font-bold uppercase
                      ${isToday ? 'text-[var(--color-teal)]' : 'text-[var(--color-muted)]'}`}>
                      {day.day?.slice(0, 3)}
                    </p>
                    {done
                      ? <span className="text-xl">✅</span>
                      : isToday
                      ? <span className="text-xl">👈</span>
                      : <span className="text-xl">{activity.icon}</span>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[var(--color-ink)] text-sm">
                        {day.topic}
                      </p>
                      <span className={`text-[10px] font-mono px-2 py-0.5
                                        rounded-lg border font-semibold
                        ${isToday
                          ? 'border-[var(--color-teal)] text-[var(--color-teal)] bg-white'
                          : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                        {day.minutes}m · {activity.label}
                      </span>
                    </div>
                    {day.subtopics?.length > 0 && (
                      <p className="text-xs text-[var(--color-muted)] mt-1">
                        {day.subtopics.join(' · ')}
                      </p>
                    )}
                    {day.tip && (
                      <p className="text-xs text-[var(--color-teal)] mt-1 italic">
                        💡 {day.tip}
                      </p>
                    )}
                  </div>

                  {isToday && !done && (
                    <button
                      onClick={() => navigate(activity.path)}
                      className="shrink-0 btn-primary px-4 py-2 text-xs"
                    >
                      Start →
                    </button>
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