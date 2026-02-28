import { useAuth } from '../context/AuthContext'
import { getDailyNugget, getFormattedDate, getGreeting,
         getFormattedTime, useLiveClock } from '../lib/nugget'

export default function WelcomeBanner({ compact = false }) {
  const { profile } = useAuth()
  const now       = useLiveClock()
  const firstName = profile?.full_name?.split(' ')[0] || 'Student'
  const greeting  = getGreeting()
  const date      = getFormattedDate()
  const time      = getFormattedTime(now)
  const nugget    = getDailyNugget()

  if (compact) {
    return (
      <div className="bg-[var(--color-ink)] rounded-2xl px-5 py-4
                      flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest
                        text-white/50 mb-0.5">
            {date}
          </p>
          <p className="font-serif font-bold text-white text-lg">
            {greeting}, {firstName}! 👋
          </p>
        </div>

        {/* Live clock */}
        <div className="text-center">
          <p className="font-mono font-black text-3xl text-[var(--color-gold)]
                        tabular-nums tracking-tight">
            {time}
          </p>
        </div>

        {/* Nugget */}
        <div className="hidden sm:block bg-white/10 rounded-xl px-4 py-2 max-w-xs">
          <p className="font-mono text-[10px] uppercase tracking-widest
                        text-[var(--color-gold)] mb-1">
            💡 Daily Nugget
          </p>
          <p className="text-white/80 text-xs leading-snug line-clamp-2">
            {nugget}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden mb-8">
      <div className="bg-[var(--color-ink)] px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
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

          {/* Live clock */}
          <div className="text-right">
            <p className="font-mono font-black text-4xl text-[var(--color-gold)]
                          tabular-nums tracking-tight">
              {time}
            </p>
            <p className="font-mono text-[10px] text-white/40 uppercase
                          tracking-widest mt-1">
              Current Time
            </p>
          </div>
        </div>
      </div>

      {/* Nugget strip */}
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