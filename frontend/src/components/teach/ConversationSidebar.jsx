import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  getConversations,
  createConversation,
  deleteConversation,
  renameConversation,
} from '../../lib/conversations'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)   return 'Just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  < 7)   return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  topic,
  level,
}) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [menuOpen,      setMenuOpen]      = useState(null)  // conversation id
  const [renaming,      setRenaming]      = useState(null)  // conversation id
  const [renameValue,   setRenameValue]   = useState('')

  useEffect(() => {
    if (user) loadConversations()
  }, [user])

  const loadConversations = async () => {
    setLoading(true)
    const { data } = await getConversations(user.id)
    setConversations(data || [])
    setLoading(false)
  }

  const handleNew = async () => {
    const { data } = await createConversation(user.id, topic, level)
    if (data) {
      setConversations(prev => [data, ...prev])
      onNewConversation(data)
    }
  }

  const handleDelete = async (id) => {
    await deleteConversation(id)
    setConversations(prev => prev.filter(c => c.id !== id))
    setMenuOpen(null)
    if (currentConversationId === id) onNewConversation(null)
  }

  const handleRename = async (id) => {
    if (!renameValue.trim()) return
    const { data } = await renameConversation(id, renameValue.trim())
    if (data) {
      setConversations(prev => prev.map(c => c.id === id ? data : c))
    }
    setRenaming(null)
    setRenameValue('')
    setMenuOpen(null)
  }

  return (
    <div className="card flex flex-col"
         style={{ maxHeight: 'calc(100vh - 120px)', position: 'sticky', top: '90px' }}>

      {/* Header */}
      <div className="bg-[var(--color-ink)] px-4 py-3 flex items-center
                      justify-between shrink-0">
        <span className="font-serif font-bold text-white">💬 Chats</span>
        <button
          onClick={handleNew}
          title="New conversation"
          className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30
                     text-white flex items-center justify-center
                     text-lg transition-colors"
        >
          +
        </button>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 bg-[var(--color-paper)]">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-[var(--color-border)]
                                      rounded-xl animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[var(--color-muted)] text-sm">No conversations yet</p>
            <button
              onClick={handleNew}
              className="mt-3 text-[var(--color-teal)] text-sm font-semibold
                         hover:underline"
            >
              Start your first chat →
            </button>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map(conv => (
              <div key={conv.id} className="relative group">

                {/* Rename input */}
                {renaming === conv.id ? (
                  <div className="flex gap-2 px-2 py-1">
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter')  handleRename(conv.id)
                        if (e.key === 'Escape') { setRenaming(null); setRenameValue('') }
                      }}
                      className="flex-1 text-sm border-2 border-[var(--color-teal)]
                                 rounded-lg px-2 py-1 bg-white"
                    />
                    <button
                      onClick={() => handleRename(conv.id)}
                      className="text-xs bg-[var(--color-teal)] text-white
                                 px-2 rounded-lg"
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectConversation(conv)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl
                                transition-all duration-100 border-l-2
                      ${currentConversationId === conv.id
                        ? 'bg-[#e8f4f4] border-[var(--color-teal)]'
                        : 'border-transparent hover:bg-[var(--color-cream)]'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate font-medium leading-tight
                          ${currentConversationId === conv.id
                            ? 'text-[var(--color-teal)]'
                            : 'text-[var(--color-ink)]'
                          }`}>
                          {conv.title}
                        </p>
                        <p className="text-[10px] text-[var(--color-muted)] mt-0.5">
                          {timeAgo(conv.updated_at)}
                          {conv.topic && ` · ${conv.topic}`}
                        </p>
                      </div>

                      {/* Context menu button */}
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setMenuOpen(menuOpen === conv.id ? null : conv.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 shrink-0
                                   w-6 h-6 rounded-md hover:bg-[var(--color-border)]
                                   flex items-center justify-center text-[var(--color-muted)]
                                   transition-all text-xs"
                      >
                        ···
                      </button>
                    </div>
                  </button>
                )}

                {/* Dropdown menu */}
                {menuOpen === conv.id && (
                  <div className="absolute right-2 top-10 z-50 bg-white
                                  border-2 border-[var(--color-ink)] rounded-xl
                                  shadow-lg overflow-hidden w-40">
                    <button
                      onClick={() => {
                        setRenaming(conv.id)
                        setRenameValue(conv.title)
                        setMenuOpen(null)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm
                                 hover:bg-[var(--color-cream)] transition-colors"
                    >
                      ✏️ Rename
                    </button>
                    <button
                      onClick={() => {
                        onSelectConversation(conv)
                        setMenuOpen(null)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm
                                 hover:bg-[var(--color-cream)] transition-colors"
                    >
                      📂 Open
                    </button>
                    <div className="border-t border-[var(--color-border)]">
                      <button
                        onClick={() => handleDelete(conv.id)}
                        className="w-full text-left px-4 py-2.5 text-sm
                                   text-red-500 hover:bg-red-50 transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-[var(--color-border)] px-4 py-3
                      bg-[var(--color-cream)]">
        <button
          onClick={handleNew}
          className="w-full btn-primary py-2.5 text-sm justify-center
                     flex items-center gap-2"
        >
          + New Conversation
        </button>
      </div>
    </div>
  )
}