import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { xpProgress } from '../lib/stats'

const API = import.meta.env.VITE_API_URL

async function fetchPublicProfile(userId) {
    const res = await fetch(`${API}/tracking/public-profile/${userId}`)
    if (!res.ok) throw new Error('Not found')
    return res.json()
}

const LEVEL_TITLES = ['', 'Novice', 'Learner', 'Student', 'Scholar', 'Expert', 'Master', 'Champion', 'Legend', 'Genius', 'Grand Master']

export default function ShareProfile() {
    const { userId } = useParams()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchPublicProfile(userId)
            .then(setData)
            .catch(() => setError('Profile not found or sharing is unavailable.'))
            .finally(() => setLoading(false))
    }, [userId])

    if (loading) return (
        <div className="max-w-xl mx-auto px-6 py-16 text-center">
            <div className="w-10 h-10 border-4 border-[var(--color-teal)] border-t-transparent
                      rounded-full animate-spin mx-auto" />
        </div>
    )

    if (error) return (
        <div className="max-w-xl mx-auto px-6 py-16 text-center">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="font-serif font-bold text-2xl mb-2">Profile Not Found</h2>
            <p className="text-[var(--color-muted)]">{error}</p>
            <Link to="/" className="btn-primary mt-6 inline-flex px-6 py-3 text-sm">← Go Home</Link>
        </div>
    )

    const { level } = xpProgress(data.xp || 0)
    const title = LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)] || 'Student'
    const colorClass = data.accuracy >= 75 ? 'bg-green-500' : data.accuracy >= 50 ? 'bg-[var(--color-teal)]' : 'bg-orange-500'

    return (
        <div className="max-w-xl mx-auto px-6 py-10">
            {/* Powered by banner */}
            <div className="text-center mb-6">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                    Powered by
                </span>
                <div className="font-serif font-black text-2xl text-[var(--color-teal)]">MathGenius</div>
            </div>

            {/* Profile card */}
            <div className="card overflow-hidden">
                {/* Header */}
                <div className={`${colorClass} px-8 py-8 text-center text-white`}>
                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center
                          font-serif font-black text-3xl mx-auto mb-3">
                        {(data.name || 'S')[0].toUpperCase()}
                    </div>
                    <h1 className="font-serif font-black text-3xl">{data.name || 'Student'}</h1>
                    {data.school && <p className="text-white/70 text-sm mt-1">{data.school}</p>}
                    <p className="text-white/80 font-mono uppercase text-xs tracking-widest mt-2">
                        {title} · Level {level}
                    </p>
                </div>

                {/* Stats */}
                <div className="bg-white p-6 grid grid-cols-2 gap-4">
                    {[
                        { icon: '⚡', label: 'XP Earned', value: (data.xp || 0).toLocaleString() },
                        { icon: '🔥', label: 'Study Streak', value: `${data.streak || 0} days` },
                        { icon: '📝', label: 'Questions Done', value: data.total_questions || 0 },
                        { icon: '🎯', label: 'Accuracy', value: `${data.accuracy || 0}%` },
                    ].map(s => (
                        <div key={s.label} className="bg-[var(--color-cream)] rounded-2xl p-4 text-center">
                            <div className="text-2xl mb-1">{s.icon}</div>
                            <div className="font-serif font-black text-xl text-[var(--color-ink)]">{s.value}</div>
                            <div className="text-[10px] font-mono uppercase text-[var(--color-muted)] mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Top topics */}
                {data.top_topics?.length > 0 && (
                    <div className="px-6 pb-6">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-3">
                            Top Topics
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {data.top_topics.map(t => (
                                <span key={t.topic || t}
                                    className="text-xs px-3 py-1.5 bg-green-50 border border-green-200
                             text-green-700 rounded-full font-medium">
                                    ✅ {t.topic || t}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* CTA */}
                <div className="bg-[var(--color-cream)] px-6 py-5 text-center">
                    <p className="text-sm text-[var(--color-muted)] mb-3">
                        Want to track your own progress?
                    </p>
                    <Link to="/signup"
                        className="btn-primary px-6 py-2.5 text-sm inline-flex justify-center">
                        🚀 Join MathGenius Free
                    </Link>
                </div>
            </div>
        </div>
    )
}
