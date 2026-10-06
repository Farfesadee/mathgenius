import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Home, Calculator, Bot, Monitor, Target, ClipboardList, BarChart3, Trophy, BookOpen, StickyNote, CalendarCheck, FileText, History, User, Zap, Flag, LifeBuoy } from 'lucide-react'

// Site-wide destination index: label + route + match keywords.
const INDEX = [
  { label: 'Home',            path: '/home',          Icon: Home,          keys: 'home start' },
  { label: 'Solve',           path: '/solve',         Icon: Calculator,    keys: 'solve equation calculator differentiate integrate' },
  { label: 'Teach (Ask Euler)', path: '/teach',       Icon: Bot,           keys: 'teach euler tutor learn topic explain chat ai' },
  { label: 'CBT Exam',        path: '/cbt',            Icon: Monitor,       keys: 'cbt exam waec jamb neco test mock timed' },
  { label: 'Practice',        path: '/practice',      Icon: Target,        keys: 'practice questions drill weak topics mixed session' },
  { label: 'Mock Exam',       path: '/mock-exam',     Icon: ClipboardList, keys: 'mock exam full paper' },
  { label: 'Dashboard',       path: '/dashboard',     Icon: BarChart3,      keys: 'dashboard progress stats xp overview' },
  { label: 'Leaderboard',     path: '/leaderboard',   Icon: Trophy,        keys: 'leaderboard ranking top students scores xp' },
  { label: 'Topic Mastery',   path: '/mastery',       Icon: BookOpen,      keys: 'mastery topics weak strong' },
  { label: 'Notes',           path: '/notes',         Icon: StickyNote,    keys: 'notes revision notebook' },
  { label: 'Study Planner',   path: '/planner',       Icon: CalendarCheck, keys: 'planner plan schedule study timetable' },
  { label: 'Formula Sheet',   path: '/formulas',      Icon: FileText,      keys: 'formula sheet reference symbols' },
  { label: 'Past Questions',  path: '/past-questions', Icon: History,      keys: 'past questions papers waec neco jamb upload' },
  { label: 'CBT History',     path: '/cbt-history',   Icon: History,       keys: 'history past results scores' },
  { label: 'Profile',         path: '/profile',       Icon: User,          keys: 'profile account settings username referral' },
  { label: 'Daily Challenge', path: '/daily',         Icon: Zap,           keys: 'daily challenge streak' },
  { label: 'AI Quiz',         path: '/ai-quiz',       Icon: Flag,          keys: 'quiz ai generated' },
  { label: 'Bookmarks',       path: '/bookmarks',     Icon: BookOpen,      keys: 'bookmarks saved' },
  { label: 'Contact & Help',  path: '/contact',       Icon: LifeBuoy,      keys: 'contact help support email message faq' },
]

export default function SearchPalette({ onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return INDEX
    return INDEX.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.keys.includes(q) ||
      q.split(/\s+/).every(word => (item.label + ' ' + item.keys).toLowerCase().includes(word))
    ).slice(0, 10)
  }, [query])

  const go = (path) => {
    onClose?.()
    navigate(path)
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-start justify-center px-4 pt-24"
      onClick={onClose} role="dialog" aria-modal="true" aria-label="Site search">
      <div className="w-full max-w-lg card bg-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-[var(--color-border)]">
          <Search size={20} className="text-[var(--color-muted)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results.length > 0) go(results[0].path)
            }}
            placeholder="Search pages, exams, tools..."
            aria-label="Search the site"
            className="flex-1 bg-transparent outline-none text-sm
                       text-[var(--color-ink)] placeholder:text-[var(--color-muted)]"
          />
          <kbd className="font-mono text-[10px] text-[var(--color-muted)]
                          border border-[var(--color-border)] rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 && (
            <p className="px-4 py-6 text-sm text-center text-[var(--color-muted)]">
              No matches. Try "exam", "practice" or "formula".
            </p>
          )}
          {results.map(item => (
            <button key={item.path} onClick={() => go(item.path)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left
                         hover:bg-[var(--color-cream)] transition-colors">
              <item.Icon size={18} className="text-[var(--color-teal)] shrink-0" />
              <span className="text-sm font-medium text-[var(--color-ink)]">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
