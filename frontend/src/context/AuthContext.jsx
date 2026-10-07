import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { generateUsername } from '../lib/username'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // Failsafe: auth init must never hang forever (slow storage, VPN or a
    // stalled token refresh would otherwise trap users on Loading...).
    // A late session self-corrects via onAuthStateChange below.
    const failsafe = setTimeout(() => {
      if (!cancelled) {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    }, 8000)

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      clearTimeout(failsafe)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    }).catch(() => {
      if (cancelled) return
      clearTimeout(failsafe)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
          // Redirect new users to onboarding — but never hijack admins
          // heading to the control room (their profiles predate onboarding).
          // If this device already finished onboarding, sync that fact to the
          // profile instead of redirecting (prevents the post-login loop
          // back to Step 1 for users who onboarded before signing up).
          if (event === 'SIGNED_IN' && window.location.pathname !== '/admin') {
            // Branded welcome email (backend dedupes — safe on every login).
            // Fire-and-forget: must never block or break login.
            try {
              if (session?.access_token) {
                fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/tracking/welcome`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${session.access_token}` },
                }).catch(() => {})
              }
            } catch { /* ignore */ }
            const { data } = await supabase
              .from('profiles')
              .select('onboarded')
              .eq('id', session.user.id)
              .single()
            const deviceDone = (() => {
              try { return localStorage.getItem('mg_onboarding_done') === '1' }
              catch { return false }
            })()
            if (data && !data.onboarded) {
              if (deviceDone) {
                // Onboarded here before signing up — record it, stay put.
                supabase
                  .from('profiles')
                  .update({ onboarded: true })
                  .eq('id', session.user.id)
                  .then(() => {
                    setProfile(p => (p ? { ...p, onboarded: true } : p))
                  })
                  .catch(() => {})
              } else {
                window.location.href = '/onboarding'
              }
            }
          }
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      cancelled = true
      clearTimeout(failsafe)
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .abortSignal(controller.signal)

      if (!error) {
        setProfile(data)
        ensureUsername(userId, data)
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }

  // Auto-generate a username from the user's name on first sighting.
  // Runs for Google + email signups and backfills older accounts.
  // Silent by design: never blocks login (e.g. before the DB column exists).
  const ensureUsername = async (userId, profileData) => {
    try {
      if (!userId || profileData?.username) return
      for (let attempt = 0; attempt < 3; attempt++) {
        const candidate = generateUsername(profileData?.full_name)
        const { error } = await supabase
          .from('profiles')
          .update({ username: candidate })
          .eq('id', userId)
        if (!error) {
          setProfile(p => (p ? { ...p, username: candidate } : p))
          return
        }
        // Taken? retry with a fresh suffix. Anything else (e.g. column
        // missing pre-migration) means stop quietly and try another login.
        if (!/duplicate|unique|already exists/i.test(error.message || '')) return
      }
    } catch { /* never break login */ }
  }

  const updateProfile = async (updates) => {
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (!error) setProfile(data)
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    window.location.replace('/')
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signOut,
      updateProfile,
      fetchProfile: () => fetchProfile(user?.id)
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)