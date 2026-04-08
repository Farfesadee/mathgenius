import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getFriendlyAuthMessage } from '../utils/authMessages'

export default function ForgotPassword() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(getFriendlyAuthMessage('forgotPassword', error.message))
    } else {
      setSent(true)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/">
            <h1 className="font-serif font-black text-4xl tracking-tight">
              Math<span className="text-[var(--color-gold)]">Genius</span>
            </h1>
          </Link>
        </div>

        <div className="card overflow-hidden">
          <div className="bg-[var(--color-ink)] px-6 py-5">
            <h2 className="font-serif font-bold text-white text-xl">Reset Your Password</h2>
            <p className="text-white/60 text-sm mt-1">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <div className="bg-white p-8">
            {sent ? (
              <div className="text-center space-y-4">
                <h3 className="font-serif font-bold text-xl text-[var(--color-ink)]">
                  Check your inbox
                </h3>
                <p className="text-[var(--color-muted)] text-sm">
                  We sent a password reset link to <strong>{email}</strong>. Check your spam folder if you do not see it.
                </p>
                <Link to="/login" className="inline-block btn-primary px-8 py-3 text-sm mt-2">
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] block mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-border)] focus:border-[var(--color-teal)] rounded-xl px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] transition-colors"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3.5 justify-center flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <p className="text-center text-sm text-[var(--color-muted)]">
                  Remember your password?{' '}
                  <Link to="/login" className="text-[var(--color-teal)] font-semibold hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
