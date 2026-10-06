import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Always start at the top: disables the browser's scroll-position
// restore (which drops users mid-page on refresh) and scrolls to top
// on every route change.
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    try {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual'
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
