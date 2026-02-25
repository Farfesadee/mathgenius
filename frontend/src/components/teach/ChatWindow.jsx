import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import { askTutor, getTopicOverview } from '../../services/api'
import { saveMessage, getMessages, formatConversationAsText } from '../../lib/conversations'
import { useAuth } from '../../context/AuthContext'

const QUICK_QUESTIONS = {
  default: [
    'Explain this topic to me',
    'Give me a worked example',
    'What are the key formulas?',
    'What are common mistakes?',
  ],
  'Quadratic Equations': [
    'What is a quadratic equation?',
    'Solve x² + 5x + 6 = 0',
    'When do I use the quadratic formula?',
    'What are the roots of an equation?',
  ],
  'Bearings and Distances': [
    'What is a bearing?',
    'How do I find distance from a bearing?',
    'Difference between true and magnetic bearing?',
    'Give me a worked example',
  ],
  'Surds and Simplification of Surds': [
    'What is a surd?',
    'How do I simplify √12?',
    'How do I rationalise the denominator?',
    'Give me a worked example',
  ],
}

function getQuickQuestions(topic) {
  return QUICK_QUESTIONS[topic] || QUICK_QUESTIONS.default
}

export default function ChatWindow({ topic, level, conversation, onConversationUpdate }) {
  const { user } = useAuth()
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [copied,    setCopied]    = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const prevConvRef = useRef(null)

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversation) {
      setMessages([])
      return
    }
    if (conversation.id === prevConvRef.current) return
    prevConvRef.current = conversation.id
    loadMessages()
  }, [conversation])

  // Load overview when topic changes on a new conversation
  useEffect(() => {
    if (!topic || !conversation) return
    if (messages.length > 0) return   // don't overwrite existing chat
    loadOverview()
  }, [topic, conversation])

  const loadMessages = async () => {
    if (!conversation?.id) return
    const { data } = await getMessages(conversation.id)
    if (data && data.length > 0) {
      setMessages(data.map(m => ({
        id:      m.id,
        role:    m.role,
        content: m.content,
      })))
    } else if (topic) {
      loadOverview()
    }
  }

  const loadOverview = async () => {
    const loadingId = `loading_${Date.now()}`
    setMessages([{ id: loadingId, role: 'assistant', loading: true }])
    try {
      const res = await getTopicOverview(topic, level)
      const content = res.data.overview
      setMessages([{ id: loadingId, role: 'assistant', content }])
      if (conversation?.id) {
        await saveMessage(conversation.id, 'assistant', content)
      }
    } catch {
      setMessages([{
        id: loadingId,
        role: 'assistant',
        content: '⚠️ Could not load overview. Make sure backend is running.'
      }])
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const question = text || input.trim()
    if (!question || loading) return
    setInput('')

    const userMsg = { id: `u_${Date.now()}`, role: 'user', content: question }
    const loadId  = `l_${Date.now()}`
    setMessages(prev => [...prev, userMsg, { id: loadId, role: 'assistant', loading: true }])
    setLoading(true)

    // Save user message to DB
    if (conversation?.id) {
      await saveMessage(conversation.id, 'user', question)
    }

    // Build history (last 6 messages)
    const history = messages.slice(-6).map(m => ({
      role:    m.role,
      content: m.content || ''
    }))

    try {
      const res     = await askTutor(question, topic, level, history)
      const content = res.data.response

      setMessages(prev => prev.map(m =>
        m.id === loadId ? { id: loadId, role: 'assistant', content } : m
      ))

      // Save assistant message to DB
      if (conversation?.id) {
        await saveMessage(conversation.id, 'assistant', content)
        onConversationUpdate?.()
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === loadId
          ? { id: loadId, role: 'assistant', content: '⚠️ Could not connect to backend.' }
          : m
      ))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleCopy = async () => {
    const text = messages
      .filter(m => !m.loading && m.content)
      .map(m => `${m.role === 'user' ? 'You' : 'Euler'}: ${m.content}`)
      .join('\n\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => {
    const text = messages
      .filter(m => !m.loading && m.content)
      .map(m => `${m.role === 'user' ? 'You' : 'Euler'}:\n${m.content}`)
      .join('\n\n---\n\n')

    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>MathGenius — ${conversation?.title || topic || 'Conversation'}</title>
          <style>
            body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto;
                   padding: 0 20px; line-height: 1.7; color: #1a1a1a; }
            h1   { font-size: 1.5rem; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; }
            .meta { color: #666; font-size: 0.85rem; margin-bottom: 30px; }
            .msg  { margin-bottom: 24px; }
            .speaker { font-weight: bold; font-size: 0.8rem;
                       text-transform: uppercase; letter-spacing: 0.1em;
                       color: #666; margin-bottom: 4px; }
            .content { white-space: pre-wrap; }
            .euler .speaker { color: #2a7c7c; }
          </style>
        </head>
        <body>
          <h1>MathGenius Conversation</h1>
          <div class="meta">
            Topic: ${topic || 'General'} &nbsp;|&nbsp;
            Date: ${new Date().toLocaleDateString()}
          </div>
          ${messages.filter(m => !m.loading && m.content).map(m => `
            <div class="msg ${m.role === 'assistant' ? 'euler' : ''}">
              <div class="speaker">${m.role === 'user' ? 'You' : 'Euler'}</div>
              <div class="content">${m.content}</div>
            </div>
          `).join('')}
        </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="card flex flex-col"
         style={{ height: 'calc(100vh - 120px)', position: 'sticky', top: '90px' }}>

      {/* Header */}
      <div className="bg-[var(--color-teal)] px-5 py-3 shrink-0
                      flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center
                          justify-center text-white font-bold font-serif">
            E
          </div>
          <div>
            <p className="font-serif font-bold text-white leading-none">Euler</p>
            <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              {topic || 'Select a topic'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {messages.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              title="Copy conversation"
              className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20
                         rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            >
              {copied ? '✅ Copied' : '📋 Copy'}
            </button>
            <button
              onClick={handlePrint}
              title="Print conversation"
              className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20
                         rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            >
              🖨️ Print
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5
                      bg-[var(--color-paper)]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="text-6xl mb-4">🧮</div>
            <h3 className="font-serif font-bold text-2xl text-[var(--color-ink)] mb-2">
              {user ? `Welcome back!` : 'Welcome to Euler'}
            </h3>
            <p className="text-[var(--color-muted)] text-base leading-relaxed max-w-sm">
              Select any topic from the sidebar and Euler will explain it fully,
              step by step.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      {topic && !loading && messages.length > 0 && (
        <div className="px-4 py-2 bg-[var(--color-cream)] border-t
                        border-[var(--color-border)] flex gap-2 flex-wrap shrink-0">
          {getQuickQuestions(topic).map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-xs px-3 py-1.5 bg-white border border-[var(--color-border)]
                         rounded-full text-[var(--color-ink)] font-medium
                         hover:bg-[var(--color-teal)] hover:text-white
                         hover:border-[var(--color-teal)] transition-all duration-150"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t-2 border-[var(--color-ink)]
                      flex gap-3 items-end shrink-0">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={!topic}
          rows={1}
          placeholder={topic ? `Ask anything about ${topic}...` : 'Select a topic first'}
          className="flex-1 bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                     focus:border-[var(--color-teal)] rounded-xl px-4 py-2.5 text-sm
                     text-[var(--color-ink)] placeholder:text-[var(--color-muted)]
                     resize-none transition-colors duration-150 disabled:opacity-50"
          style={{ minHeight: '44px', maxHeight: '120px' }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!topic || loading || !input.trim()}
          className="w-11 h-11 bg-[var(--color-teal)] hover:bg-[var(--color-teal-light)]
                     disabled:opacity-40 rounded-xl flex items-center justify-center
                     text-white transition-all shrink-0"
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white
                               rounded-full animate-spin" />
            : '➤'
          }
        </button>
      </div>
    </div>
  )
}