import { useState } from 'react'
import { ExplanationBody } from '../../utils/RenderMath'
import { useAuth } from '../../context/AuthContext'
import { saveBookmark } from '../../lib/bookmarks'
import { saveRating } from '../../lib/ratings'

export default function MessageBubble({ message, topic }) {
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)
  const isUser = message.role === 'user'

  const handleSave = async () => {
    if (!user || saved || !message.content) return
    await saveBookmark({
      userId:  user.id,
      type:    'message',
      title:   message.content.slice(0, 60) + (message.content.length > 60 ? '...' : ''),
      content: message.content,
      topic:   topic || 'Teach Module',
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 items-end">
        <div className="max-w-[75%] bg-[var(--color-ink)] text-[var(--color-paper)]
                        rounded-2xl rounded-br-sm px-5 py-3 text-[15px] leading-relaxed">
          {message.content}
        </div>
        <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-ink)]
                        flex items-center justify-center text-white font-bold text-xs">
          You
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 items-start group">
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-teal)]
                      flex items-center justify-center text-white font-bold text-sm">
        E
      </div>

      <div className="flex-1 max-w-[88%]">
        <div className="bg-white border border-[var(--color-border)]
                        rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm">
          {message.loading ? (
            <div className="flex items-center gap-1 py-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-[var(--color-teal)] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          ) : (
            <ExplanationBody text={message.content} />
          )}
        </div>

        {/* Save button — appears on hover */}
        {!message.loading && message.content && user && (
  <div className="mt-1.5 opacity-0 group-hover:opacity-100 flex items-center gap-2
                  transition-all duration-150">
    {/* Thumbs rating */}
    <div className="flex gap-1">
      {[
        { emoji: '👍', val: 5, label: 'helpful' },
        { emoji: '👎', val: 1, label: 'not helpful' },
      ].map(({ emoji, val, label }) => (
        <button
          key={val}
          onClick={async () => {
            await saveRating({
              userId:  user.id,
              type:    'response',
              rating:  val,
              context: message.content?.slice(0, 100),
            })
          }}
          className="text-sm px-2 py-1 rounded-lg border border-[var(--color-border)]
                     bg-white hover:border-[var(--color-teal)] transition-all"
          title={`Mark as ${label}`}
        >
          {emoji}
        </button>
      ))}
    </div>

    {/* Save bookmark */}
    <button
      onClick={handleSave}
      className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1
                  rounded-lg border transition-all duration-150
        ${saved
          ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
          : 'bg-white border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
        }`}
    >
      {saved ? '🔖 Saved!' : '🔖 Save'}
    </button>
  </div>
)}
      </div>
    </div>
  )
}