import { useState, useEffect } from 'react'

const TEACH_LEVEL_KEY = 'mathgenius_teach_level'
import TopicSidebar from '../components/teach/TopicSidebar'
import ChatWindow from '../components/teach/ChatWindow'
import ConversationSidebar from '../components/teach/ConversationSidebar'
import { useAuth } from '../context/AuthContext'
import { createConversation } from '../lib/conversations'

export default function Teach() {
  const { user, profile, updateProfile } = useAuth()
  const [selectedTopic,        setSelectedTopic]        = useState(null)
  const [selectedLevel, setSelectedLevel] = useState(
    () => { try { return localStorage.getItem(TEACH_LEVEL_KEY) || 'secondary' } catch { return 'secondary' } }
  )

  // Persist whenever level changes → localStorage (fast) + Supabase profile (cross-device)
  useEffect(() => {
    try { localStorage.setItem(TEACH_LEVEL_KEY, selectedLevel) } catch {}
    if (profile && profile.level !== selectedLevel) {
      updateProfile({ level: selectedLevel }).catch(() => {})
    }
  }, [selectedLevel])
  const [currentConversation,  setCurrentConversation]  = useState(null)
  const [convRefreshKey,       setConvRefreshKey]        = useState(0)

  const handleTopicSelect = async (topic) => {
    setSelectedTopic(topic)
    if (user) {
      const { data } = await createConversation(user.id, topic, selectedLevel)
      if (data) setCurrentConversation(data)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleNewConversation = (conv) => {
    setCurrentConversation(conv)
  }

  const handleConversationUpdate = () => {
    setConvRefreshKey(k => k + 1)
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10">
      {/* Page header */}
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase
                      text-[var(--color-gold)] mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" />
          Teach Module
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight">
          Learn with Euler
        </h1>
        <p className="text-[var(--color-muted)] mt-2 text-lg">
          Select a topic, start a conversation, and let Euler guide you step by step.
        </p>
      </div>

      {/* 3-column layout: Topics | Chat | Conversations */}
      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_260px] gap-6 items-start">

        {/* Topics sidebar */}
        <TopicSidebar
          selectedTopic={selectedTopic}
          selectedLevel={selectedLevel}
          onTopicSelect={handleTopicSelect}
          onLevelChange={(level) => {
            setSelectedLevel(level)
            setSelectedTopic(null)
          }}
        />

        {/* Chat window */}
        <ChatWindow
          key={currentConversation?.id}
          topic={selectedTopic}
          level={selectedLevel}
          conversation={currentConversation}
          onConversationUpdate={handleConversationUpdate}
        />

        {/* Conversation history */}
        {user && (
          <ConversationSidebar
            key={convRefreshKey}
            currentConversationId={currentConversation?.id}
            onSelectConversation={(conv) => {
              setCurrentConversation(conv)
              if (conv.topic) setSelectedTopic(conv.topic)
            }}
            onNewConversation={handleNewConversation}
            topic={selectedTopic}
            level={selectedLevel}
          />
        )}
      </div>
    </div>
  )
}
