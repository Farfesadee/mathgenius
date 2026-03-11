// src/components/teach/ChatWindow.jsx
// Drop-in replacement — streaming, working thumbs up/down, copy button

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Streaming helper ──────────────────────────────────────────────────────────
async function streamTeach({ question, topic, level, history, userId, onToken, onDone, onError }) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${API_BASE}/teach/ask/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        question,
        topic:                topic || 'General Mathematics',
        level:                level || 'sss',
        conversation_history: history,
        user_id:              userId || null,
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') { onDone(); return }
        try { onToken(JSON.parse(payload).token) } catch {}
      }
    }
    onDone()
  } catch (err) {
    onError(err.message || 'Could not connect to backend.')
  }
}

// ── Submit feedback ───────────────────────────────────────────────────────────
async function submitFeedback({ messageId, userId, topic, level, question, responsePreview, rating, comment }) {
  try {
    await fetch(`${API_BASE}/teach/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_id:       messageId,
        user_id:          userId,
        topic,
        level,
        question,
        response_preview: responsePreview,
        rating,
        comment,
      }),
    })
  } catch {}   // silent fail — feedback is non-critical
}

// ── Markdown-lite renderer ────────────────────────────────────────────────────
// Handles **bold**, `code`, numbered lists, bullet lists, and LaTeX fences.
// Full KaTeX rendering would need the katex package — this gives readable output.
function renderMessage(text) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Blank line → spacer
    if (!line.trim()) {
      elements.push(<div key={key++} className="h-2" />)
      continue
    }

    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s+(.*)/)
    if (numMatch) {
      elements.push(
        <div key={key++} className="flex gap-2 text-sm leading-relaxed">
          <span className="shrink-0 font-bold text-[var(--color-teal)] w-5">{numMatch[1]}.</span>
          <span dangerouslySetInnerHTML={{ __html: inlineFormat(numMatch[2]) }} />
        </div>
      )
      continue
    }

    // Bullet list
    const bulletMatch = line.match(/^[-*•]\s+(.*)/)
    if (bulletMatch) {
      elements.push(
        <div key={key++} className="flex gap-2 text-sm leading-relaxed">
          <span className="shrink-0 text-[var(--color-teal)] mt-1">•</span>
          <span dangerouslySetInnerHTML={{ __html: inlineFormat(bulletMatch[1]) }} />
        </div>
      )
      continue
    }

    // Heading (##)
    const headingMatch = line.match(/^#{1,3}\s+(.*)/)
    if (headingMatch) {
      elements.push(
        <p key={key++} className="font-bold text-sm text-[var(--color-ink)] mt-2 mb-1">
          {headingMatch[1]}
        </p>
      )
      continue
    }

    // LaTeX display block $$...$$
    if (line.trim().startsWith('$$')) {
      elements.push(
        <div key={key++}
          className="my-2 px-3 py-2 rounded-lg bg-[var(--color-border)]/40 font-mono text-sm text-center overflow-x-auto">
          {line.trim()}
        </div>
      )
      continue
    }

    // Normal paragraph line
    elements.push(
      <p key={key++} className="text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
    )
  }

  return <div className="space-y-0.5">{elements}</div>
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`([^`]+)`/g,     '<code class="px-1 py-0.5 rounded bg-stone-100 font-mono text-xs text-[var(--color-teal)]">$1</code>')
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, topic, level, lastUserQuestion, onFeedbackSent }) {
  const { user } = useAuth()
  const [rating,   setRating]   = useState(msg.rating || null)   // 'up' | 'down' | null
  const [copied,   setCopied]   = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [note,     setNote]     = useState('')

  const isUser = msg.role === 'user'
  const isStreaming = msg.streaming === true

  const handleThumb = async (thumb) => {
    if (rating) return   // already rated
    setRating(thumb)
    if (showNote && thumb === 'down') return   // wait for note submit
    await submitFeedback({
      messageId:       msg.id,
      userId:          user?.id || 'anonymous',
      topic,
      level,
      question:        lastUserQuestion,
      responsePreview: msg.content.slice(0, 300),
      rating:          thumb,
      comment:         '',
    })
    if (thumb === 'down') setShowNote(true)
    onFeedbackSent?.()
  }

  const handleNoteSubmit = async () => {
    await submitFeedback({
      messageId:       msg.id,
      userId:          user?.id || 'anonymous',
      topic,
      level,
      question:        lastUserQuestion,
      responsePreview: msg.content.slice(0, 300),
      rating:          'down',
      comment:         note,
    })
    setShowNote(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-sm
                        bg-[var(--color-ink)] text-[var(--color-paper)] text-sm leading-relaxed">
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Euler avatar + message */}
      <div className="flex gap-3 items-start">
        {/* Avatar */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-teal)]
                        flex items-center justify-center text-white text-xs font-black">
          E
        </div>

        {/* Bubble */}
        <div className="flex-1 min-w-0 rounded-2xl rounded-tl-sm border
                        border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3">
          {renderMessage(msg.content)}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-[var(--color-teal)]
                             ml-0.5 animate-pulse align-text-bottom rounded-sm" />
          )}
        </div>
      </div>

      {/* Action row — only shown when not streaming */}
      {!isStreaming && msg.content && (
        <div className="flex items-center gap-2 pl-11">
          {/* Thumbs up */}
          <button
            onClick={() => handleThumb('up')}
            title="This was helpful"
            disabled={!!rating}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm
                        transition-all border
                        ${rating === 'up'
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-600'
                          : rating
                          ? 'opacity-30 border-[var(--color-border)] text-[var(--color-muted)]'
                          : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50'
                        }`}>
            👍
          </button>

          {/* Thumbs down */}
          <button
            onClick={() => handleThumb('down')}
            title="This wasn't helpful"
            disabled={!!rating}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm
                        transition-all border
                        ${rating === 'down'
                          ? 'bg-red-100 border-red-300 text-red-500'
                          : rating
                          ? 'opacity-30 border-[var(--color-border)] text-[var(--color-muted)]'
                          : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-red-300 hover:text-red-400 hover:bg-red-50'
                        }`}>
            👎
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            title="Copy response"
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs
                       border border-[var(--color-border)] text-[var(--color-muted)]
                       hover:border-[var(--color-teal)] hover:text-[var(--color-teal)]
                       transition-all">
            {copied ? '✓' : '⎘'}
          </button>

          {/* Feedback sent confirmation */}
          {rating && !showNote && (
            <span className="text-xs text-[var(--color-muted)] ml-1">
              {rating === 'up' ? 'Thanks! 🎉' : 'Got it, thanks.'}
            </span>
          )}
        </div>
      )}

      {/* Optional note after thumbs down */}
      {showNote && (
        <div className="pl-11 mt-1 flex gap-2">
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleNoteSubmit()}
            placeholder="What was wrong? (optional)"
            className="flex-1 text-xs border border-[var(--color-border)] rounded-xl
                       px-3 py-2 bg-[var(--color-paper)] focus:border-[var(--color-teal)]
                       focus:outline-none transition-colors"
          />
          <button
            onClick={handleNoteSubmit}
            className="px-3 py-2 rounded-xl bg-[var(--color-teal)] text-white
                       text-xs font-semibold hover:opacity-90 transition-opacity">
            Send
          </button>
          <button
            onClick={() => setShowNote(false)}
            className="px-3 py-2 rounded-xl border border-[var(--color-border)]
                       text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]
                       transition-colors">
            Skip
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main ChatWindow component ─────────────────────────────────────────────────
export default function ChatWindow({ topic, level, conversation, onConversationUpdate }) {
  const { user } = useAuth()
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error,     setError]     = useState(null)
  const bottomRef   = useRef()
  const inputRef    = useRef()
  const textareaRef = useRef()

  // Load messages from Supabase when conversation changes
  useEffect(() => {
    if (!conversation?.id) {
      setMessages([])
      return
    }
    // First try messages already attached to the conv object
    if (conversation?.messages?.length > 0) {
      setMessages(conversation.messages.map(m => ({
        id:      m.id || crypto.randomUUID(),
        role:    m.role,
        content: m.content,
        rating:  m.rating || null,
      })))
    } else {
      // Fallback: load from Supabase directly
      supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          if (data?.length > 0) {
            setMessages(data.map(m => ({ id: m.id, role: m.role, content: m.content })))
          }
        })
    }
  }, [conversation?.id])

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [input])

  // Auto-ask overview when a new topic is selected and no messages yet
  useEffect(() => {
    if (topic && messages.length === 0 && !streaming) {
      sendMessage(`Give me an overview of ${topic}`)
    }
  }, [topic, conversation?.id])

  const sendMessage = useCallback(async (text) => {
    const content = (text || input).trim()
    if (!content || streaming) return

    setInput('')
    setError(null)

    // Add user message
    const userMsg = { id: crypto.randomUUID(), role: 'user', content }
    setMessages(prev => [...prev, userMsg])

    // Add placeholder AI message
    const aiId = crypto.randomUUID()
    setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '', streaming: true }])
    setStreaming(true)

    // Build history for context (exclude the streaming placeholder)
    const history = messages.map(m => ({ role: m.role, content: m.content }))

    await streamTeach({
      question: content,
      topic:    topic || 'General Mathematics',
      level:    level || 'sss',
      history,
      userId:   user?.id,
      onToken: (token) => {
        setMessages(prev => prev.map(m =>
          m.id === aiId ? { ...m, content: m.content + token } : m
        ))
      },
      onDone: async () => {
        setMessages(prev => {
          const updated = prev.map(m =>
            m.id === aiId ? { ...m, streaming: false } : m
          )
          // Save both the user message and completed AI message to Supabase
          if (conversation?.id) {
            const toSave = updated.slice(-2) // last user + AI pair
            toSave.forEach(m => {
              supabase.from('messages').upsert({
                id:              m.id,
                conversation_id: conversation.id,
                role:            m.role,
                content:         m.content,
              }, { onConflict: 'id' }).then(() => {})
            })
          }
          return updated
        })
        setStreaming(false)
        onConversationUpdate?.()
      },
      onError: (msg) => {
        setMessages(prev => prev.map(m =>
          m.id === aiId
            ? { ...m, content: 'Sorry, something went wrong. Please try again.', streaming: false }
            : m
        ))
        setError(msg)
        setStreaming(false)
      },
    })
  }, [input, streaming, messages, topic, level, user])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Find the last user question (used for feedback context)
  const lastUserQuestion = [...messages].reverse().find(m => m.role === 'user')?.content || ''

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!topic) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[var(--color-border)]
                      flex flex-col items-center justify-center min-h-[480px] text-center p-8">
        <p className="text-5xl mb-4">👈</p>
        <p className="font-bold text-[var(--color-ink)] text-lg">Select a topic to start</p>
        <p className="text-[var(--color-muted)] text-sm mt-2 max-w-xs">
          Choose any topic from the sidebar and Euler will explain it, answer your questions,
          and walk you through examples step by step.
        </p>
      </div>
    )
  }

  // ── Chat view ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col rounded-2xl border-2 border-[var(--color-border)]
                    bg-[var(--color-paper)] overflow-hidden" style={{ minHeight: '520px' }}>

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center gap-3
                      bg-gradient-to-r from-[var(--color-teal)]/5 to-transparent">
        <div className="w-8 h-8 rounded-full bg-[var(--color-teal)]
                        flex items-center justify-center text-white text-xs font-black shrink-0">
          E
        </div>
        <div>
          <p className="font-bold text-sm text-[var(--color-ink)]">Euler</p>
          <p className="text-[10px] text-[var(--color-muted)] font-mono uppercase tracking-widest">
            {topic}
          </p>
        </div>
        {streaming && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-[var(--color-teal)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-teal)] animate-pulse" />
            Typing…
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            topic={topic}
            level={level}
            lastUserQuestion={lastUserQuestion}
            onFeedbackSent={onConversationUpdate}
          />
        ))}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            ⚠️ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--color-border)] px-4 py-3 bg-[var(--color-paper)]">
        {/* Quick prompts — only shown when no messages */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              'Show me a worked example',
              'What are the key formulas?',
              'What mistakes should I avoid?',
              'Give me a practice question',
            ].map(q => (
              <button key={q} onClick={() => sendMessage(q)} disabled={streaming}
                className="px-3 py-1.5 rounded-xl text-xs border border-[var(--color-border)]
                           text-[var(--color-muted)] hover:border-[var(--color-teal)]
                           hover:text-[var(--color-teal)] transition-all disabled:opacity-40">
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={streaming ? 'Euler is thinking…' : 'Ask Euler anything about this topic…'}
            disabled={streaming}
            rows={1}
            className="flex-1 resize-none rounded-xl border-2 border-[var(--color-border)]
                       focus:border-[var(--color-teal)] focus:outline-none
                       px-4 py-3 text-sm bg-[var(--color-paper)] transition-colors
                       disabled:opacity-60 leading-snug"
            style={{ maxHeight: '160px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={streaming || !input.trim()}
            className="shrink-0 w-11 h-11 rounded-xl bg-[var(--color-teal)] text-white
                       flex items-center justify-center text-lg font-bold
                       hover:opacity-90 transition-opacity disabled:opacity-40">
            ↑
          </button>
        </div>
        <p className="text-[10px] text-[var(--color-muted)] mt-1.5 text-right">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
