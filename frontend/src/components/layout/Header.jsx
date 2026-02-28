import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../NotificationBell'
import { useTheme } from '../../context/ThemeContext'

const NAV_LINKS = [
  { path: '/home', label: 'Home', icon: '🏠', auth: false },
  { path: '/solve', label: 'Solve', icon: '⚙️', auth: false },
  { path: '/teach', label: 'Teach', icon: '📚', auth: true },
  { path: '/cbt', label: 'CBT', icon: '🖥️', auth: true },
  { path: '/practice', label: 'Practice', icon: '🎯', auth: true },
  { path: '/dashboard', label: 'Dashboard', icon: '📊', auth: true },
]

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const dropdownRef = useRef(null)
  const { isDark, toggleTheme } = useTheme()

  const active = (path) => location.pathname === path

  // Close dropdown when clicking anywhere outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserMenu(false)
      }
    }
    if (userMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userMenu])

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false)
    setUserMenu(false)
  }, [location.pathname])

  const handleSignOut = async () => {
    await signOut()
    setMenuOpen(false)
    setUserMenu(false)
    navigate('/')
  }

  const visibleLinks = NAV_LINKS.filter(l => !l.auth || user)

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
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all
                  ${active(link.path)
                    ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                  }`}
              >
                {link.icon} {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center
             rounded-xl border-2 border-[var(--color-border)]
             hover:border-[var(--color-ink)] transition-all
             bg-[var(--color-cream)] text-lg"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            {user && <NotificationBell />}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserMenu(m => !m)}
                  className="flex items-center gap-2 bg-[var(--color-cream)]
                             border-2 border-[var(--color-border)]
                             hover:border-[var(--color-ink)]
                             rounded-xl px-3 py-1.5 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--color-teal)]
                                  flex items-center justify-center text-white
                                  font-bold text-xs shrink-0">
                    {profile?.full_name?.[0]?.toUpperCase() ||
                      user.email[0].toUpperCase()}
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
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white
                                  border-2 border-[var(--color-ink)] rounded-2xl
                                  shadow-xl overflow-hidden z-50
                                  flex flex-col"
                    style={{ maxHeight: 'calc(100vh - 80px)' }}>
                    {/* User info — always visible */}
                    <div className="px-4 py-3 bg-[var(--color-cream)]
                                    border-b border-[var(--color-border)] shrink-0">
                      <p className="font-semibold text-sm text-[var(--color-ink)] truncate">
                        {profile?.full_name || 'Student'}
                      </p>
                      <p className="text-xs text-[var(--color-muted)] truncate">
                        {user.email}
                      </p>
                    </div>

                    {/* Scrollable links */}
                    <div className="overflow-y-auto flex-1">
                      {[
                        { path: '/bookmarks', icon: '🔖', label: 'My Bookmarks' },
                        { path: '/daily', icon: '🔥', label: 'Daily Challenge' },
                        { path: '/practice', icon: '🎯', label: 'Practice' },
                        { path: '/ai-quiz', icon: '🤖', label: 'AI Quiz' },
                        { path: '/review', icon: '🧠', label: 'Spaced Review' },
                        { path: '/challenge', icon: '⚔️', label: 'Challenge Friend' },
                        { path: '/groups', icon: '👥', label: 'Study Groups' },
                        { path: '/weekly-report', icon: '📊', label: 'Weekly Report' },
                        { path: '/certificate', icon: '🏆', label: 'Certificate' },
                        { path: '/wiki/Quadratic+Equations', icon: '📖', label: 'Topic Wiki' },
                        { path: '/dashboard', icon: '📈', label: 'Dashboard' },
                        { path: '/past-questions', icon: '📝', label: 'Past Questions' },
                        { path: '/cbt', icon: '🖥️', label: 'CBT' },
                        { path: '/leaderboard', icon: '🏆', label: 'Leaderboard' },
                        { path: '/mastery', icon: '🗺️', label: 'Mastery' },
                        { path: '/notes', icon: '📝', label: 'Notes' },
                        { path: '/planner', icon: '📅', label: 'Study Planner' },
                        { path: '/cbt-history', icon: '🗂️', label: 'CBT History' },
                        { path: '/profile', icon: '👤', label: 'My Profile' },
                        { path: '/formulas', icon: '📐', label: 'Formula Sheet' },
                      ].map(item => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setUserMenu(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm
                                     hover:bg-[var(--color-cream)] transition-colors"
                        >
                          {item.icon} {item.label}
                        </Link>
                      ))}
                    </div>

                    {/* Sign out — always visible */}
                    <div className="border-t border-[var(--color-border)] shrink-0">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2.5
                                   text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        🚪 Sign Out
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
            <button
              onClick={() => setMenuOpen(m => !m)}
              className="lg:hidden w-10 h-10 flex items-center justify-center
                         rounded-xl border-2 border-[var(--color-border)]
                         hover:border-[var(--color-ink)] transition-all"
            >
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
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl
                              text-sm font-medium transition-all
                    ${active(link.path)
                      ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
                      : 'text-[var(--color-ink)] hover:bg-[var(--color-cream)]'
                    }`}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="px-4 pb-4 border-t border-[var(--color-border)] pt-3">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-teal)]
                                    flex items-center justify-center text-white
                                    font-bold text-sm">
                      {profile?.full_name?.[0]?.toUpperCase() ||
                        user.email[0].toUpperCase()}
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
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl
                               text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    🚪 Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full btn-primary py-3 text-sm text-center"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}