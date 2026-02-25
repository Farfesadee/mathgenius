import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getDailyNugget, getFormattedDate, getGreeting } from '../lib/nugget'

export default function WelcomeBanner({ compact = false }) {
  const { profile } = useAuth()
  const [showFull, setShowFull] = useState(false)

  const firstName = profile?.full_name?.split(' ')[0] || 'Student'
  const greeting  = getGreeting()
  const date      = getFormattedDate()
  const nugget    = getDailyNugget()

  if (compact) {
    return (
      <div className="bg-[var(--color-ink)] rounded-2xl px-5 py-4
                      flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest
                        text-white/50 mb-0.5">
            {date}
          </p>
          <p className="font-serif font-bold text-white text-lg">
            {greeting}, {firstName}! 👋
          </p>
        </div>
        <div className="hidden sm:block bg-white/10 rounded-xl px-4 py-2
                        max-w-sm cursor-pointer"
             onClick={() => setShowFull(s => !s)}>
          <p className="font-mono text-[10px] uppercase tracking-widest
                        text-[var(--color-gold)] mb-1">
            💡 Daily Nugget
          </p>
          <p className={`text-white/80 text-xs leading-snug
            ${showFull ? '' : 'line-clamp-2'}`}>
            {nugget}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden mb-8">
      <div className="bg-[var(--color-ink)] px-6 py-6">
        <p className="font-mono text-[10px] uppercase tracking-widest
                      text-white/50 mb-1">
          {date}
        </p>
        <h2 className="font-serif font-black text-3xl text-white mb-1">
          {greeting}, {firstName}! 👋
        </h2>
        <p className="text-white/60 text-sm">
          Ready to learn something new today?
        </p>
      </div>
      <div className="bg-[var(--color-gold)] px-6 py-4">
        <p className="font-mono text-[10px] uppercase tracking-widest
                      text-[var(--color-ink)]/60 mb-1">
          💡 Mathematics Nugget of the Day
        </p>
        <p className="text-[var(--color-ink)] font-medium text-sm leading-relaxed">
          {nugget}
        </p>
      </div>
    </div>
  )
}