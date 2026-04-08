import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getFriendlyAuthMessage } from '../utils/authMessages'

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function PasswordInput({ value, onChange, placeholder, label, required = true }) {
  const [show, setShow] = useState(false)

  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] block mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          minLength={5}
          className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-border)] focus:border-[var(--color-teal)] rounded-xl px-4 py-3 pr-12 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] transition-colors duration-150"
        />
        <button
          type="button"
          onClick={() => setShow((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  )
}

function TextInput({ label, value, onChange, placeholder, type = 'text', required = true }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] block mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-border)] focus:border-[var(--color-teal)] rounded-xl px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] transition-colors duration-150"
      />
    </div>
  )
}

const GRADE_OPTIONS = [
  { value: 'secondary', label: 'Secondary School' },
  { value: 'university', label: 'Undergraduate' },
  { value: 'graduate', label: 'Graduate' },
]

export default function Login({ defaultTab = 'login' }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState(defaultTab)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [firstName, setFirstName] = useState('')
  const [surname, setSurname] = useState('')
  const [grade, setGrade] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [verifyPassword, setVerifyPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const forgotPasswordHref = loginEmail
    ? `/forgot-password?email=${encodeURIComponent(loginEmail)}`
    : '/forgot-password'

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })

    if (error) {
      setError(getFriendlyAuthMessage('login', error.message))
    } else {
      navigate('/dashboard')
    }

    setLoading(false)
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!grade) {
      setError('Please select your grade.')
      return
    }

    if (signupPassword !== verifyPassword) {
      setError('Passwords do not match.')
      return
    }

    if (signupPassword.length < 5) {
      setError('Password must be at least 5 characters.')
      return
    }

    setLoading(true)
    const fullName = `${firstName.trim()} ${surname.trim()}`

    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: {
          full_name: fullName,
          first_name: firstName.trim(),
          surname: surname.trim(),
          level: grade,
        },
      },
    })

    if (error) {
      setError(getFriendlyAuthMessage('signup', error.message))
    } else {
      sessionStorage.removeItem('onboarding_level')
      setSuccess('Almost there! Check your inbox and click the confirmation link to activate your account.')
    }

    setLoading(false)
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })

    if (error) {
      setError(getFriendlyAuthMessage('oauth', error.message))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/">
            <h1 className="font-serif font-black text-4xl tracking-tight">
              Math<span className="text-[var(--color-gold)]">Genius</span>
            </h1>
          </Link>
          <p className="text-[var(--color-muted)] mt-2">Your AI mathematics tutor</p>
        </div>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-2 border-b-2 border-[var(--color-ink)]">
            {[
              { id: 'login', label: 'Sign In' },
              { id: 'signup', label: 'Create Account' },
            ].map((currentTab) => (
              <button
                key={currentTab.id}
                onClick={() => {
                  setTab(currentTab.id)
                  setError('')
                  setSuccess('')
                }}
                className={`py-3.5 font-semibold text-sm transition-all ${
                  tab === currentTab.id
                    ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
                    : 'bg-[var(--color-cream)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                }`}
              >
                {currentTab.label}
              </button>
            ))}
          </div>

          <div className="bg-white p-8 space-y-5">
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 border-2 border-[var(--color-border)] hover:border-[var(--color-ink)] rounded-xl py-3 font-semibold text-sm transition-all disabled:opacity-50 bg-white hover:bg-[var(--color-cream)]"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" />
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" />
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" />
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z" />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <span className="text-xs text-[var(--color-muted)] font-mono uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>

            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <TextInput
                  label="Email Address"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <PasswordInput
                  label="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <div className="flex justify-end">
                  <Link
                    to={forgotPasswordHref}
                    className="text-xs text-[var(--color-teal)] hover:underline font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3.5 text-base justify-center flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            )}

            {tab === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <TextInput
                    label="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Adaeze"
                  />
                  <TextInput
                    label="Surname"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="Johnson"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] block mb-1.5">
                    Grade
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {GRADE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setGrade(option.value)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition-all duration-150 text-center ${
                          grade === option.value
                            ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                            : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-ink)]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <TextInput
                  label="Email Address"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="you@example.com"
                />

                <PasswordInput
                  label="Password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Min. 5 characters"
                />

                <PasswordInput
                  label="Verify Password"
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                  placeholder="Repeat your password"
                />

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
                    Success: {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3.5 text-base justify-center flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[var(--color-muted)] mt-6">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  )
}
