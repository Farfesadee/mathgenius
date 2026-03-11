import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { generateBattleQuestions, gradeBattleAnswer } from '../services/api'
import {
  createBattleRoom, joinBattleRoom, getBattleRoom, saveRoomQuestions,
  submitBattleAnswer, finishBattleForPlayer, getBattleAnswers,
  subscribeToBattleRoom,
} from '../lib/social2'
import { ExplanationBody } from '../utils/RenderMath'

const DIFFICULTY_CONFIG = {
  easy:   { label: 'Easy',   emoji: '🟢', color: 'text-green-600 bg-green-50 border-green-200' },
  medium: { label: 'Medium', emoji: '🟡', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  hard:   { label: 'Hard',   emoji: '🔴', color: 'text-red-600 bg-red-50 border-red-200' },
}
const LEVELS = ['primary', 'jss', 'secondary', 'university']
const LEVEL_LABELS = { primary: '📚 Primary', jss: '🏫 JSS', secondary: '🎓 Secondary', university: '🏛️ University' }

// ── Phase components ──────────────────────────────────────────────────────

function WaitingRoom({ room, user, onCancel }) {
  const isHost = room.host_id === user.id
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(room.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center">
      <div className="card overflow-hidden">
        <div className="bg-[var(--color-teal)] px-6 py-8">
          <div className="text-5xl mb-3">⚔️</div>
          <p className="font-serif font-bold text-white text-2xl">Battle Room</p>
          <p className="text-white/70 text-sm mt-1">{room.topic} · {room.level}</p>
        </div>
        <div className="bg-white p-8 space-y-6">
          {isHost ? (
            <>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-2">
                  Share this code with your opponent
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                                  rounded-2xl py-4 text-4xl font-black font-mono tracking-[0.3em]
                                  text-[var(--color-teal)] text-center">
                    {room.code}
                  </div>
                  <button onClick={copyCode}
                    className="btn-secondary px-4 py-4 rounded-2xl text-sm">
                    {copied ? '✅' : '📋'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200
                              rounded-xl px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-sm text-amber-800">Waiting for opponent to join...</p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200
                            rounded-xl px-4 py-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-sm text-green-800">Joined! Waiting for battle to load...</p>
            </div>
          )}
          <button onClick={onCancel} className="text-xs text-[var(--color-muted)] hover:text-red-500
                                                 font-mono uppercase tracking-widest">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function ResultsScreen({ room, myAnswers, opponentAnswers, user, onPlayAgain }) {
  const isHost  = room.host_id === user.id
  const myScore = isHost ? room.host_score : room.guest_score
  const opScore = isHost ? room.guest_score : room.host_score
  const won     = room.winner_id === user.id
  const tied    = !room.winner_id && room.status === 'finished'

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <div className="card overflow-hidden">
        {/* Result header */}
        <div className={`px-6 py-8 text-center
          ${won ? 'bg-[var(--color-teal)]' : tied ? 'bg-purple-600' : 'bg-slate-700'}`}>
          <div className="text-6xl mb-2">{won ? '🏆' : tied ? '🤝' : '😤'}</div>
          <p className="font-serif font-bold text-white text-2xl">
            {won ? 'You Won!' : tied ? 'It\'s a Tie!' : 'You Lost'}
          </p>
          <p className="text-white/70 text-sm mt-1">{room.topic}</p>
        </div>

        <div className="bg-white p-6 space-y-5">
          {/* Score comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center bg-[var(--color-paper)] rounded-2xl p-4 border-2
                            border-[var(--color-teal)]">
              <p className="text-3xl font-black font-serif text-[var(--color-teal)]">{myScore}%</p>
              <p className="text-xs font-mono uppercase tracking-wide text-[var(--color-muted)] mt-1">
                You
              </p>
            </div>
            <div className="text-center bg-[var(--color-paper)] rounded-2xl p-4 border-2
                            border-[var(--color-border)]">
              <p className="text-3xl font-black font-serif text-[var(--color-ink)]">{opScore}%</p>
              <p className="text-xs font-mono uppercase tracking-wide text-[var(--color-muted)] mt-1">
                Opponent
              </p>
            </div>
          </div>

          {/* Per-question breakdown */}
          {myAnswers.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-2">
                Question Breakdown
              </p>
              <div className="space-y-1.5">
                {myAnswers.map((a, i) => {
                  const opA = opponentAnswers.find(o => o.question_idx === i)
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-[var(--color-paper)] border
                                       border-[var(--color-border)] flex items-center justify-center
                                       text-xs font-bold text-[var(--color-muted)]">
                        {i + 1}
                      </span>
                      <span>{a.is_correct ? '✅' : '❌'} You</span>
                      <span className="text-[var(--color-muted)]">vs</span>
                      <span>{opA?.is_correct ? '✅' : '❌'} Opponent</span>
                      {a.time_taken > 0 && (
                        <span className="ml-auto text-xs text-[var(--color-muted)]">
                          {a.time_taken}s
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <button onClick={onPlayAgain} className="btn-primary w-full py-4 justify-center">
            ⚔️ Play Again
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Battle component ─────────────────────────────────────────────────
export default function Battle() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // ── Setup state
  const [phase,      setPhase]      = useState('setup')  // setup|waiting|playing|finished
  const [topic,      setTopic]      = useState('')
  const [level,      setLevel]      = useState('secondary')
  const [difficulty, setDifficulty] = useState('medium')
  const [joinCode,   setJoinCode]   = useState('')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  // ── Room + battle state
  const [room,       setRoom]       = useState(null)
  const [questions,  setQuestions]  = useState([])   // [{question, answer, hints}]
  const [qIdx,       setQIdx]       = useState(0)
  const [myAnswer,   setMyAnswer]   = useState('')
  const [submitted,  setSubmitted]  = useState(false)
  const [gradeResult,setGradeResult]= useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [hintLevel,  setHintLevel]  = useState(0)
  const [myAnswers,  setMyAnswers]  = useState([])   // local cache of my answers
  const [opAnswers,  setOpAnswers]  = useState([])
  const [elapsed,    setElapsed]    = useState(0)
  const timerRef  = useRef(null)
  const channelRef = useRef(null)

  // Auto-join from URL param ?join=CODE
  useEffect(() => {
    const code = searchParams.get('join')
    if (code) { setJoinCode(code); handleJoinRoom(code) }
  }, [])

  // Timer
  useEffect(() => {
    if (phase === 'playing' && !submitted) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [phase, qIdx, submitted])

  // Subscribe to room changes via Supabase Realtime
  const subscribeToRoom = (roomId) => {
    if (channelRef.current) channelRef.current.unsubscribe()
    channelRef.current = subscribeToBattleRoom(roomId, async (payload) => {
      const updated = payload.new
      setRoom(updated)
      if (updated.status === 'active' && phase === 'waiting') {
        // Both players connected — load questions
        await activateBattle(updated)
      }
      if (updated.status === 'finished') {
        const { data: answers } = await getBattleAnswers(roomId)
        const mine = answers?.filter(a => a.user_id === user.id) || []
        const theirs = answers?.filter(a => a.user_id !== user.id) || []
        setMyAnswers(mine); setOpAnswers(theirs)
        setPhase('finished')
      }
    })
  }

  const activateBattle = async (r) => {
    setRoom(r)
    // Host generates questions, saves to room; guest reads from room
    let qs = r.questions || []
    if (!qs.length) {
      // Race condition protection: if guest arrives first, poll briefly
      await new Promise(res => setTimeout(res, 800))
      const { data: fresh } = await getBattleRoom(r.id)
      qs = fresh?.questions || []
    }
    if (qs.length === 5) {
      setQuestions(qs)
      setPhase('playing')
      setQIdx(0); setElapsed(0)
    }
  }

  // ── Create room ───────────────────────────────────────────────────────
  const handleCreateRoom = async () => {
    if (!topic.trim()) { setError('Choose a topic first'); return }
    setLoading(true); setError('')
    const { data: newRoom, error: err } = await createBattleRoom(user.id, topic, level, difficulty)
    if (err || !newRoom) { setError('Failed to create room'); setLoading(false); return }

    // Host generates questions immediately
    const { data: qData } = await generateBattleQuestions(topic, level, difficulty)
    if (qData?.questions?.length === 5) {
      await saveRoomQuestions(newRoom.id, qData.questions)
    }
    setRoom(newRoom)
    subscribeToRoom(newRoom.id)
    setPhase('waiting')
    setLoading(false)
  }

  // ── Join room ─────────────────────────────────────────────────────────
  const handleJoinRoom = async (code) => {
    const c = (code || joinCode).trim()
    if (!c) { setError('Enter a room code'); return }
    setLoading(true); setError('')
    const { data: joined, error: err } = await joinBattleRoom(user.id, c)
    if (err || !joined) { setError(err || 'Failed to join room'); setLoading(false); return }
    setRoom(joined)
    subscribeToRoom(joined.id)
    setPhase('waiting')
    // Check if questions already loaded (host was fast)
    if (joined.questions?.length === 5) {
      setQuestions(joined.questions)
      setPhase('playing')
      setQIdx(0); setElapsed(0)
    }
    setLoading(false)
  }

  // ── Submit answer during battle ────────────────────────────────────────
  const handleSubmit = async () => {
    if (!myAnswer.trim() || submitted) return
    clearInterval(timerRef.current)
    setSubmitted(true)
    const q = questions[qIdx]
    const { data: grade } = await gradeBattleAnswer(room.topic, q.question, q.answer, myAnswer)
    setGradeResult(grade)

    const isCorrect = grade?.is_correct || false
    await submitBattleAnswer(room.id, user.id, qIdx, myAnswer, isCorrect, elapsed)
    setMyAnswers(prev => [...prev, { question_idx: qIdx, answer: myAnswer, is_correct: isCorrect, time_taken: elapsed }])
  }

  // ── Next question ──────────────────────────────────────────────────────
  const handleNext = async () => {
    if (qIdx >= 4) {
      // All 5 done — calculate score
      const correct = [...myAnswers, { is_correct: gradeResult?.is_correct }]
        .filter(Boolean).filter(a => a.is_correct).length
      const pct = Math.round((correct / 5) * 100)
      const isHost = room.host_id === user.id
      await finishBattleForPlayer(room.id, user.id, isHost, pct)
      // Results will come via realtime subscription
    } else {
      setQIdx(i => i + 1)
      setMyAnswer(''); setSubmitted(false); setGradeResult(null)
      setShowAnswer(false); setHintLevel(0); setElapsed(0)
    }
  }

  const handleCancel = () => {
    if (channelRef.current) channelRef.current.unsubscribe()
    setPhase('setup'); setRoom(null); setQuestions([])
    setMyAnswers([]); setOpAnswers([])
  }

  // ── SETUP SCREEN ──────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-gold)] mb-1">
            Social Mode
          </p>
          <h1 className="font-serif font-black text-4xl text-[var(--color-ink)]">
            ⚔️ Head-to-Head Battle
          </h1>
          <p className="text-[var(--color-muted)] mt-2">
            Challenge another student — same 5 questions, first to finish with the higher score wins.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Create room */}
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-teal)] px-5 py-4">
              <p className="font-serif font-bold text-white">🏠 Create a Room</p>
              <p className="text-white/70 text-xs mt-0.5">Set the topic and share your code</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] mb-1.5">Topic</label>
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Quadratic Equations"
                  className="w-full border-2 border-[var(--color-border)] focus:border-[var(--color-teal)]
                             rounded-xl px-3 py-2.5 text-sm transition-colors"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] mb-1.5">Level</label>
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map(l => (
                    <button key={l} onClick={() => setLevel(l)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors
                        ${level === l
                          ? 'bg-[var(--color-teal)] text-white border-[var(--color-teal)]'
                          : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-teal)]'}`}>
                      {LEVEL_LABELS[l]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] mb-1.5">Difficulty</label>
                <div className="flex gap-2">
                  {['easy', 'medium', 'hard'].map(d => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className={`flex-1 text-xs px-2 py-2 rounded-lg border font-medium transition-colors
                        ${difficulty === d ? DIFFICULTY_CONFIG[d].color + ' border-current'
                          : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                      {DIFFICULTY_CONFIG[d].emoji} {DIFFICULTY_CONFIG[d].label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreateRoom}
                disabled={loading || !topic.trim()}
                className="btn-primary w-full py-3 justify-center disabled:opacity-50">
                {loading ? 'Creating...' : '⚔️ Create Room'}
              </button>
            </div>
          </div>

          {/* Join room */}
          <div className="card overflow-hidden">
            <div className="bg-slate-800 px-5 py-4">
              <p className="font-serif font-bold text-white">🔑 Join a Room</p>
              <p className="text-white/70 text-xs mt-0.5">Enter the 6-character code</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] mb-1.5">Room Code</label>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="w-full border-2 border-[var(--color-border)] focus:border-slate-600
                             rounded-xl px-3 py-2.5 text-sm font-mono tracking-widest
                             uppercase transition-colors text-center text-2xl font-bold"
                />
              </div>
              <button
                onClick={() => handleJoinRoom()}
                disabled={loading || joinCode.length < 6}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold
                           py-3 rounded-xl transition-colors disabled:opacity-50 text-sm">
                {loading ? 'Joining...' : '🚀 Join Battle'}
              </button>
              <p className="text-xs text-[var(--color-muted)] text-center">
                Ask your opponent for their room code
              </p>
            </div>
          </div>

        </div>
      </div>
    )
  }

  // ── WAITING ROOM ─────────────────────────────────────────────────────
  if (phase === 'waiting') {
    return <WaitingRoom room={room} user={user} onCancel={handleCancel} />
  }

  // ── FINISHED ─────────────────────────────────────────────────────────
  if (phase === 'finished') {
    return <ResultsScreen
      room={room} user={user}
      myAnswers={myAnswers} opponentAnswers={opAnswers}
      onPlayAgain={handleCancel}
    />
  }

  // ── PLAYING ──────────────────────────────────────────────────────────
  const q = questions[qIdx]
  if (!q) return <div className="p-10 text-center text-[var(--color-muted)]">Loading question…</div>

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-gold)]">
            ⚔️ Battle · {room.topic}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className={`h-2 flex-1 rounded-full transition-colors
                ${i < qIdx ? 'bg-[var(--color-teal)]'
                  : i === qIdx ? 'bg-[var(--color-gold)]'
                  : 'bg-[var(--color-border)]'}`} />
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs text-[var(--color-muted)]">Q{qIdx + 1}/5</p>
          <p className="font-mono text-lg font-bold text-[var(--color-ink)]">
            ⏱ {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          </p>
        </div>
      </div>

      {/* Question card */}
      <div className="card p-6 space-y-5">
        <div className="bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                        rounded-2xl p-5 text-[var(--color-ink)] leading-relaxed font-medium">
          <ExplanationBody text={q.question} />
        </div>

        {/* Progressive hints */}
        {q.hints?.length > 0 && !submitted && (
          <div className="space-y-2">
            {q.hints.slice(0, hintLevel).map((h, i) => (
              <div key={i} className={`rounded-xl px-4 py-3 text-sm border
                ${i === 0 ? 'bg-yellow-50 border-yellow-200 text-yellow-900'
                  : i === 1 ? 'bg-orange-50 border-orange-200 text-orange-900'
                  : 'bg-red-50 border-red-200 text-red-900'}`}>
                <span className="font-bold text-xs uppercase tracking-wide mr-2">
                  {i === 0 ? '💡 Hint 1' : i === 1 ? '🔍 Hint 2' : '🗺️ Hint 3'}
                </span>{h}
              </div>
            ))}
            {hintLevel < q.hints.length && (
              <button onClick={() => setHintLevel(l => l + 1)}
                className="text-xs font-mono uppercase tracking-widest
                           text-[var(--color-muted)] hover:text-yellow-600 transition-colors">
                {hintLevel === 0 ? '💡 Show Hint' : 'Show Next Hint'}
              </button>
            )}
          </div>
        )}

        {/* Answer input */}
        {!submitted ? (
          <div className="space-y-3">
            <textarea
              value={myAnswer}
              onChange={e => setMyAnswer(e.target.value)}
              placeholder="Type your answer here…"
              rows={3}
              className="w-full border-2 border-[var(--color-border)]
                         focus:border-[var(--color-teal)] rounded-2xl px-4 py-3
                         text-sm resize-none transition-colors"
            />
            <button
              onClick={handleSubmit}
              disabled={!myAnswer.trim()}
              className="btn-primary w-full py-4 justify-center text-base disabled:opacity-50">
              Submit ➤
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Grade result */}
            <div className={`rounded-2xl px-5 py-4 border-2
              ${gradeResult?.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`font-bold text-sm ${gradeResult?.is_correct ? 'text-green-700' : 'text-red-600'}`}>
                {gradeResult?.is_correct ? '✅ Correct!' : '❌ Wrong'} — {gradeResult?.feedback}
              </p>
            </div>

            {/* Show answer */}
            <div>
              <button onClick={() => setShowAnswer(a => !a)}
                className="text-xs font-mono uppercase tracking-widest
                           text-[var(--color-muted)] hover:text-[var(--color-teal)]">
                {showAnswer ? '▲ Hide solution' : '▼ Show full solution'}
              </button>
              {showAnswer && (
                <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4
                                text-sm text-[var(--color-ink)] whitespace-pre-wrap leading-relaxed">
                  <ExplanationBody text={q.answer} />
                </div>
              )}
            </div>

            <button
              onClick={handleNext}
              className="btn-primary w-full py-4 justify-center">
              {qIdx >= 4 ? '🏁 Finish Battle' : 'Next Question →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
