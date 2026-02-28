import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState, useRef } from 'react'
import { askTutor } from '../services/api'
import { ExplanationBody } from '../utils/RenderMath'

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI Explanations',
    desc: 'Ask Euler — our AI tutor — to explain any maths concept in simple terms, step by step.',
  },
  {
    icon: '🖥️',
    title: 'CBT Simulations',
    desc: 'Practice with real WAEC, NECO and JAMB past questions in a timed exam environment.',
  },
  {
    icon: '📊',
    title: 'Topic Mastery',
    desc: 'See exactly which topics you\'re strong or weak in, with visual progress tracking.',
  },
  {
    icon: '🔥',
    title: 'Streak & XP System',
    desc: 'Earn XP for every session, maintain daily streaks and climb the leaderboard.',
  },
  {
    icon: '📅',
    title: 'AI Study Planner',
    desc: 'Euler builds a personalised 7-day study plan based on your weak areas.',
  },
  {
    icon: '📐',
    title: 'Formula Sheet',
    desc: '70+ WAEC & JAMB formulas in one searchable reference — always at your fingertips.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Chisom A.',
    school: 'Lagos State',
    text: 'I went from failing maths to scoring 87% in my WAEC mock after using MathGenius for 3 weeks.',
    emoji: '🌟',
  },
  {
    name: 'Emeka T.',
    school: 'Abuja',
    text: 'The CBT practice is exactly like the real JAMB exam. The AI explanations are better than my teacher!',
    emoji: '🚀',
  },
  {
    name: 'Fatima B.',
    school: 'Kano State',
    text: 'I love the streak system — it keeps me studying every day. My accuracy jumped from 45% to 76%.',
    emoji: '🔥',
  },
]

const MAX_FREE = 5

const DEMO_TOPICS = [
  'Quadratic Equations', 'Differentiation', 'Trigonometry',
  'Probability', 'Logarithms',
]

const DEMO_STARTERS = [
  'Explain quadratic equations',
  'What is differentiation?',
  'How do I calculate probability?',
  'Simplify: log(100) + log(10)',
  'Solve: 2x + 5 = 11',
]

function LandingChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [used, setUsed] = useState(0)
  const [topic, setTopic] = useState('General Mathematics')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading || used >= MAX_FREE) return
    setInput('')
    const newUsed = used + 1
    setUsed(newUsed)
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    setMessages(prev => [...prev, { role: 'assistant', loading: true }])
    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content || '' }))
      const res = await askTutor(msg, topic, 'secondary', history)
      const reply = res.data.response || res.data.answer || ''
      setMessages(prev => [...prev.filter(m => !m.loading), { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [
        ...prev.filter(m => !m.loading),
        { role: 'assistant', content: '⚠️ Could not connect. Make sure the backend is running.' },
      ])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  const limitReached = used >= MAX_FREE
  const remaining = MAX_FREE - used

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-[var(--color-teal)] rounded-t-2xl px-5 py-4
                      flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center
                          justify-center font-serif font-black text-white text-lg">E</div>
          <div>
            <p className="font-serif font-bold text-white">Euler — AI Maths Tutor</p>
            <p className="text-white/70 text-xs">
              {limitReached ? 'Sign up for unlimited access' : `${remaining} free question${remaining !== 1 ? 's' : ''} remaining`}
            </p>
          </div>
        </div>
        <Link to="/signup"
          className="text-xs font-bold text-white/80 hover:text-white
                     border border-white/30 rounded-xl px-3 py-1.5 transition-colors">
          Sign up free →
        </Link>
      </div>

      {/* Topic chips */}
      <div className="bg-white border-x border-[var(--color-border)]
                      px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none">
        {DEMO_TOPICS.map(t => (
          <button key={t} onClick={() => setTopic(t)}
            className={`shrink-0 px-3 py-1 rounded-lg text-[11px] font-semibold
                        border transition-all
              ${topic === t
                ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-teal)]'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="bg-[var(--color-paper)] border-x border-[var(--color-border)]
                      h-72 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <div className="text-5xl">🧮</div>
            <p className="font-serif font-bold text-[var(--color-ink)] text-lg">
              Try Euler — no account needed
            </p>
            <p className="text-sm text-[var(--color-muted)] max-w-xs">
              Ask any WAEC, JAMB or NECO maths question and get a full step-by-step explanation.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {DEMO_STARTERS.map(q => (
                <button key={q} onClick={() => handleSend(q)}
                  className="text-xs px-3 py-1.5 bg-white border border-[var(--color-border)]
                             rounded-full text-[var(--color-ink)] hover:bg-[var(--color-teal)]
                             hover:text-white hover:border-[var(--color-teal)] transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-[var(--color-teal)] flex items-center
                              justify-center text-white text-xs font-bold shrink-0 mt-0.5">E</div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm
              ${msg.role === 'user'
                ? 'bg-[var(--color-ink)] text-white rounded-br-sm'
                : 'bg-white border border-[var(--color-border)] rounded-bl-sm'}`}>
              {msg.loading ? (
                <div className="flex gap-1 py-1">
                  {[0, 1, 2].map(j => (
                    <span key={j} className="w-1.5 h-1.5 rounded-full bg-[var(--color-teal)] animate-bounce"
                      style={{ animationDelay: `${j * 0.15}s` }} />
                  ))}
                </div>
              ) : msg.role === 'user' ? (
                <p>{msg.content}</p>
              ) : (
                <ExplanationBody text={msg.content} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input or CTA */}
      <div className="bg-white border-2 border-[var(--color-ink)] rounded-b-2xl
                      px-4 py-3">
        {limitReached ? (
          <div className="text-center py-2">
            <p className="text-sm font-semibold text-[var(--color-ink)] mb-3">
              You've used your 5 free questions! 🎉
            </p>
            <Link to="/signup"
              className="btn-primary px-6 py-2.5 text-sm justify-center inline-flex">
              🚀 Sign up free for unlimited access
            </Link>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleSend()}
              placeholder={`Ask about ${topic === 'General Mathematics' ? 'any maths topic' : topic}...`}
              className="flex-1 bg-[var(--color-paper)] border border-[var(--color-border)]
                         focus:border-[var(--color-teal)] rounded-xl px-3 py-2.5 text-sm
                         transition-colors"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-[var(--color-teal)] text-white
                         flex items-center justify-center disabled:opacity-40
                         hover:bg-[var(--color-ink)] transition-colors shrink-0">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : '➤'
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const STATS = [
  { value: '10,000+', label: 'Past Questions' },
  { value: '70+', label: 'Formulas' },
  { value: '3', label: 'Exam Types' },
  { value: '100%', label: 'Free to Start' },
]

export default function Landing() {
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
                       ${scrolled
          ? 'bg-[var(--color-paper)] border-b-2 border-[var(--color-ink)] shadow-sm'
          : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-serif font-black text-2xl tracking-tight">
            Math<span className="text-[var(--color-gold)]">Genius</span>
          </span>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn-primary px-5 py-2 text-sm">
                Go to App →
              </Link>
            ) : (
              <>
                <Link to="/login"
                  className="text-sm font-semibold text-[var(--color-ink)]
                             hover:text-[var(--color-teal)] transition-colors
                             hidden sm:block">
                  Sign In
                </Link>
                <Link to="/signup" className="btn-primary px-5 py-2 text-sm">
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[var(--color-teal)]/10
                          border border-[var(--color-teal)] rounded-full
                          px-4 py-2 text-sm font-mono text-[var(--color-teal)]
                          mb-6">
            🇳🇬 Built for Nigerian students
          </div>

          <h1 className="font-serif font-black text-5xl sm:text-6xl lg:text-7xl
                         tracking-tight leading-[1.05] mb-6">
            Ace Your{' '}
            <span className="text-[var(--color-teal)]">WAEC</span>
            {', '}
            <span className="text-[var(--color-gold)]">JAMB</span>
            {' & '}
            <span className="text-[var(--color-teal)]">NECO</span>
            {' '}Maths
          </h1>

          <p className="text-xl text-[var(--color-muted)] max-w-2xl mx-auto mb-10
                         leading-relaxed">
            Nigeria's most powerful AI maths tutor. Practice past questions,
            get instant explanations, track your progress and climb the leaderboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to="/signup"
              className="btn-primary px-8 py-4 text-base justify-center text-center">
              🚀 Start Studying Free
            </Link>
            <Link to="/formulas"
              className="btn-secondary px-8 py-4 text-base justify-center text-center">
              📐 View Formula Sheet
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {STATS.map(s => (
              <div key={s.label}
                className="bg-white border-2 border-[var(--color-border)]
                              rounded-2xl p-4 text-center">
                <div className="font-serif font-black text-3xl
                                text-[var(--color-teal)]">
                  {s.value}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest
                                text-[var(--color-muted)] mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO CHAT ─────────────────────────────────────── */}
      <section className="py-20 px-6 bg-[var(--color-cream)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="font-mono text-xs tracking-widest uppercase
                          text-[var(--color-gold)] mb-3 flex items-center
                          justify-center gap-3">
              <span className="block w-8 h-px bg-[var(--color-gold)]" />
              Try It Now — Free
              <span className="block w-8 h-px bg-[var(--color-gold)]" />
            </p>
            <h2 className="font-serif font-black text-4xl sm:text-5xl tracking-tight">
              Ask Euler anything
            </h2>
            <p className="text-[var(--color-muted)] mt-3 max-w-lg mx-auto">
              Get 5 free explanations right now — no sign up needed.
              Create a free account to unlock unlimited access.
            </p>
          </div>
          <LandingChat />
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-mono text-xs tracking-widest uppercase
                          text-[var(--color-gold)] mb-3 flex items-center
                          justify-center gap-3">
              <span className="block w-8 h-px bg-[var(--color-gold)]" />
              Features
              <span className="block w-8 h-px bg-[var(--color-gold)]" />
            </p>
            <h2 className="font-serif font-black text-4xl sm:text-5xl tracking-tight">
              Everything you need to pass
            </h2>
            <p className="text-[var(--color-muted)] mt-3 max-w-xl mx-auto">
              One platform for all your maths exam preparation — from learning
              concepts to full CBT simulations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div key={i}
                className="bg-[var(--color-cream)] border-2 border-[var(--color-border)]
                              rounded-2xl p-6 hover:border-[var(--color-teal)]
                              hover:shadow-md transition-all duration-200">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-serif font-bold text-lg
                               text-[var(--color-ink)] mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-mono text-xs tracking-widest uppercase
                          text-[var(--color-gold)] mb-3 flex items-center
                          justify-center gap-3">
              <span className="block w-8 h-px bg-[var(--color-gold)]" />
              How It Works
              <span className="block w-8 h-px bg-[var(--color-gold)]" />
            </p>
            <h2 className="font-serif font-black text-4xl sm:text-5xl tracking-tight">
              Simple. Powerful. Effective.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: '📝',
                title: 'Create your account',
                desc: 'Sign up free in seconds. No credit card needed.',
              },
              {
                step: '02',
                icon: '📚',
                title: 'Study with Euler',
                desc: 'Ask the AI tutor to explain any topic, then test yourself with real past questions.',
              },
              {
                step: '03',
                icon: '🏆',
                title: 'Track & improve',
                desc: 'See your weak topics, earn XP, maintain streaks and climb the leaderboard.',
              },
            ].map((s, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden sm:block absolute top-8 left-full
                                  w-full h-px bg-[var(--color-border)] z-0
                                  -translate-y-0.5" />
                )}
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--color-ink)]
                                  flex items-center justify-center text-3xl
                                  mx-auto mb-4">
                    {s.icon}
                  </div>
                  <div className="font-mono text-[10px] text-[var(--color-gold)]
                                  tracking-widest uppercase mb-2">
                    Step {s.step}
                  </div>
                  <h3 className="font-serif font-bold text-lg
                                 text-[var(--color-ink)] mb-2">
                    {s.title}
                  </h3>
                  <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────── */}
      <section className="py-20 px-6 bg-[var(--color-ink)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-mono text-xs tracking-widest uppercase
                          text-[var(--color-gold)] mb-3 flex items-center
                          justify-center gap-3">
              <span className="block w-8 h-px bg-[var(--color-gold)]" />
              Student Results
              <span className="block w-8 h-px bg-[var(--color-gold)]" />
            </p>
            <h2 className="font-serif font-black text-4xl sm:text-5xl
                           tracking-tight text-white">
              Students are passing
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i}
                className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="text-3xl mb-4">{t.emoji}</div>
                <p className="text-white/90 text-sm leading-relaxed mb-4 italic">
                  "{t.text}"
                </p>
                <div>
                  <p className="font-bold text-white text-sm">{t.name}</p>
                  <p className="text-white/50 text-xs font-mono">{t.school}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[var(--color-teal)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif font-black text-4xl sm:text-5xl
                         tracking-tight text-white mb-4">
            Ready to ace your exams?
          </h2>
          <p className="text-white/80 text-lg mb-10">
            Join thousands of students already using MathGenius to prepare
            for WAEC, JAMB and NECO.
          </p>
          <Link to="/signup"
            className="inline-flex items-center gap-2 bg-white
                       text-[var(--color-teal)] font-black font-serif
                       text-lg px-10 py-4 rounded-2xl
                       hover:bg-[var(--color-cream)] transition-colors
                       shadow-xl">
            🚀 Start Free Today
          </Link>
          <p className="text-white/50 text-xs mt-4 font-mono">
            No credit card required · Free forever
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="py-10 px-6 border-t-2 border-[var(--color-border)]
                          bg-[var(--color-paper)]">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center
                        justify-between gap-4">
          <div>
            <span className="font-serif font-black text-xl">
              Math<span className="text-[var(--color-gold)]">Genius</span>
            </span>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              AI-powered maths prep for Nigerian students
            </p>
          </div>
          <div className="flex gap-6 text-sm text-[var(--color-muted)]">
            <Link to="/formulas"
              className="hover:text-[var(--color-ink)] transition-colors">
              Formula Sheet
            </Link>
            <Link to="/login"
              className="hover:text-[var(--color-ink)] transition-colors">
              Sign In
            </Link>
            <Link to="/signup"
              className="hover:text-[var(--color-ink)] transition-colors">
              Sign Up
            </Link>
          </div>
          <p className="text-xs text-[var(--color-muted)] font-mono">
            © {new Date().getFullYear()} MathGenius
          </p>
        </div>
      </footer>
    </div>
  )
}