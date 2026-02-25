import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import WelcomeBanner from '../components/WelcomeBanner'
import AppRating from '../components/AppRating'

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <>
      {/* ── WELCOME BANNER (logged in users only) ── */}
      {user && (
        <div className="max-w-7xl mx-auto px-6 pt-8">
          <WelcomeBanner />
        </div>
      )}

      {/* ── HERO ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 border-b-2 border-[var(--color-ink)]"
               style={{ minHeight: user ? 'auto' : 'calc(100vh - 66px)' }}>

        {/* Left */}
        <div className="flex flex-col justify-center px-8 sm:px-16 py-16 border-r-2 border-[var(--color-ink)]">
          <p className="font-mono text-xs tracking-widest uppercase
                        text-[var(--color-gold)] mb-5 flex items-center gap-3">
            <span className="block w-8 h-px bg-[var(--color-gold)]" />
            AI-Powered Mathematics
          </p>

          <h1 className="font-serif font-black leading-none tracking-tighter"
              style={{ fontSize: 'clamp(46px, 5vw, 72px)' }}>
            Learn maths<br />
            the{' '}
            <em className="not-italic font-light text-[var(--color-teal)]">smart</em>
            <br />way.
          </h1>

          <p className="text-[var(--color-muted)] text-lg leading-relaxed
                        max-w-md mt-6 mb-10">
            Solve any equation instantly. Learn from the world's best engineering
            mathematics textbooks. Powered by AI — built for secondary school
            and university students in Nigeria and beyond.
          </p>

          <div className="flex gap-3 flex-wrap">
            <button onClick={() => navigate('/solve')} className="btn-primary">
              🔢 Open Solver
            </button>
            <button onClick={() => navigate('/teach')} className="btn-secondary">
              📖 Start Learning
            </button>
          </div>
        </div>

        {/* Right — dark panel */}
        <div className="bg-[var(--color-ink)] flex items-center justify-center
                        p-8 sm:p-16 relative overflow-hidden">
          {/* floating symbols background */}
          <p className="absolute font-mono text-sm text-white/[0.04] w-[200%]
                        leading-[3] top-0 -left-5
                        animate-[drift_20s_linear_infinite] pointer-events-none
                        whitespace-pre-wrap">
            {Array(10).fill('∑ ∫ √ π ∞ ∂ ∇ Δ × ÷ ≈ ≠ ≤ ≥ ∈ ⊂  ').join('')}
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-9
                          w-full max-w-sm z-10">
            <p className="font-mono text-[10px] tracking-widest uppercase
                          text-white/30 mb-4">
              Live Example
            </p>
            <div className="font-mono text-2xl text-white mb-5 flex items-center gap-2">
              ∫ x² dx
              <span className="inline-block w-0.5 h-6 bg-[var(--color-gold)]
                               animate-[blink_1s_step-end_infinite]" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4
                            font-mono text-sm text-[var(--color-gold-light)]
                            text-center">
              = x³/3 + C
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="bg-[var(--color-ink)] py-20 px-6 sm:px-10">
        <h2 className="font-serif font-black text-center text-white tracking-tight"
            style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>
          Built for{' '}
          <em className="not-italic font-light text-[var(--color-gold-light)]">serious</em>{' '}
          students.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6
                        max-w-5xl mx-auto mt-12">
          {[
            {
              icon: '🧠',
              title: 'AI Tutor',
              desc: 'Powered by Groq LLaMA 4 — explains every topic step-by-step in language students can actually understand.',
            },
            {
              icon: '🔣',
              title: 'Full Symbol Calculator',
              desc: 'Every mathematical symbol at your fingertips — arithmetic, surds, bearings, integrals, Greek letters and more.',
            },
            {
              icon: '📐',
              title: 'Complete Curriculum',
              desc: 'Covers SS1–SS3 fully — all the way to university Laplace Transforms and Differential Equations.',
            },
            {
              icon: '📝',
              title: 'Past Questions',
              desc: 'Real WAEC, NECO and JAMB past questions from 1998 to present with full worked solutions from Euler.',
            },
            {
              icon: '🖥️',
              title: 'CBT Mode',
              desc: 'Timed exam simulation with auto-grading, topic filters, difficulty levels and a full performance report.',
            },
            {
              icon: '📊',
              title: 'Progress Tracking',
              desc: 'Track weak topics, accuracy, streaks and practice history — all in one personalised dashboard.',
            },
          ].map(f => (
            <div key={f.title}
                 className="p-8 border border-white/10 rounded-2xl
                            hover:border-white/30 transition-colors duration-200">
              <span className="text-4xl block mb-4">{f.icon}</span>
              <h3 className="font-serif text-xl text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-6 sm:px-10 bg-[var(--color-paper)]
                          border-b-2 border-[var(--color-ink)]">
        <div className="max-w-4xl mx-auto">
          <p className="font-mono text-xs tracking-widest uppercase
                        text-[var(--color-gold)] mb-3 flex items-center gap-3">
            <span className="block w-6 h-px bg-[var(--color-gold)]" />
            How It Works
          </p>
          <h2 className="font-serif font-black tracking-tight mb-12"
              style={{ fontSize: 'clamp(28px, 3.5vw, 48px)' }}>
            Three steps to mastery.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Learn with Euler',
                desc:  'Pick any topic and chat with Euler — your AI tutor. He explains clearly, answers follow-up questions, and adapts to your level.',
                icon:  '📚',
              },
              {
                step: '02',
                title: 'Practice & Test',
                desc:  'Take timed CBT exams or practice sessions. Euler generates questions, grades your answers and explains every mistake.',
                icon:  '🎯',
              },
              {
                step: '03',
                title: 'Track & Improve',
                desc:  'Your dashboard shows exactly which topics need work. Focus your revision where it matters most before the exam.',
                icon:  '📈',
              },
            ].map(s => (
              <div key={s.step} className="flex gap-4">
                <div className="shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-ink)]
                                  flex items-center justify-center
                                  font-mono text-xs text-[var(--color-gold)] font-bold">
                    {s.step}
                  </div>
                </div>
                <div>
                  <div className="text-2xl mb-2">{s.icon}</div>
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

      {/* ── CTA ── */}
      <section className="py-20 px-6 sm:px-10 bg-[var(--color-teal)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif font-black text-white tracking-tight mb-4"
              style={{ fontSize: 'clamp(28px, 3.5vw, 48px)' }}>
            Ready to ace your exams?
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Join thousands of students already using MathGenius to prepare
            for WAEC, NECO and JAMB.
          </p>
          {user ? (
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => navigate('/teach')}
                      className="bg-white text-[var(--color-teal)] font-bold
                                 px-8 py-3.5 rounded-2xl hover:bg-[var(--color-cream)]
                                 transition-all text-sm">
                📚 Continue Learning
              </button>
              <button onClick={() => navigate('/cbt')}
                      className="bg-[var(--color-ink)] text-white font-bold
                                 px-8 py-3.5 rounded-2xl hover:opacity-90
                                 transition-all text-sm">
                🖥️ Take a CBT Exam
              </button>
            </div>
          ) : (
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => navigate('/login')}
                      className="bg-white text-[var(--color-teal)] font-bold
                                 px-8 py-3.5 rounded-2xl hover:bg-[var(--color-cream)]
                                 transition-all text-sm">
                🚀 Get Started Free
              </button>
              <button onClick={() => navigate('/solve')}
                      className="bg-[var(--color-ink)] text-white font-bold
                                 px-8 py-3.5 rounded-2xl hover:opacity-90
                                 transition-all text-sm">
                🔢 Try the Solver
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── RATING (logged in users only) ── */}
      {user && (
        <div className="max-w-md mx-auto px-6 py-12">
          <AppRating context="home" />
        </div>
      )}
    </>
  )
}