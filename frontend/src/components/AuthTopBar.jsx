import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, LifeBuoy } from 'lucide-react'

// Minimal top bar for layout-free auth pages (login, signup,
// forgot/reset password) so they never feel stranded.
export default function AuthTopBar() {
  const navigate = useNavigate()

  return (
    <div className="w-full max-w-md mx-auto flex items-center justify-between px-1 pb-2">
      <button onClick={() => navigate('/')}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs
                   font-bold border-2 border-[var(--color-border)]
                   text-[var(--color-ink)] bg-white
                   hover:border-[var(--color-ink)] transition-all">
        <ArrowLeft size={14} /> Back
      </button>
      <Link to="/contact"
        className="flex items-center gap-1.5 text-xs font-semibold
                   text-[var(--color-muted)]
                   hover:text-[var(--color-teal)] transition-colors">
        <LifeBuoy size={14} /> Need help?
      </Link>
    </div>
  )
}
