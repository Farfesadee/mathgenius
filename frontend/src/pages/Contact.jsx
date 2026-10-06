import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LifeBuoy, Mail, Send, Check, BookOpen, KeyRound, Flag, FileText } from 'lucide-react'
import { sendContactMessage } from '../services/api'

const TOPICS = [
  'Account help',
  'Report a problem',
  'Feedback',
  'Partnership',
  'Other',
]

const SELF_HELP = [
  { Icon: KeyRound, title: 'Forgot your password?', desc: 'Reset it by email in under a minute.', to: '/forgot-password' },
  { Icon: Flag, title: 'Found a wrong question?', desc: 'Flag it right from any practice question.', to: '/practice' },
  { Icon: FileText, title: 'Formula sheet', desc: '70+ WAEC, NECO and JAMB formulas.', to: '/formulas' },
  { Icon: BookOpen, title: 'How it works', desc: 'Tour Euler, CBT exams and streaks.', to: '/home' },
]

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState(TOPICS[0])
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const [formError, setFormError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (name.trim().length < 2 || !email.includes('@') || message.trim().length < 10) {
      setFormError('Please add your name, a valid email and a message of at least 10 characters.')
      return
    }
    setStatus('sending')
    try {
      const res = await sendContactMessage({
        name: name.trim(), email: email.trim(), topic, message: message.trim(),
      })
      if (res?.ok) {
        setStatus('done')
      } else {
        setStatus('error')
        setFormError('Could not send. Please try again or email us directly.')
      }
    } catch {
      setStatus('error')
      setFormError('Could not send. Check your connection and try again.')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="card overflow-hidden mb-6">
        <div className="bg-[var(--color-ink)] px-6 py-8 text-center">
          <LifeBuoy size={48} className="text-white mx-auto mb-3" />
          <h1 className="font-serif font-black text-3xl text-white">
            Contact &amp; Help
          </h1>
          <p className="text-white/60 mt-2 text-sm">
            Questions, feedback or a problem? We reply within 1 to 2 days.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <a href="mailto:help@mathgenius.guru"
          className="card bg-white p-5 flex items-start gap-3
                     hover:border-[var(--color-teal)] transition-colors">
          <Mail size={24} className="shrink-0 text-[var(--color-teal)]" />
          <div>
            <p className="font-bold text-sm text-[var(--color-ink)]">Email us</p>
            <p className="text-xs text-[var(--color-teal)] font-mono mt-0.5">
              help@mathgenius.guru
            </p>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Best for account issues and partnerships.
            </p>
          </div>
        </a>
        <div className="card bg-white p-5">
          <p className="font-bold text-sm text-[var(--color-ink)] mb-3">
            Fix it yourself
          </p>
          <div className="space-y-2">
            {SELF_HELP.map(item => (
              <Link key={item.title} to={item.to}
                className="flex items-center gap-2 text-xs font-medium
                           text-[var(--color-muted)]
                           hover:text-[var(--color-teal)] transition-colors">
                <item.Icon size={16} className="shrink-0" /> {item.title}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="card bg-white p-6">
        {status === 'done' ? (
          <div className="text-center py-6">
            <Check size={48} className="text-green-500 mx-auto mb-3" />
            <p className="font-serif font-black text-xl text-[var(--color-ink)]">
              Message sent!
            </p>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              Thanks for reaching out. We will reply to {email || 'your inbox'} shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="font-serif font-bold text-lg text-[var(--color-ink)]">
              Send us a message
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] block mb-2">Your name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Obi"
                  className="w-full border-2 border-[var(--color-border)]
                             focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                             text-sm transition-colors" />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] block mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border-2 border-[var(--color-border)]
                             focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                             text-sm transition-colors" />
              </div>
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest
                                 text-[var(--color-muted)] block mb-2">Topic</label>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map(t => (
                  <button type="button" key={t} onClick={() => setTopic(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold
                                border-2 transition-all
                      ${topic === t
                        ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                        : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-ink)]'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest
                                 text-[var(--color-muted)] block mb-2">Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                rows={5} placeholder="How can we help?"
                className="w-full border-2 border-[var(--color-border)]
                           focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                           text-sm transition-colors resize-none" />
            </div>
            {formError && (
              <p className="text-xs text-red-600">{formError}</p>
            )}
            <button type="submit" disabled={status === 'sending'}
              className="w-full btn-primary py-3.5 justify-center
                         flex items-center gap-2 disabled:opacity-50">
              {status === 'sending'
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Send size={18} />}
              {status === 'sending' ? 'Sending...' : 'Send message'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
