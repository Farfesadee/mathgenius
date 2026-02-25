import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 5) {
      setError('Password must be at least 5 characters.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else {
      setSuccess(true)
      setTimeout(() => navigate('/teach'), 2500)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[var(--color-paper)] flex items-center
                    justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif font-black text-4xl tracking-tight">
            Math<span className="text-[var(--color-gold)]">Genius</span>
          </h1>
        </div>

        <div className="card overflow-hidden">
          <div className="bg-[var(--color-teal)] px-6 py-5">
            <h2 className="font-serif font-bold text-white text-xl">
              Choose a New Password
            </h2>
          </div>

          <div className="bg-white p-8">
            {success ? (
              <div className="text-center space-y-3">
                <div className="text-5xl">✅</div>
                <h3 className="font-serif font-bold text-xl">Password Updated!</h3>
                <p className="text-[var(--color-muted)] text-sm">
                  Redirecting you to the app...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { label: 'New Password',     value: password, set: setPassword },
                  { label: 'Confirm Password', value: confirm,  set: setConfirm  },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <label className="font-mono text-[10px] uppercase tracking-widest
                                       text-[var(--color-muted)] block mb-1.5">
                      {label}
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={value}
                        onChange={e => set(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={5}
                        className="w-full bg-[var(--color-paper)] border-2
                                   border-[var(--color-border)] focus:border-[var(--color-teal)]
                                   rounded-xl px-4 py-3 pr-12 text-sm transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2
                                   text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                      >
                        <EyeIcon open={showPass} />
                      </button>
                    </div>
                  </div>
                ))}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl
                                  px-4 py-3 text-red-600 text-sm">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3.5 justify-center
                             flex items-center gap-2 disabled:opacity-50"
                >
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/30
                                       border-t-white rounded-full animate-spin" />
                    : 'Update Password'
                  }
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}