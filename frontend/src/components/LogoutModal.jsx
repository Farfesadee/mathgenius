import { useEffect } from 'react'
import { LogOut, X } from 'lucide-react'

export default function LogoutModal({ open, onCancel, onConfirm, signingOut }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center
                    justify-center px-4"
      onClick={onCancel} role="dialog" aria-modal="true"
      aria-label="Confirm log out">
      <div className="w-full max-w-sm card bg-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="bg-[var(--color-ink)] px-6 py-6 text-center">
          <LogOut size={40} className="text-white mx-auto mb-3" />
          <h2 className="font-serif font-black text-xl text-white">
            Log out?
          </h2>
          <p className="text-white/60 mt-1 text-sm">
            Are you sure you want to log out of MathGenius?
          </p>
        </div>
        <div className="bg-white p-5 flex gap-3">
          <button onClick={onCancel} disabled={signingOut}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
                       border-2 border-[var(--color-border)]
                       text-[var(--color-ink)]
                       hover:border-[var(--color-ink)] transition-all
                       disabled:opacity-50 flex items-center justify-center gap-1">
            <X size={16} /> Stay
          </button>
          <button onClick={onConfirm} disabled={signingOut}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold
                       bg-red-500 text-white
                       hover:bg-red-600 transition-colors
                       disabled:opacity-50 flex items-center justify-center gap-1">
            {signingOut
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <LogOut size={16} />}
            {signingOut ? 'Logging out...' : 'Yes, log out'}
          </button>
        </div>
      </div>
    </div>
  )
}
