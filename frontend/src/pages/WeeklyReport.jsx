import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getUserStats } from '../lib/stats'
import { getDashboardStats } from '../lib/progress'

function getWeekBounds() {
    const now = new Date()
    const mon = new Date(now)
    mon.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
    mon.setHours(0, 0, 0, 0)
    return { from: mon.toISOString(), label: mon.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) }
}

function GradeRing({ pct }) {
    const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : pct >= 40 ? '#f97316' : '#ef4444'
    const r = 54, circ = 2 * Math.PI * r
    const dash = ((pct / 100) * circ).toFixed(1)
    return (
        <svg width="140" height="140" className="mx-auto">
            <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
            <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
                strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4} strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease' }} />
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
                fontFamily="Georgia,serif" fontWeight="900" fontSize="26" fill="#1a1a1a">
                {pct}%
            </text>
            <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle"
                fontSize="10" fill="#6b7280" fontFamily="monospace">
                Accuracy
            </text>
        </svg>
    )
}

export default function WeeklyReport() {
    const { user, profile } = useAuth()
    const [stats, setStats] = useState(null)
    const [xpStats, setXpStats] = useState(null)
    const [weekSessions, setWeekSessions] = useState([])
    const [loading, setLoading] = useState(true)

    const { from: weekStart, label: weekLabel } = getWeekBounds()

    useEffect(() => {
        if (user) loadAll()
    }, [user])

    const loadAll = async () => {
        const [dash, xp] = await Promise.all([
            getDashboardStats(user.id),
            getUserStats(user.id),
        ])
        setStats(dash)
        setXpStats(xp)

        // Fetch this week's CBT sessions
        const { data } = await supabase
            .from('cbt_sessions')
            .select('*')
            .eq('user_id', user.id)
            .gte('completed_at', weekStart)
            .order('completed_at', { ascending: false })
        setWeekSessions(data || [])
        setLoading(false)
    }

    const handlePrint = () => window.print()

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto px-6 py-16 text-center">
                <div className="w-10 h-10 border-4 border-[var(--color-teal)] border-t-transparent
                        rounded-full animate-spin mx-auto mb-4" />
                <p className="font-mono text-sm text-[var(--color-muted)]">Generating your report...</p>
            </div>
        )
    }

    const weekCorrect = weekSessions.reduce((a, s) => a + (s.total_questions ? Math.round(s.score / 100 * s.total_questions) : 0), 0)
    const weekAttempted = weekSessions.reduce((a, s) => a + (s.total_questions || 0), 0)
    const weekAccuracy = weekAttempted > 0 ? Math.round((weekCorrect / weekAttempted) * 100) : 0
    const weekXP = weekSessions.length * 20   // estimate
    const bestScore = weekSessions.length > 0 ? Math.max(...weekSessions.map(s => s.score)) : 0

    const grade = weekAccuracy >= 80 ? 'A' : weekAccuracy >= 65 ? 'B' : weekAccuracy >= 50 ? 'C' : weekAccuracy >= 40 ? 'D' : 'F'
    const gradeMsg = {
        A: 'Outstanding performance this week! 🎉',
        B: 'Great work! Keep pushing for that A grade.',
        C: 'Decent week. Focus on your weak topics to improve.',
        D: 'You need more practice. Book daily drills.',
        F: 'Tough week — but every master was once a beginner. Keep going!',
    }

    return (
        <div className="max-w-3xl mx-auto px-6 py-10 print:p-8 print:max-w-none">

            {/* Print-only header */}
            <div className="hidden print:block text-center mb-8">
                <h1 className="font-serif font-black text-4xl">MathGenius</h1>
                <p className="text-gray-500 text-sm mt-1">Weekly Progress Report</p>
            </div>

            {/* Page header */}
            <div className="mb-8 flex items-end justify-between flex-wrap gap-4 print:hidden">
                <div>
                    <p className="font-mono text-xs tracking-widest uppercase
                        text-[var(--color-gold)] mb-2 flex items-center gap-3">
                        <span className="block w-6 h-px bg-[var(--color-gold)]" />
                        Weekly Report · w/c {weekLabel}
                    </p>
                    <h1 className="font-serif font-black text-5xl tracking-tight">📊 Report Card</h1>
                </div>
                <div className="flex gap-3">
                    <button onClick={handlePrint}
                        className="btn-primary px-5 py-2.5 text-sm">
                        🖨️ Print / Save PDF
                    </button>
                    <Link to="/dashboard" className="btn-secondary px-5 py-2.5 text-sm">← Dashboard</Link>
                </div>
            </div>

            {/* Report card */}
            <div className="card overflow-hidden">
                {/* Header band */}
                <div className="bg-[var(--color-teal)] px-8 py-6 text-white print:bg-teal-600">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <p className="font-mono text-xs text-white/70 uppercase tracking-widest mb-1">Student</p>
                            <p className="font-serif font-black text-3xl">{profile?.full_name || 'Student'}</p>
                            <p className="text-white/70 text-sm mt-0.5">{user?.email}</p>
                        </div>
                        <div className="text-right">
                            <div className="font-serif font-black text-7xl leading-none">{grade}</div>
                            <p className="text-white/70 text-xs font-mono uppercase mt-1">Week Grade</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 space-y-8">

                    {/* Grade message */}
                    <p className="text-center text-[var(--color-ink)] font-medium text-lg italic">
                        "{gradeMsg[grade]}"
                    </p>

                    {/* Accuracy ring + stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
                        <GradeRing pct={weekAttempted > 0 ? weekAccuracy : stats?.accuracy || 0} />
                        <div className="space-y-4">
                            {[
                                { label: 'CBT Sessions This Week', value: weekSessions.length, icon: '🖥️' },
                                { label: 'Questions Attempted', value: weekAttempted || stats?.totalAttempted || 0, icon: '📝' },
                                { label: 'Best Score This Week', value: `${bestScore}%`, icon: '🏆' },
                                { label: 'Current Streak', value: `${xpStats?.streak_current || 0} days`, icon: '🔥' },
                                { label: 'Total XP', value: (xpStats?.xp || 0).toLocaleString(), icon: '⚡' },
                            ].map(s => (
                                <div key={s.label} className="flex items-center justify-between
                                              border-b border-[var(--color-border)] pb-2">
                                    <span className="text-sm text-[var(--color-muted)]">{s.icon} {s.label}</span>
                                    <span className="font-serif font-black text-lg text-[var(--color-ink)]">{s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weak topics */}
                    {stats?.weakTopics?.length > 0 && (
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-widest
                             text-[var(--color-muted)] mb-3">Areas to Improve</p>
                            <div className="space-y-2">
                                {stats.weakTopics.slice(0, 4).map(t => {
                                    const pct = t.questions_attempted > 0
                                        ? Math.round((t.questions_correct / t.questions_attempted) * 100) : 0
                                    return (
                                        <div key={t.topic} className="flex items-center gap-3">
                                            <span className="text-sm text-[var(--color-ink)] flex-1 truncate">{t.topic}</span>
                                            <div className="w-24 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                                                <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="text-sm font-bold text-red-500 w-10 text-right">{pct}%</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Strong topics */}
                    {stats?.strongTopics?.length > 0 && (
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-widest
                             text-[var(--color-muted)] mb-3">Your Strongest Topics</p>
                            <div className="flex flex-wrap gap-2">
                                {stats.strongTopics.slice(0, 5).map(t => (
                                    <span key={t.topic}
                                        className="text-xs px-3 py-1.5 bg-green-50 border border-green-200
                               text-green-700 rounded-full font-medium">
                                        ✅ {t.topic}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="border-t-2 border-[var(--color-border)] pt-6 text-center">
                        <p className="font-mono text-xs text-[var(--color-muted)]">
                            Generated by MathGenius · {new Date().toLocaleDateString('en-GB', {
                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                            })}
                        </p>
                        <p className="text-xs text-[var(--color-muted)] mt-1">
                            mathgenius.app · AI-powered WAEC, JAMB & NECO preparation
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
