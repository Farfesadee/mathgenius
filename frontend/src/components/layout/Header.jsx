import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../NotificationBell'
import SearchPalette from '../SearchPalette'
import { useTheme } from '../../context/ThemeContext'
import { getStreak } from '../../lib/learning'
import { Home, Settings, BookOpen, Monitor, Target, ClipboardList, BarChart3, User, Bookmark, Flame, Trophy, FileText, BookOpen as Book, Bot, Brain, Triangle, Microscope, Swords, Gamepad2, Users, School, Map, GraduationCap, StickyNote, Calendar, FolderArchive, DoorOpen, Moon, Sun, Banana, Presentation, Zap, Search } from 'lucide-react'

const NAV_LINKS = [
  { path: '/home',     label: 'Home',     icon: Home,      auth: false },
  { path: '/solve',    label: 'Solve',    icon: Settings,  auth: false },
  { path: '/teach',    label: 'Teach',    icon: BookOpen,  auth: true  },
  { path: '/cbt',      label: 'CBT',      icon: Monitor,   auth: true  },
  { path: '/practice', label: 'Practice', icon: Target,    auth: true  },
  { path: '/mock-exam',label: 'Mock Exam',icon: ClipboardList, auth: true  },
  { path: '/dashboard',label: 'Dashboard',icon: BarChart3, auth: true  },
]

export default function Header() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [streak,   setStreak]   = useState(null)
  const dropdownRef = useRef(null)
  const { isDark, toggleTheme } = useTheme()

  const active = (path) => location.pathname === path

  // Load streak
  useEffect(() => {
    if (!user) return
    getStreak(user.id).then(({ data }) => {
      if (data?.current_streak > 0) setStreak(data.current_streak)
    })
  }, [user])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setUserMenu(false)
    }
    if (userMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userMenu])

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false)
    setUserMenu(false)
  }, [location.pathname])

  // Ctrl+K / Cmd+K opens site search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setMenuOpen(false)
    setUserMenu(false)
    navigate('/')
  }

  const visibleLinks = NAV_LINKS.filter(l => !l.auth || user)

  // Role-based extra links in dropdown
  const isTeacherOrParent = profile?.role === 'teacher' || profile?.role === 'parent'

  return (
    <>
      <header className="sticky top-0 z-50 bg-[var(--color-paper)]
                         border-b-2 border-[var(--color-ink)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16
                        flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="font-serif font-black text-2xl tracking-tight shrink-0">
            Math<span className="text-[var(--color-gold)]">Genius</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {visibleLinks.map(link => (
              <Link key={link.path} to={link.path}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all
                  ${active(link.path)
                    ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                  }`}>
                <link.icon size={20} /> {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">

            {/* Streak counter — only when streak > 0 */}
            {user && streak > 0 && (
              <Link to="/practice"
                title={`${streak}-day streak! Keep it up`}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                           border-2 border-amber-300 bg-amber-50 hover:bg-amber-100
                           transition-all shrink-0">
                <Flame size={20} className="text-amber-500" />
                <span className="font-mono font-bold text-sm text-amber-700">
                  {streak}
                </span>
              </Link>
            )}

            {/* Site search */}
            <button onClick={() => setSearchOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl
                         border-2 border-[var(--color-border)]
                         hover:border-[var(--color-ink)] transition-all
                         bg-[var(--color-cream)]"
              title="Search the site (Ctrl+K)" aria-label="Search the site">
              <Search size={20} />
            </button>

            {/* Dark mode toggle */}
            <button onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-xl
                         border-2 border-[var(--color-border)]
                         hover:border-[var(--color-ink)] transition-all
                         bg-[var(--color-cream)] text-lg"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {user && <NotificationBell />}

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setUserMenu(m => !m)}
                  className="flex items-center gap-2 bg-[var(--color-cream)]
                             border-2 border-[var(--color-border)]
                             hover:border-[var(--color-ink)]
                             rounded-xl px-3 py-1.5 transition-all">
                  <div className="w-7 h-7 rounded-full bg-[var(--color-teal)]
                                  flex items-center justify-center text-white
                                  font-bold text-xs shrink-0">
                    {profile?.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium
                                   text-[var(--color-ink)] max-w-[100px] truncate">
                    {profile?.full_name?.split(' ')[0] || 'Account'}
                  </span>
                  <span className="text-[var(--color-muted)] text-xs hidden sm:block">
                    {userMenu ? '▲' : '▼'}
                  </span>
                </button>

                {userMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56
                                  bg-[var(--color-paper)]
                                  border-2 border-[var(--color-ink)] rounded-2xl
                                  shadow-xl overflow-hidden z-50 flex flex-col"
                       style={{ maxHeight: 'calc(100vh - 80px)' }}>

                    {/* User info */}
                    <div className="px-4 py-3 bg-[var(--color-cream)]
                                    border-b border-[var(--color-border)] shrink-0">
                      <p className="font-semibold text-sm text-[var(--color-ink)] truncate">
                        {profile?.full_name || 'Student'}
                      </p>
                      <p className="text-xs text-[var(--color-muted)] truncate">
                        {user.email}
                      </p>
                      {/* Streak badge inside dropdown */}
                      {streak > 0 && (
                        <p className="text-xs text-amber-600 font-semibold mt-1">
                          <Flame size={14} className="inline text-amber-500" /> {streak}-day streak!
                        </p>
                      )}
                    </div>

                    {/* Scrollable links */}
                    <div className="overflow-y-auto flex-1">
                      {[
                        // ── Account ──────────────────────────────────
                        { path: '/profile',       icon: User,        label: 'My Profile'       },
                        { path: '/bookmarks',     icon: Bookmark,    label: 'My Bookmarks'     },
                        // ── Daily engagement ─────────────────────────
                        { path: '/daily',         icon: Flame,       label: 'Daily Challenge'  },
                        { path: '/leaderboard',   icon: Trophy,      label: 'Leaderboard'      },
                        // ── Study tools ──────────────────────────────
                        { path: '/past-questions',icon: FileText,    label: 'Past Questions'   },
                        { path: '/theory',        icon: Book,        label: 'Theory Practice'  },
                        { path: '/ai-quiz',       icon: Bot,         label: 'AI Quiz'          },
                        { path: '/review',        icon: Brain,       label: 'Spaced Review'    },
                        { path: '/question-bank', icon: BookOpen,    label: 'Question Bank'    },
                        { path: '/formulas',      icon: Triangle,    label: 'Formula Sheet'    },
                        { path: '/wiki/Quadratic+Equations', icon: Microscope, label: 'Topic Wiki' },
                        // ── Social / competitive ──────────────────────
                        { path: '/battle',        icon: Swords,      label: 'Battle'           },
                        { path: '/challenge',     icon: Gamepad2,    label: 'Challenge Friend' },
                        { path: '/groups',        icon: Users,       label: 'Study Groups'     },
                        { path: '/classroom',     icon: School,      label: 'Classroom'        },
                        // ── Progress & extras ─────────────────────────
                        { path: '/mastery',       icon: Map,         label: 'Mastery Map'      },
                        { path: '/weekly-report', icon: BarChart3,   label: 'Weekly Report'    },
                        { path: '/certificate',   icon: GraduationCap, label: 'Certificate'    },
                        { path: '/notes',         icon: StickyNote,  label: 'My Notes'         },
                        { path: '/planner',       icon: Calendar,    label: 'Study Planner'    },
                        { path: '/cbt-history',   icon: FolderArchive, label: 'CBT History'    },
                        // ── Teacher / Parent only ─────────────────────
                        ...(isTeacherOrParent ? [
                          { path: '/monitor', icon: Presentation, label: 'Monitor Students', highlight: true },
                        ] : []),
                      ].map(item => (
                        <Link key={item.path} to={item.path}
                          onClick={() => setUserMenu(false)}
                          className={`flex items-center gap-2 px-4 py-2.5 text-sm
                                     transition-colors
                            ${item.highlight
                              ? 'text-[var(--color-teal)] font-semibold hover:bg-[#e8f4f4]'
                              : 'hover:bg-[var(--color-cream)]'
                            }`}>
                          <item.icon size={20} /> {item.label}
                        </Link>
                      ))}
                    </div>

                    {/* Sign out */}
                    <div className="border-t border-[var(--color-border)] shrink-0">
                      <button onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2.5
                                   text-sm text-red-500 hover:bg-red-50 transition-colors">
                        <DoorOpen size={18} /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn-primary px-4 py-2 text-sm hidden sm:flex">
                Sign In
              </Link>
            )}

            {/* Mobile hamburger */}
            <button onClick={() => setMenuOpen(m => !m)}
              className="lg:hidden w-10 h-10 flex items-center justify-center
                         rounded-xl border-2 border-[var(--color-border)]
                         hover:border-[var(--color-ink)] transition-all">
              <div className="space-y-1.5">
                <span className={`block w-5 h-0.5 bg-[var(--color-ink)]
                                  transition-all duration-200
                  ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block w-5 h-0.5 bg-[var(--color-ink)]
                                  transition-all duration-200
                  ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-5 h-0.5 bg-[var(--color-ink)]
                                  transition-all duration-200
                  ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50"
             onClick={() => setMenuOpen(false)}>
          <div className="absolute top-16 left-0 right-0 bg-white
                          border-b-2 border-[var(--color-ink)] shadow-xl"
               onClick={e => e.stopPropagation()}>

            <nav className="p-4 space-y-1">
              {visibleLinks.map(link => (
                <Link key={link.path} to={link.path}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl
                              text-sm font-medium transition-all
                    ${active(link.path)
                      ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
                      : 'text-[var(--color-ink)] hover:bg-[var(--color-cream)]'
                    }`}>
                  <link.icon size={22} />
                  {link.label}
                </Link>
              ))}

              {/* Extra mobile links */}
              {user && (
                <>
                  <Link to="/classroom" onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl
                                text-sm font-medium transition-all
                      ${active('/classroom')
                        ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
                        : 'text-[var(--color-ink)] hover:bg-[var(--color-cream)]'
                      }`}>
                    <School size={22} /> Classroom
                  </Link>
                  <Link to="/battle" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                               hover:bg-[var(--color-paper)] text-[var(--color-ink)]">
                    <Swords size={22} /> Battle
                  </Link>
                  <Link to="/question-bank" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                               hover:bg-[var(--color-paper)] text-[var(--color-ink)]">
                    <BookOpen size={22} /> Question Bank
                  </Link>
                  {isTeacherOrParent && (
                    <Link to="/monitor" onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl
                                  text-sm font-semibold transition-all
                        ${active('/monitor')
                          ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
                          : 'text-[var(--color-teal)] hover:bg-[#e8f4f4]'
                        }`}>
                      <Presentation size={22} /> Monitor Students
                    </Link>
                  )}
                </>
              )}
            </nav>

            <div className="px-4 pb-4 border-t border-[var(--color-border)] pt-3">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-teal)]
                                    flex items-center justify-center text-white
                                    font-bold text-sm">
                      {profile?.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-ink)]">
                        {profile?.full_name || 'Student'}
                      </p>
                      <p className="text-xs text-[var(--color-muted)] truncate max-w-[200px]">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  {/* Streak in mobile drawer */}
                  {streak > 0 && (
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl
                                    bg-amber-50 border border-amber-200 mx-0">
                      <Flame size={20} className="text-amber-500" />
                      <span className="text-sm font-semibold text-amber-700">
                        {streak}-day streak!
                      </span>
                    </div>
                  )}
                  <button onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl
                               text-sm text-red-500 hover:bg-red-50 transition-colors">
                    <DoorOpen size={18} /> Sign Out
                  </button>
                </div>
              ) : (
                <Link to="/login" onClick={() => setMenuOpen(false)}
                  className="block w-full btn-primary py-3 text-sm text-center">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
    </>
  )
}
