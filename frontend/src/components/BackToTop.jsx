import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export default function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!show) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="Back to top"
      aria-label="Back to top"
      className="fixed right-6 bottom-24 z-50 w-12 h-12 rounded-full
                 bg-[var(--color-ink)] text-[var(--color-paper)]
                 flex items-center justify-center shadow-lg
                 hover:bg-[var(--color-teal)] hover:-translate-y-0.5
                 transition-all">
      <ArrowUp size={20} />
    </button>
  )
}
