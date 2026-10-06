import { useEffect, useState } from 'react'

export default function ScrollProgress() {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      setPct(total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-[60] bg-transparent pointer-events-none"
      role="progressbar" aria-label="Page scroll progress"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <div className="h-full bg-[var(--color-teal)] transition-[width] duration-100"
        style={{ width: `${pct}%` }} />
    </div>
  )
}
