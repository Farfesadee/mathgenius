import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ExplanationBody } from '../utils/RenderMath'
import { API_BASE } from '../services/api'

// Cache wiki articles in localStorage to avoid re-fetching
function cacheGet(topic) {
    try { return JSON.parse(localStorage.getItem(`wiki_${topic}`)) } catch { return null }
}
function cacheSet(topic, data) {
    try { localStorage.setItem(`wiki_${topic}`, JSON.stringify({ ...data, _ts: Date.now() })) } catch { }
}

const RELATED_TOPICS = {
    'Quadratic Equations': ['Linear Equations', 'Polynomials', 'Functions'],
    'Differentiation': ['Integration', 'Limits', 'Logarithms'],
    'Integration': ['Differentiation', 'Area under Curves', 'Sequences and Series'],
    'Probability': ['Statistics', 'Permutation and Combination'],
    'Trigonometry': ['Bearings and Distances', 'Circle Theorems'],
}

export default function TopicWiki() {
    const { topic: rawTopic } = useParams()
    const topic = decodeURIComponent(rawTopic || '')
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!topic) return
        const cached = cacheGet(topic)
        // Use cache if < 24h old
        if (cached && Date.now() - cached._ts < 86400000) {
            setContent(cached.content)
            setLoading(false)
            return
        }
        fetchWiki()
    }, [topic])

    const fetchWiki = async () => {
        setLoading(true)
        setError(null)
        try {
            const base = import.meta.env.VITE_API_URL
            const res = await fetch(`${base}/teach/wiki/${encodeURIComponent(topic)}`)
            if (!res.ok) throw new Error('Failed')
            const data = await res.json()
            setContent(data.content)
            cacheSet(topic, data)
        } catch {
            setError('⚠️ Could not load wiki. Make sure the backend is running.')
        }
        setLoading(false)
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const related = RELATED_TOPICS[topic] || []

    return (
        <div className="max-w-3xl mx-auto px-6 py-10">

            {/* Header */}
            <div className="mb-8">
                <p className="font-mono text-xs tracking-widest uppercase
                      text-[var(--color-gold)] mb-2 flex items-center gap-3">
                    <span className="block w-6 h-px bg-[var(--color-gold)]" />
                    Topic Wiki
                </p>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <h1 className="font-serif font-black text-4xl sm:text-5xl tracking-tight">
                        📖 {topic}
                    </h1>
                    <div className="flex gap-2">
                        <button onClick={handleCopy}
                            className="btn-secondary px-4 py-2 text-xs">
                            {copied ? '✅ Copied' : '📋 Copy'}
                        </button>
                        <button onClick={fetchWiki} disabled={loading}
                            className="btn-secondary px-4 py-2 text-xs disabled:opacity-50">
                            🔄 Refresh
                        </button>
                    </div>
                </div>
                <p className="text-[var(--color-muted)] mt-2 text-sm">
                    AI-generated study notes · WAEC / JAMB / NECO level · cached locally
                </p>
            </div>

            {/* Related topics */}
            {related.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-6">
                    <span className="text-xs text-[var(--color-muted)] font-mono self-center">Related:</span>
                    {related.map(t => (
                        <Link key={t} to={`/wiki/${encodeURIComponent(t)}`}
                            className="text-xs px-3 py-1 bg-[var(--color-cream)] border border-[var(--color-border)]
                         rounded-full text-[var(--color-ink)] hover:border-[var(--color-teal)]
                         hover:text-[var(--color-teal)] transition-all">
                            {t}
                        </Link>
                    ))}
                </div>
            )}

            {/* Content */}
            {loading && (
                <div className="card bg-white p-12 text-center">
                    <div className="w-10 h-10 border-4 border-[var(--color-teal)] border-t-transparent
                          rounded-full animate-spin mx-auto mb-4" />
                    <p className="font-mono text-sm text-[var(--color-muted)]">
                        Euler is writing your study notes...
                    </p>
                </div>
            )}

            {error && (
                <div className="card bg-white p-8 text-center text-[var(--color-muted)]">{error}</div>
            )}

            {!loading && !error && content && (
                <div className="card bg-white overflow-hidden">
                    <div className="bg-[var(--color-ink)] px-6 py-3 flex items-center justify-between">
                        <span className="font-serif font-bold text-white">Study Notes</span>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                            <span className="text-white/60 text-xs font-mono">AI-generated</span>
                        </div>
                    </div>
                    <div className="p-6 sm:p-8 prose prose-sm max-w-none
                          text-[var(--color-ink)] leading-relaxed">
                        <ExplanationBody text={content} />
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6 flex-wrap">
                <Link to={`/practice?topic=${encodeURIComponent(topic)}&auto=true`}
                    className="btn-primary px-5 py-2.5 text-sm">
                    ⚡ Quick Drill on {topic.split(' ').slice(0, 2).join(' ')}
                </Link>
                <Link to="/teach" className="btn-secondary px-5 py-2.5 text-sm">
                    📚 Ask Euler About It
                </Link>
            </div>
        </div>
    )
}
