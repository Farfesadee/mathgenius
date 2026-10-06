import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Calculator, GraduationCap, Rocket, Flag, Settings, BookOpen, Target, FileText, Bookmark, BarChart3, Check, Lightbulb, Zap, School, Microscope, Brain, Monitor, ArrowLeft, ArrowRight } from 'lucide-react'

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to MathGenius!',
    subtitle: 'Your personal AI mathematics tutor',
    content: 'Euler is here to help you master mathematics, from basic arithmetic to university-level calculus. Let\'s get you set up in 3 quick steps.',
    Icon: Calculator,
  },
  {
    id: 'level',
    title: 'What level are you?',
    subtitle: 'We\'ll personalise your experience',
    content: null,
    Icon: GraduationCap,
  },
  {
    id: 'tour',
    title: 'Here\'s what you can do',
    subtitle: 'Quick tour of MathGenius',
    content: null,
    Icon: Zap,
  },
  {
    id: 'ready',
    title: 'You\'re all set!',
    subtitle: 'Let\'s start learning',
    content: 'Euler is ready to help you tackle any mathematics problem. Start by exploring a topic or solving a question.',
    Icon: GraduationCap,
  },
]

const FEATURES = [
  { Icon: Settings, title: 'Solve', desc: 'Solve equations, differentiate and integrate with full step-by-step working' },
  { Icon: BookOpen, title: 'Teach', desc: 'Learn any topic with Euler: your AI tutor explains everything clearly' },
  { Icon: Target, title: 'Practice', desc: 'Test yourself with questions Euler generates and grades for you' },
  { Icon: FileText, title: 'Past Questions', desc: 'Practice real WAEC, NECO and JAMB questions with worked solutions' },
  { Icon: Bookmark, title: 'Bookmarks', desc: 'Save important solutions and explanations for exam revision' },
  { Icon: BarChart3, title: 'Dashboard', desc: 'Track your progress, see weak topics and improve over time' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { updateProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [level, setLevel] = useState('')

  const handleNext = async () => {
    if (step === 1 && level) {
      sessionStorage.setItem('onboarding_level', level)
    }
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
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

          <div className="bg-[var(--color-ink)] px-8 py-8 text-center">
            <div className="mb-4 flex justify-center"><current.Icon size={48} className="text-white" /></div>
            <h1 className="font-serif font-black text-3xl text-white leading-tight">
              {current.title}
            </h1>
            <p className="text-white/60 mt-2 text-sm">{current.subtitle}</p>
          </div>

          <div className="bg-white p-8">

            {step === 0 && (
              <div className="text-center space-y-4">
                <p className="text-[var(--color-ink)] text-lg leading-relaxed">
                  {current.content}
                </p>
                <div className="grid grid-cols-3 gap-3 mt-6">
                  {[
                    { Icon: Zap, text: 'Instant Solutions' },
                    { Icon: Brain, text: 'Smart Explanations' },
                    { Icon: BarChart3, text: 'Track Progress' },
                  ].map(f => (
                    <div key={f.text}
                      className="bg-[var(--color-cream)] rounded-xl p-3
                                    text-xs font-medium text-center text-[var(--color-ink)]">
                      <f.Icon size={16} className="inline-block mr-1" />{f.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <p className="text-[var(--color-muted)] text-sm text-center mb-4">
                  This helps Euler explain things at the right level for you.
                </p>
                {[
                  {
                    value: 'secondary', Icon: School, label: 'Secondary School',
                    desc: 'JSS1 to SS3: WAEC and NECO preparation'
                  },
                  {
                    value: 'university', Icon: GraduationCap, label: 'Undergraduate',
                    desc: '100L to 400L: University mathematics'
                  },
                  {
                    value: 'graduate', Icon: Microscope, label: 'Graduate',
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
                      <span className="text-2xl"><opt.Icon size={24} /></span>
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
                        <span className="ml-auto text-[var(--color-teal)]"><Check size={20} /></span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 gap-3">
                {FEATURES.map(f => (
                  <div key={f.title}
                    className="flex items-start gap-3 p-3 rounded-xl
                                  bg-[var(--color-cream)]">
                    <f.Icon size={20} className="shrink-0" />
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

            {step === 3 && (
              <div className="text-center space-y-4">
                <p className="text-[var(--color-ink)] text-lg leading-relaxed">
                  {current.content}
                </p>
                <div className="bg-[var(--color-cream)] rounded-2xl p-5 mt-4">
                  <p className="font-serif font-bold text-[var(--color-teal)] text-lg mb-1">
                    <Lightbulb size={20} className="inline-block mr-1" /> First suggestion:
                  </p>
                  <p className="text-sm text-[var(--color-ink)]">
                    Go to <strong>Teach</strong> and pick a topic you're currently
                    studying in school. Ask Euler to explain it and then try a
                    practice question!
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              {step > 0 ? (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="btn-secondary px-6 py-3 text-sm flex items-center gap-1"
                >
                  <ArrowLeft size={16} /> Back
                </button>
              ) : (
                <button
                  onClick={() => navigate('/')}
                  className="btn-secondary px-6 py-3 text-sm flex items-center gap-1"
                >
                  <ArrowLeft size={16} /> Back
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={step === 1 && !level}
                className="flex-1 btn-primary py-3.5 justify-center
                           flex items-center gap-2 disabled:opacity-50"
              >
                {step === STEPS.length - 1 ? <><Rocket size={20} /> Start Learning</> : <>Next <ArrowRight size={18} /></>}
              </button>
            </div>

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
