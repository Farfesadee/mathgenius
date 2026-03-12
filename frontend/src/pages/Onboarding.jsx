import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to MathGenius! 🎉',
    subtitle: 'Your personal AI mathematics tutor',
    content: 'Euler is here to help you master mathematics — from basic arithmetic to university-level calculus. Let\'s get you set up in 3 quick steps.',
    icon: '🧮',
  },
  {
    id: 'level',
    title: 'What level are you? 📚',
    subtitle: 'We\'ll personalise your experience',
    content: null,
    icon: '🎓',
  },
  {
    id: 'tour',
    title: 'Here\'s what you can do 🚀',
    subtitle: 'Quick tour of MathGenius',
    content: null,
    icon: '⚡',
  },
  {
    id: 'ready',
    title: 'You\'re all set! 🌟',
    subtitle: 'Let\'s start learning',
    content: 'Euler is ready to help you tackle any mathematics problem. Start by exploring a topic or solving a question.',
    icon: '🏁',
  },
]

const FEATURES = [
  { icon: '⚙️', title: 'Solve', desc: 'Solve equations, differentiate and integrate with full step-by-step working' },
  { icon: '📚', title: 'Teach', desc: 'Learn any topic with Euler — your AI tutor explains everything clearly' },
  { icon: '🎯', title: 'Practice', desc: 'Test yourself with questions Euler generates and grades for you' },
  { icon: '📝', title: 'Past Questions', desc: 'Practice real WAEC, NECO and JAMB questions with worked solutions' },
  { icon: '🔖', title: 'Bookmarks', desc: 'Save important solutions and explanations for exam revision' },
  { icon: '📊', title: 'Dashboard', desc: 'Track your progress, see weak topics and improve over time' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { updateProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [level, setLevel] = useState('')

  const handleNext = async () => {
    // Store level in sessionStorage — will be saved after signup
    if (step === 1 && level) {
      sessionStorage.setItem('onboarding_level', level)
    }
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      // Mark onboarding as done so returning visitors skip it
      localStorage.setItem('mg_onboarding_done', '1')
      navigate('/signup')
    }
  }

  const current = STEPS[step]
  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-[var(--color-paper)] flex items-center
                    justify-center px-4 py-10">
      <div className="w-full max-w-lg">

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-xs font-mono
                          text-[var(--color-muted)] mb-2">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-teal)] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="card overflow-hidden">

          {/* Header */}
          <div className="bg-[var(--color-ink)] px-8 py-8 text-center">
            <div className="text-6xl mb-4">{current.icon}</div>
            <h1 className="font-serif font-black text-3xl text-white leading-tight">
              {current.title}
            </h1>
            <p className="text-white/60 mt-2 text-sm">{current.subtitle}</p>
          </div>

          <div className="bg-white p-8">

            {/* Step 0 — Welcome */}
            {step === 0 && (
              <div className="text-center space-y-4">
                <p className="text-[var(--color-ink)] text-lg leading-relaxed">
                  {current.content}
                </p>
                <div className="grid grid-cols-3 gap-3 mt-6">
                  {['⚡ Instant Solutions', '🧠 Smart Explanations', '📈 Track Progress'].map(f => (
                    <div key={f}
                      className="bg-[var(--color-cream)] rounded-xl p-3
                                    text-xs font-medium text-center text-[var(--color-ink)]">
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1 — Level */}
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-[var(--color-muted)] text-sm text-center mb-4">
                  This helps Euler explain things at the right level for you.
                </p>
                {[
                  {
                    value: 'secondary', icon: '🏫', label: 'Secondary School',
                    desc: 'JSS1 to SS3 — WAEC and NECO preparation'
                  },
                  {
                    value: 'university', icon: '🎓', label: 'Undergraduate',
                    desc: '100L to 400L — University mathematics'
                  },
                  {
                    value: 'graduate', icon: '🔬', label: 'Graduate',
                    desc: 'Postgraduate and advanced mathematics'
                  },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setLevel(opt.value)}
                    className={`w-full text-left p-4 rounded-2xl border-2
                                transition-all duration-150
                      ${level === opt.value
                        ? 'border-[var(--color-teal)] bg-[#e8f4f4]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-ink)]'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{opt.icon}</span>
                      <div>
                        <p className={`font-semibold text-sm
                          ${level === opt.value
                            ? 'text-[var(--color-teal)]'
                            : 'text-[var(--color-ink)]'
                          }`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">
                          {opt.desc}
                        </p>
                      </div>
                      {level === opt.value && (
                        <span className="ml-auto text-[var(--color-teal)] text-lg">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2 — Tour */}
            {step === 2 && (
              <div className="grid grid-cols-1 gap-3">
                {FEATURES.map(f => (
                  <div key={f.title}
                    className="flex items-start gap-3 p-3 rounded-xl
                                  bg-[var(--color-cream)]">
                    <span className="text-xl shrink-0">{f.icon}</span>
                    <div>
                      <p className="font-semibold text-sm text-[var(--color-ink)]">
                        {f.title}
                      </p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-snug">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 3 — Ready */}
            {step === 3 && (
              <div className="text-center space-y-4">
                <p className="text-[var(--color-ink)] text-lg leading-relaxed">
                  {current.content}
                </p>
                <div className="bg-[var(--color-cream)] rounded-2xl p-5 mt-4">
                  <p className="font-serif font-bold text-[var(--color-teal)] text-lg mb-1">
                    💡 First suggestion:
                  </p>
                  <p className="text-sm text-[var(--color-ink)]">
                    Go to <strong>Teach</strong> and pick a topic you're currently
                    studying in school. Ask Euler to explain it and then try a
                    practice question!
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="btn-secondary px-6 py-3 text-sm"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={step === 1 && !level}
                className="flex-1 btn-primary py-3.5 justify-center
                           flex items-center gap-2 disabled:opacity-50"
              >
                {step === STEPS.length - 1 ? '🚀 Start Learning' : 'Next →'}
              </button>
            </div>

            {/* Skip */}
            {step < STEPS.length - 1 && (
              <button
                onClick={() => {
                  localStorage.setItem('mg_onboarding_done', '1')
                  navigate('/signup')
                }}
                className="w-full text-center text-xs text-[var(--color-muted)]
                           hover:text-[var(--color-ink)] mt-3 transition-colors"
              >
                Skip for now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}