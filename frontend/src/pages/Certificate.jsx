import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUserStats, xpProgress } from '../lib/stats'
import { getDashboardStats } from '../lib/progress'

const MILESTONE_CONFIG = [
    { key: 'streak_7', icon: '🔥', label: '7-Day Streak', check: s => (s?.streak_current || 0) >= 7 },
    { key: 'streak_30', icon: '👑', label: '30-Day Streak', check: s => (s?.streak_current || 0) >= 30 },
    { key: 'questions_50', icon: '📝', label: '50 Questions Done', check: (_, d) => (d?.totalAttempted || 0) >= 50 },
    { key: 'questions_100', icon: '🏆', label: '100 Questions Done', check: (_, d) => (d?.totalAttempted || 0) >= 100 },
    { key: 'accuracy_80', icon: '💯', label: '80% Accuracy', check: (_, d) => (d?.accuracy || 0) >= 80 },
    { key: 'topics_10', icon: '📚', label: '10 Topics Studied', check: (_, d) => (d?.topicsStudied || 0) >= 10 },
]

export default function Certificate() {
    const { user, profile } = useAuth()
    const [xpStats, setXpStats] = useState(null)
    const [dashStats, setDashStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) return
        Promise.all([getUserStats(user.id), getDashboardStats(user.id)]).then(([xp, dash]) => {
            setXpStats(xp)
            setDashStats(dash)
            setLoading(false)
        })
    }, [user])

    const earned = MILESTONE_CONFIG.filter(m => {
        try { return m.check(xpStats, dashStats) } catch { return false }
    })

    const handlePrint = () => window.print()

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-16 text-center">
                <div className="w-10 h-10 border-4 border-[var(--color-teal)] border-t-transparent
                        rounded-full animate-spin mx-auto" />
            </div>
        )
    }

    const { level } = xpProgress(xpStats?.xp || 0)
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    return (
        <div className="max-w-3xl mx-auto px-6 py-10">

            {/* Page header */}
            <div className="mb-8 flex items-end justify-between flex-wrap gap-4 print:hidden">
                <div>
                    <p className="font-mono text-xs tracking-widest uppercase
                        text-[var(--color-gold)] mb-2 flex items-center gap-3">
                        <span className="block w-6 h-px bg-[var(--color-gold)]" />
                        Achievements
                    </p>
                    <h1 className="font-serif font-black text-5xl tracking-tight">🏆 Certificate</h1>
                    <p className="text-[var(--color-muted)] mt-1 text-sm">
                        Your earned milestones and achievement certificate
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handlePrint} className="btn-primary px-5 py-2.5 text-sm">
                        🖨️ Print Certificate
                    </button>
                    <Link to="/dashboard" className="btn-secondary px-5 py-2.5 text-sm">← Dashboard</Link>
                </div>
            </div>

            {/* Milestones earned */}
            {earned.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 print:hidden">
                    {earned.map(m => (
                        <div key={m.key}
                            className="card bg-white p-5 text-center hover:shadow-md transition-all">
                            <div className="text-4xl mb-2">{m.icon}</div>
                            <p className="font-semibold text-sm text-[var(--color-ink)]">{m.label}</p>
                            <p className="text-[10px] text-green-600 font-mono uppercase mt-1">✅ Earned</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card bg-white p-8 text-center mb-8 print:hidden">
                    <p className="text-[var(--color-muted)]">
                        Keep practising to earn milestone badges! Complete 7-day streak, 50+ questions, etc.
                    </p>
                </div>
            )}

            {/* The printable certificate */}
            <div className="card overflow-hidden border-4 border-[var(--color-gold)] print:border-yellow-400">
                {/* Top ribbon */}
                <div className="bg-[var(--color-gold)] px-8 py-4 text-center">
                    <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-ink)]/70">
                        Certificate of Achievement
                    </p>
                </div>

                <div className="bg-white px-10 py-10 text-center space-y-6">
                    {/* Award text */}
                    <div>
                        <p className="text-[var(--color-muted)] text-sm font-mono uppercase tracking-widest">
                            This certifies that
                        </p>
                        <h2 className="font-serif font-black text-5xl mt-2 text-[var(--color-ink)]">
                            {profile?.full_name || 'Student'}
                        </h2>
                        <p className="text-[var(--color-muted)] mt-1">{user?.email}</p>
                    </div>

                    {/* Achievement text */}
                    <div className="border-t-2 border-b-2 border-[var(--color-gold)] py-6 mx-8">
                        <p className="text-[var(--color-ink)] leading-relaxed">
                            has demonstrated outstanding dedication to Mathematics preparation,
                            achieving <strong>Level {level}</strong> with&nbsp;
                            <strong>{(xpStats?.xp || 0).toLocaleString()} XP</strong>,
                            a <strong>{xpStats?.streak_current || 0}-day study streak</strong>, and answering&nbsp;
                            <strong>{dashStats?.totalAttempted || 0} questions</strong> with&nbsp;
                            <strong>{dashStats?.accuracy || 0}% accuracy</strong>.
                        </p>
                    </div>

                    {/* Milestone icons */}
                    {earned.length > 0 && (
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-2">
                                Milestones Achieved
                            </p>
                            <p className="text-3xl space-x-2">
                                {earned.map(m => m.icon).join('  ')}
                            </p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-end justify-between mt-6 pt-6 px-4
                          border-t border-[var(--color-border)]">
                        <div className="text-left">
                            <div className="font-serif font-black text-xl text-[var(--color-teal)]">MathGenius</div>
                            <p className="text-[10px] text-[var(--color-muted)] font-mono">mathgenius.app</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[var(--color-ink)] font-medium text-sm">{today}</p>
                            <p className="text-[10px] text-[var(--color-muted)] font-mono">Date Issued</p>
                        </div>
                    </div>
                </div>

                {/* Bottom ribbon */}
                <div className="bg-[var(--color-gold)] px-8 py-3 flex items-center justify-center">
                    {'⭐'.repeat(Math.min(5, level))}
                </div>
            </div>
        </div>
    )
}
