import { useState } from 'react'
import { Flag, X, Check } from 'lucide-react'

const REASONS = [
  'Wrong answer',
  'Unclear wording',
  'Typo or formatting issue',
  'Wrong topic',
  'Other',
]

export default function ReportQuestionModal({ open, onClose, onSubmit, sending, sent, error }) {
  const [reason, setReason] = useState(REASONS[0])
  const [note, setNote] = useState('')

  if (!open) return null

  const submit = (e) => {
    e.preventDefault()
    onSubmit?.({ reason, note: note.trim() })
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center
                    justify-center px-4"
      onClick={onClose} role="dialog" aria-modal="true"
      aria-label="Report a problem with this question">
      <div className="w-full max-w-md card bg-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="bg-[var(--color-ink)] px-6 py-5">
          <p className="font-serif font-black text-lg text-white
                        flex items-center gap-2">
            <Flag size={20} /> Report a problem
          </p>
          <p className="text-white/60 text-xs mt-1">
            Tell us what is wrong. Our team reviews every report.
          </p>
        </div>
        {sent ? (
          <div className="bg-white p-6 text-center">
            <Check size={40} className="text-green-500 mx-auto mb-3" />
            <p className="font-bold text-[var(--color-ink)]">
              Thanks for flagging this!
            </p>
            <p className="text-sm text-[var(--color-muted)] mt-1 mb-5">
              Our team will review the question shortly.
            </p>
            <button onClick={onClose}
              className="px-8 py-2.5 rounded-xl text-sm font-bold
                         bg-[var(--color-teal)] text-white
                         hover:bg-[var(--color-ink)] transition-colors">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white p-6 space-y-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest
                            text-[var(--color-muted)] mb-2">
                What is wrong?
              </p>
              <div className="flex flex-wrap gap-2">
                {REASONS.map(r => (
                  <button type="button" key={r} onClick={() => setReason(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold
                                border-2 transition-all
                      ${reason === r
                        ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                        : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-ink)]'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest
                            text-[var(--color-muted)] mb-2">
                Details (optional)
              </p>
              <textarea value={note} onChange={(e) => setNote(e.target.value)}
                rows={3} placeholder="e.g. Step 2 says x = 4 but it should be x = 5"
                className="w-full border-2 border-[var(--color-border)]
                           focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                           text-sm transition-colors resize-none" />
            </div>
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
                           border-2 border-[var(--color-border)]
                           hover:border-[var(--color-ink)] transition-all
                           flex items-center justify-center gap-1">
                <X size={16} /> Cancel
              </button>
              <button type="submit" disabled={sending}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold
                           bg-[var(--color-teal)] text-white
                           hover:bg-[var(--color-ink)] transition-colors
                           disabled:opacity-50 flex items-center justify-center gap-1">
                {sending
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Flag size={16} />}
                {sending ? 'Sending...' : 'Send report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
