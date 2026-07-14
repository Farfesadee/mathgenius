import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { saveRating } from '../lib/ratings'
import { Heart, Star, Loader } from 'lucide-react'

export default function AppRating({ context = 'general' }) {
  const { user } = useAuth()
  const [hovered,   setHovered]   = useState(0)
  const [selected,  setSelected]  = useState(0)
  const [comment,   setComment]   = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading,   setLoading]   = useState(false)

  if (!user || submitted) {
    return submitted ? (
      <div className="text-center py-4">
        <Heart size={24} className="inline-block text-red-400 mx-auto" />
        <p className="text-sm text-[var(--color-teal)] font-medium mt-1">
          Thanks for your feedback!
        </p>
      </div>
    ) : null
  }

  const handleSubmit = async () => {
    if (!selected) return
    setLoading(true)
    await saveRating({
      userId:  user.id,
      type:    'app',
      rating:  selected,
      comment: comment.trim() || null,
      context,
    })
    setSubmitted(true)
    setLoading(false)
  }

  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

  return (
    <div className="card bg-white p-6 text-center">
      <p className="font-serif font-bold text-lg text-[var(--color-ink)] mb-1">
        How are we doing?
      </p>
      <p className="text-sm text-[var(--color-muted)] mb-4">
        Rate your MathGenius experience
      </p>

      {/* Stars */}
      <div className="flex justify-center gap-2 mb-3">
        {[1,2,3,4,5].map(star => (
          <button
            key={star}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setSelected(star)}
            className="text-3xl transition-all duration-100 hover:scale-110"
          >
            {star <= (hovered || selected) ? <Star className="fill-yellow-500 text-yellow-500" size={24} /> : <Star className="text-gray-300" size={24} />}
          </button>
        ))}
      </div>

      {(hovered || selected) > 0 && (
        <p className="text-sm font-semibold text-[var(--color-teal)] mb-3">
          {labels[hovered || selected]}
        </p>
      )}

      {selected > 0 && (
        <>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Any comments? (optional)"
            rows={2}
            className="w-full bg-[var(--color-paper)] border border-[var(--color-border)]
                       focus:border-[var(--color-teal)] rounded-xl px-3 py-2
                       text-sm resize-none transition-colors mb-3"
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary px-8 py-2.5 text-sm justify-center
                       flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            {loading ? <Loader className="animate-spin" size={18} /> : 'Submit Rating'}
          </button>
        </>
      )}
    </div>
  )
}