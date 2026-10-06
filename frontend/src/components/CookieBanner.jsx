import { useEffect, useState } from 'react'
import { Cookie } from 'lucide-react'

const KEY = 'mg_cookie_ok'

export default function CookieBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let stored = null
    try { stored = localStorage.getItem(KEY) } catch { stored = '1' }
    if (!stored) {
      const t = setTimeout(() => setShow(true), 1200)
      return () => clearTimeout(t)
    }
  }, [])

  const accept = () => {
    try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-sm z-[70]
                    card bg-white p-4 flex items-start gap-3 shadow-xl">
      <Cookie size={24} className="shrink-0 text-[var(--color-gold)] mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-[var(--color-ink)] leading-snug">
          We use cookies to keep you signed in and remember your preferences.
        </p>
        <button onClick={accept}
          className="mt-3 px-5 py-2 rounded-xl text-xs font-bold
                     bg-[var(--color-teal)] text-white
                     hover:bg-[var(--color-ink)] transition-colors">
          Got it
        </button>
      </div>
    </div>
  )
}
