import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSearchParams } from 'react-router-dom'
import { generateQuestion, gradeAnswer, getWorkedExample, getRetryQuestion } from '../services/api'
import { createSession, saveAttempt, completeSession, getSessionHistory } from '../lib/practice'
import { submitAssignment, getMyAssignments, checkAndCreateStrugglingAlert } from '../lib/social2'
import { getConversations } from '../lib/conversations'
import { ExplanationBody } from '../utils/RenderMath'
import {
  updateStreak, getStreak,
  updateTopicMastery, getTopicMastery,
  updateSpacedRepetition, getDueTopics,
} from '../lib/learning'
import { updateTopicProgress } from '../lib/progress'

// ── Video helpers ─────────────────────────────────────────────────────────────
async function fetchVideos(topic, level) {
  const normalised = level === 'secondary' ? 'sss' : level
  const { data } = await supabase
    .from('topic_videos')
    .select('*')
    .ilike('topic', topic)
    .eq('level', normalised)
    .order('view_count', { ascending: false })
    .limit(3)
  return data || []
}

async function fetchVideosByLevel(level) {
  const normalised = level === 'secondary' ? 'sss' : level
  const { data } = await supabase
    .from('topic_videos')
    .select('*')
    .eq('level', normalised)
    .order('topic')
  return data || []
}

async function incrementViewCount(videoId) {
  await supabase.rpc('increment_video_views', { video_id: videoId }).catch(() => {})
}

// ── Video Card ────────────────────────────────────────────────────────────────
function VideoCard({ video, compact = false }) {
  const [playing, setPlaying] = useState(false)
  const thumb = `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`

  const handlePlay = () => {
    setPlaying(true)
    incrementViewCount(video.id)
  }

  if (playing) {
    return (
      <div className={`rounded-2xl overflow-hidden border-2 border-[var(--color-border)]
                       ${compact ? '' : 'w-full'}`}>
        <div className="relative" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            allowFullScreen
          />
        </div>
        <div className="bg-white px-4 py-3">
          <p className="font-semibold text-sm text-[var(--color-ink)] leading-snug">{video.title}</p>
          {video.channel && <p className="text-xs text-[var(--color-muted)] mt-0.5">📺 {video.channel}</p>}
        </div>
      </div>
    )
  }

  return (
    <button onClick={handlePlay}
      className="group rounded-2xl overflow-hidden border-2 border-[var(--color-border)]
                 hover:border-red-400 transition-all text-left w-full">
      <div className="relative overflow-hidden bg-black">
        <img src={thumb} alt={video.title}
          className="w-full object-cover group-hover:opacity-80 transition-opacity"
          style={{ aspectRatio: '16/9' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-600/90 group-hover:bg-red-600
                          flex items-center justify-center shadow-lg transition-all group-hover:scale-110">
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
            </svg>
          </div>
        </div>
        {video.duration_mins && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px]
                           font-mono px-1.5 py-0.5 rounded">
            {video.duration_mins}m
          </span>
        )}
      </div>
      <div className="bg-white px-3 py-2.5">
        <p className="font-semibold text-xs text-[var(--color-ink)] leading-snug line-clamp-2
                      group-hover:text-red-700 transition-colors">
          {video.title}
        </p>
        <div className="flex items-center justify-between mt-1">
          {video.channel && <p className="text-[10px] text-[var(--color-muted)] truncate">{video.channel}</p>}
          {video.tags?.includes('WAEC') && (
            <span className="shrink-0 ml-1 px-1.5 py-0.5 rounded bg-green-100 text-green-700
                             text-[9px] font-bold uppercase tracking-wide">WAEC</span>
          )}
        </div>
        {video.description && !compact && (
          <p className="text-[10px] text-[var(--color-muted)] mt-1 line-clamp-1">{video.description}</p>
        )}
      </div>
    </button>
  )
}

// ── Video Panel (shown after wrong answer) ────────────────────────────────────
function VideoPanel({ topic, level }) {
  const [videos,  setVideos]  = useState([])
  const [loading, setLoading] = useState(true)
  const [open,    setOpen]    = useState(false)

  useEffect(() => {
    fetchVideos(topic, level).then(v => { setVideos(v); setLoading(false) })
  }, [topic, level])

  if (loading || videos.length === 0) return null

  return (
    <div className="rounded-2xl border-2 border-red-200 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3
                   bg-red-50 hover:bg-red-100 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-lg">📺</span>
          <div className="text-left">
            <p className="font-semibold text-sm text-red-800">Watch a video explanation</p>
            <p className="text-xs text-red-600 mt-0.5">
              {videos.length} curated video{videos.length > 1 ? 's' : ''} on {topic}
            </p>
          </div>
        </div>
        <span className={`text-red-500 font-mono text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="bg-white p-4">
          <div className={`grid gap-3 ${videos.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {videos.map(v => <VideoCard key={v.id} video={v} compact={videos.length > 1} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Video Browser (setup screen tab) ─────────────────────────────────────────
function VideoBrowser({ topicsByLevel, selectedLevel }) {
  const [allVideos,   setAllVideos]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTopic, setFilterTopic] = useState('')

  const raw = selectedLevel || Object.keys(topicsByLevel)[0] || 'sss'
  const lvl = raw === 'secondary' ? 'sss' : raw

  useEffect(() => {
    setLoading(true)
    fetchVideosByLevel(lvl).then(v => { setAllVideos(v); setLoading(false) })
  }, [lvl])

  const topics = [...new Set(allVideos.map(v => v.topic))].sort()

  const filtered = allVideos.filter(v => {
    const matchTopic  = !filterTopic  || v.topic === filterTopic
    const matchSearch = !searchQuery  ||
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.channel?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchTopic && matchSearch
  })

  const grouped = filtered.reduce((acc, v) => {
    if (!acc[v.topic]) acc[v.topic] = []
    acc[v.topic].push(v)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search videos..."
          className="flex-1 min-w-48 border-2 border-[var(--color-border)] rounded-xl
                     px-3 py-2 text-sm focus:border-[var(--color-teal)] transition-colors" />
        <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}
          className="border-2 border-[var(--color-border)] rounded-xl px-3 py-2 text-sm
                     focus:border-[var(--color-teal)] transition-colors bg-white">
          <option value="">All topics</option>
          {topics.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-3">
          <span className="w-5 h-5 border-2 border-[var(--color-teal)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--color-muted)]">Loading videos...</span>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📺</p>
          <p className="text-[var(--color-muted)] text-sm">No videos found for this search.</p>
        </div>
      ) : (
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
          {Object.entries(grouped).map(([topic, vids]) => (
            <div key={topic}>
              <p className="font-semibold text-sm text-[var(--color-ink)] mb-2 flex items-center gap-2">
                <span className="block w-3 h-px bg-[var(--color-gold)]" />
                {topic}
                <span className="text-[10px] text-[var(--color-muted)] font-mono">
                  {vids.length} video{vids.length > 1 ? 's' : ''}
                </span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vids.map(v => <VideoCard key={v.id} video={v} compact />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const DIFFICULTY_CONFIG = {
  easy:   { label: 'Easy',   color: 'text-green-600 bg-green-50 border-green-200',   emoji: '🟢' },
  medium: { label: 'Medium', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', emoji: '🟡' },
  hard:   { label: 'Hard',   color: 'text-red-600 bg-red-50 border-red-200',          emoji: '🔴' },
}

// Human-readable level labels
const LEVEL_LABELS = {
  primary:    '📚 Primary',
  jss:        '🏫 JSS',
  sss:        '🎓 SSS',
  secondary:  '🎓 SSS',   // legacy alias — treated as SSS
  university: '🏛️ University',
}

// Subtitle shown beneath each level tab
const LEVEL_SUBTITLES = {
  jss:        'Junior Secondary',
  sss:        'Senior Secondary',
  secondary:  'Senior Secondary',
  primary:    'Primary School',
  university: null,
}

// Mastery level config
const MASTERY_CONFIG = {
  beginner:   { label: 'Beginner',   color: '#94a3b8', bg: 'bg-slate-100',   pct: 15,  icon: '🌱' },
  developing: { label: 'Developing', color: '#f59e0b', bg: 'bg-amber-100',   pct: 45,  icon: '📈' },
  proficient: { label: 'Proficient', color: '#3b82f6', bg: 'bg-blue-100',    pct: 75,  icon: '⭐' },
  master:     { label: 'Master',     color: '#10b981', bg: 'bg-emerald-100', pct: 100, icon: '🏆' },
}

// Timed challenge duration (seconds)
const CHALLENGE_TIME = 60

// ── Mastery progress bar component ───────────────────────────────
function MasteryBar({ topic, mastery }) {
  if (!mastery) return null
  const cfg = MASTERY_CONFIG[mastery.mastery_level] || MASTERY_CONFIG.beginner
  const pct = Math.min(100, Math.round(mastery.avg_score || 0))
  return (
    <div className="flex items-center gap-3">
      <span className="text-base shrink-0">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-[var(--color-ink)] truncate">{topic}</span>
          <span className="text-[10px] font-mono ml-2 shrink-0" style={{ color: cfg.color }}>
            {cfg.label} · {pct}%
          </span>
        </div>
        <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
               style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
        </div>
      </div>
    </div>
  )
}

function ResultBadge({ result }) {
  if (result === 'CORRECT') return <span className="text-green-600 font-bold text-lg">✅ Correct!</span>
  if (result === 'PARTIAL') return <span className="text-yellow-600 font-bold text-lg">🌗 Partially Correct</span>
  return <span className="text-red-500 font-bold text-lg">❌ Incorrect</span>
}

// ── Step-by-step working breakdown ───────────────────────────────────────
function StepBreakdown({ steps }) {
  if (!steps || steps.length === 0) return null

  const cfg = {
    CORRECT:   { bg: 'bg-green-50',  border: 'border-green-200', badge: 'bg-green-100 text-green-700',  icon: '✓', label: 'Correct'   },
    INCORRECT: { bg: 'bg-red-50',    border: 'border-red-200',   badge: 'bg-red-100 text-red-700',      icon: '✗', label: 'Error'     },
    MISSING:   { bg: 'bg-amber-50',  border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700',  icon: '!', label: 'Missing'   },
  }

  const correctCount   = steps.filter(s => s.status === 'CORRECT').length
  const incorrectCount = steps.filter(s => s.status === 'INCORRECT').length
  const missingCount   = steps.filter(s => s.status === 'MISSING').length

  return (
    <div className="rounded-2xl border-2 border-[var(--color-border)] overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--color-ink)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">📋 Step-by-Step Breakdown</span>
        </div>
        <div className="flex items-center gap-2">
          {correctCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-[10px] font-mono font-bold">
              {correctCount} correct
            </span>
          )}
          {incorrectCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-mono font-bold">
              {incorrectCount} error{incorrectCount > 1 ? 's' : ''}
            </span>
          )}
          {missingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
              {missingCount} missing
            </span>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white divide-y divide-[var(--color-border)]">
        {steps.map((step, i) => {
          const c = cfg[step.status] || cfg.CORRECT
          return (
            <div key={i} className={`flex gap-3 px-4 py-3 ${c.bg}`}>
              {/* Step number + status icon */}
              <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                <span className="w-6 h-6 rounded-full bg-[var(--color-ink)] text-white
                                 text-[10px] font-bold flex items-center justify-center">
                  {step.step}
                </span>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center
                                  text-[11px] font-bold ${c.badge}`}>
                  {c.icon}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                {/* What the student wrote */}
                <p className="text-sm font-mono text-[var(--color-ink)] bg-white/60
                              rounded-lg px-3 py-1.5 border border-[var(--color-border)]
                              leading-relaxed break-words">
                  {step.text || <span className="italic text-[var(--color-muted)]">— step not written —</span>}
                </p>
                {/* Euler's note */}
                {step.note && (
                  <p className={`text-xs leading-relaxed px-1
                    ${step.status === 'CORRECT'   ? 'text-green-700'
                      : step.status === 'INCORRECT' ? 'text-red-700'
                      : 'text-amber-700'}`}>
                    {step.status === 'CORRECT'   ? '✓ ' : step.status === 'MISSING' ? '! ' : '✗ '}
                    {step.note}
                  </p>
                )}
              </div>

              {/* Badge */}
              <span className={`shrink-0 self-start mt-0.5 px-2 py-0.5 rounded-full
                                text-[10px] font-bold uppercase tracking-wide ${c.badge}`}>
                {c.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Group taught topics by level from conversations ───────────────────
// 'secondary' is a legacy DB value — normalise it to 'sss' so the tab
// always reads "SSS · Senior Secondary" instead of a bare "Secondary".
function groupTopicsByLevel(conversations) {
  const groups = {}
  conversations.forEach(conv => {
    if (!conv.topic) return
    const raw   = conv.level || 'secondary'
    const level = raw === 'secondary' ? 'sss' : raw   // ← normalise legacy value
    if (!groups[level]) groups[level] = new Set()
    groups[level].add(conv.topic)
  })
  // Convert sets to sorted arrays
  return Object.fromEntries(
    Object.entries(groups).map(([level, topics]) => [level, [...topics].sort()])
  )
}

export default function Practice() {
  const { user, profile } = useAuth()
  const [searchParams] = useSearchParams()

  // ── Taught topics state ───────────────────────────────────────────
  const [topicsByLevel,  setTopicsByLevel]  = useState({})   // { secondary: [...], jss: [...] }
  const [topicsLoading,  setTopicsLoading]  = useState(true)
  const [selectedLevel,  setSelectedLevel]  = useState('')   // currently selected level tab

  // Setup state
  const [topic,      setTopic]      = useState('')
  const [difficulty, setDifficulty] = useState('easy')
  const [started,    setStarted]    = useState(false)
  const [setupTab,   setSetupTab]   = useState('practice')  // 'practice' | 'videos'

  // Session state
  const [sessionId,      setSessionId]      = useState(null)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [question,       setQuestion]       = useState('')
  const [answer,         setAnswer]         = useState('')
  const [hint,           setHint]           = useState('')
  const [studentAnswer,  setStudentAnswer]  = useState('')
  const [showHint,       setShowHint]       = useState(false)
  const [submitted,      setSubmitted]      = useState(false)
  const [gradeResult,    setGradeResult]    = useState(null)
  const [showAnswer,     setShowAnswer]     = useState(false)

  // Progress
  const [score,          setScore]          = useState(0)
  const [correctCount,   setCorrectCount]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [finished, setFinished] = useState(false)
  const [history,  setHistory]  = useState([])

  // Timer
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  // ── Ask Euler state ───────────────────────────────────────────────
  const [eulerExplanation, setEulerExplanation] = useState(null)
  const [askingEuler,      setAskingEuler]      = useState(false)

  // ── Exam-prep mode state ─────────────────────────────────────────────
  // 'normal' | 'weak-drill' | 'mixed' | 'predicted'
  const [assignmentId,     setAssignmentId]     = useState(null)   // set when launched from an assignment
  const [sessionMode,      setSessionMode]      = useState('normal')
  // Mixed session: array of {topic, level} objects — one per question
  const [mixedTopics,      setMixedTopics]      = useState([])
  // Predicted exam questions: loaded up-front like a mixed session
  const [predictedTopics,  setPredictedTopics]  = useState([])
  const [predictedLoading, setPredictedLoading] = useState(false)

  // ── Worked example state ─────────────────────────────────────────────
  const [workedExample,      setWorkedExample]      = useState(null)   // {example, solution, takeaway}
  const [showWorkedExample,  setShowWorkedExample]  = useState(false)  // gate: must dismiss to start
  const [loadingExample,     setLoadingExample]     = useState(false)

  // ── Progressive hints state ───────────────────────────────────────────
  const [hints,        setHints]        = useState([])   // array of up to 3 hint strings
  const [hintLevel,    setHintLevel]    = useState(0)    // 0=none, 1=hint1, 2=hint2, 3=hint3

  // ── Retry question state ──────────────────────────────────────────────
  const [retryQuestion,  setRetryQuestion]  = useState(null)   // {question, answer, hints}
  const [showRetry,      setShowRetry]      = useState(false)  // whether retry is active
  const [retrySubmitted, setRetrySubmitted] = useState(false)
  const [retryAnswer,    setRetryAnswer]    = useState('')
  const [retryResult,    setRetryResult]    = useState(null)
  const [retryHintLevel, setRetryHintLevel] = useState(0)
  const [loadingRetry,   setLoadingRetry]   = useState(false)

  // ── Voice input state ─────────────────────────────────────────────
  const [isListening,    setIsListening]    = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const recognitionRef = useRef(null)

  // ── Streak & mastery state ────────────────────────────────────────
  const [streak,       setStreak]       = useState(null)
  const [masteryData,  setMasteryData]  = useState([])
  const [dueTopics,    setDueTopics]    = useState([])

  // ── Timed challenge mode ──────────────────────────────────────────
  const [askedQuestions,   setAskedQuestions]   = useState([])  // prevents repeats
  const [challengeMode,    setChallengeMode]    = useState(false)
  const [timeLeft,         setTimeLeft]         = useState(CHALLENGE_TIME)
  const [timeExpired,      setTimeExpired]      = useState(false)
  const challengeTimerRef  = useRef(null)
  // Refs so loadQuestionForMode always reads current values (no stale closure)
  const sessionModeRef     = useRef('normal')
  const mixedTopicsRef     = useRef([])
  const predictedTopicsRef = useRef([])

  // Check voice support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setVoiceSupported(!!SpeechRecognition)
  }, [])

  // ── Load taught topics from conversations ─────────────────────────
  useEffect(() => {
    if (user) {
      loadTaughtTopics()
      loadHistory()
      loadStreak()
      loadMastery()
      loadDueTopics()
    }

    const urlTopic = searchParams.get('topic')
    if (urlTopic) setTopic(urlTopic)
  }, [user])

  // ── Restore in-progress practice session on mount ─────────────────
  useEffect(() => {
    if (!user) return
    supabase
      .from('practice_sessions')
      .select('*, practice_attempts(*)')
      .eq('user_id', user.id)
      .eq('status', 'ongoing')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (!data) return
        // Restore topic/level/difficulty from saved session
        if (data.topic)      setTopic(data.topic)
        if (data.level)      setLevel(data.level)
        if (data.difficulty) setDifficulty(data.difficulty)
        setSessionId(data.id)
        // Restore score from attempts
        const attempts = data.practice_attempts || []
        const correct  = attempts.filter(a => a.is_correct).length
        setCorrectCount(correct)
        setScore(attempts.length > 0 ? Math.round((correct / attempts.length) * 100) : 0)
        setQuestionNumber(attempts.length + 1)
        setStarted(true)
      })
  }, [user?.id])

  const loadStreak = async () => {
    const { data } = await getStreak(user.id)
    if (data) setStreak(data)
  }

  const loadMastery = async () => {
    const { data } = await getTopicMastery(user.id)
    setMasteryData(data || [])
  }

  const loadDueTopics = async () => {
    const { data } = await getDueTopics(user.id)
    setDueTopics(data || [])
  }

  const loadTaughtTopics = async () => {
    setTopicsLoading(true)
    const { data } = await getConversations(user.id)
    if (data && data.length > 0) {
      const grouped = groupTopicsByLevel(data)
      setTopicsByLevel(grouped)
      // Default to the first level that has topics
      const levels = Object.keys(grouped)
      if (levels.length > 0) setSelectedLevel(levels[0])
    }
    setTopicsLoading(false)
  }

  // When level tab changes, reset topic selection
  const handleLevelChange = (level) => {
    setSelectedLevel(level)
    setTopic('')
  }

  const availableLevels = Object.keys(topicsByLevel)
  const topicsForLevel  = selectedLevel ? (topicsByLevel[selectedLevel] || []) : []
  const hasAnyTopics    = availableLevels.length > 0

  // ── URL auto-start ────────────────────────────────────────────────
  useEffect(() => {
    const urlTopic      = searchParams.get('topic')
    const urlAssignment = searchParams.get('assignment')
    const autoStart     = searchParams.get('auto') === 'true'
    if (urlAssignment) setAssignmentId(urlAssignment)
    if (urlTopic && autoStart && topic === urlTopic && !started && user) {
      startSession()
    }
  }, [topic])

  // ── Session elapsed timer ────────────────────────────────────────
  useEffect(() => {
    if (started && !submitted && !finished) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [started, submitted, finished, questionNumber])

  // ── Challenge mode countdown ──────────────────────────────────────
  useEffect(() => {
    if (!challengeMode || !started || submitted || finished) return
    setTimeLeft(CHALLENGE_TIME)
    setTimeExpired(false)
    challengeTimerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(challengeTimerRef.current)
          setTimeExpired(true)
          setSubmitted(true)   // auto-submit on timeout
          setGradeResult({
            result: 'INCORRECT', score: 0, is_correct: false,
            feedback: "Time's up! You ran out of the 60-second challenge window.",
            motivation: "Speed comes with practice — keep going!",
          })
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(challengeTimerRef.current)
  }, [challengeMode, started, submitted, finished, questionNumber])

  const loadHistory = async () => {
    const { data } = await getSessionHistory(user.id)
    setHistory(data || [])
  }

  const [sessionError, setSessionError] = useState(null)

  const startSession = async () => {
    if (!topic) return
    setLoading(true)
    setSessionError(null)
    try {
      const level = selectedLevel || 'secondary'
      const { data: session, error } = await createSession(user.id, topic, level, difficulty)
      if (error || !session) {
        // Session creation failed — still allow practice without DB session
        console.warn('Session create failed, continuing without session:', error)
        setSessionId(null)
      } else {
        setSessionId(session.id)
      }
      // Always proceed to load the question regardless of session creation
      setAskedQuestions([])   // reset history for new session

      // Load worked example first — student must see it before Q1
      setLoadingExample(true)
      try {
        const ex = await getWorkedExample(topic, selectedLevel || 'secondary', difficulty)
        if (ex.data?.example) {
          setWorkedExample(ex.data)
          setShowWorkedExample(true)   // show the gate screen
        }
      } catch { /* non-fatal — skip example on error */ }
      setLoadingExample(false)

      await loadQuestion(1, selectedLevel || 'secondary', [])
      setStarted(true)
      setScore(0)
      setQuestionNumber(1)
      setFinished(false)
    } catch (err) {
      console.error('startSession error:', err)
      setSessionError('Failed to start session. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadQuestion = async (num, level, history = null) => {
    setLoading(true)
    setStudentAnswer('')
    setSubmitted(false)
    setGradeResult(null)
    setShowHint(false)
    setShowAnswer(false)
    setElapsed(0)
    setEulerExplanation(null)
    setHints([])
    setHintLevel(0)
    setRetryQuestion(null)
    setShowRetry(false)
    setRetrySubmitted(false)
    setRetryAnswer('')
    setRetryResult(null)
    setRetryHintLevel(0)
    stopListening()
    try {
      const prevQuestions = history !== null ? history : askedQuestions
      const res = await generateQuestion(
        topic, level || selectedLevel || 'secondary', difficulty, num, prevQuestions
      )
      const newQuestion = res.data.question
      setQuestion(newQuestion)
      setAnswer(res.data.answer)
      setHints(res.data.hints || [])
      setHintLevel(0)
      // Track this question to avoid repeats
      setAskedQuestions(prev => [...(history !== null ? history : prev), newQuestion])
    } catch (err) {
      console.error('loadQuestion error:', err)
      setQuestion('Failed to load question. Please go back and try again.')
      setAnswer('')
      setHint('')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!studentAnswer.trim() || submitted) return
    setLoading(true)
    clearInterval(timerRef.current)
    const res = await gradeAnswer(topic, question, answer, studentAnswer)
    const grade = res.data
    setGradeResult(grade)
    setSubmitted(true)
    setScore(s => s + (grade.score || 0))
    if (grade.is_correct) setCorrectCount(c => c + 1)

    // ── Record per-question attempt in topic_progress ─────────────
    // This is what Dashboard's "Questions Done" counter reads from
    if (user && topic) {
      updateTopicProgress(user.id, topic, selectedLevel || 'secondary', grade.is_correct)
    }
    if (sessionId) {
      await saveAttempt(sessionId, {
        questionText: question, studentAnswer, correctAnswer: answer,
        isCorrect: grade.is_correct, feedback: grade.feedback, timeTaken: elapsed,
      })
    }
    setLoading(false)
  }

  const handleNext = async () => {
    if (questionNumber >= 5) {
      const finalScore = Math.round(score / 5)
      if (sessionId) await completeSession(sessionId, finalScore)

      // If launched from a class assignment, record the submission
      if (assignmentId && user) {
        await submitAssignment(assignmentId, user.id, sessionId, finalScore)
      }

      // Check if student is struggling (3 consecutive sessions < 40%)
      if (user) {
        checkAndCreateStrugglingAlert(user.id).catch(() => {})  // fire-and-forget, non-fatal
      }

      // For normal/weak-drill: update mastery for the single topic
      // For mixed/predicted: per-question tracking already fired in handleSubmit
      if (sessionMode === 'normal' || sessionMode === 'weak-drill') {
        await Promise.all([
          updateStreak(user.id),
          updateTopicMastery(user.id, topic, selectedLevel || 'secondary', finalScore, correctCount, 5),
          updateSpacedRepetition(user.id, topic, selectedLevel || 'secondary', finalScore),
        ])
      } else {
        await updateStreak(user.id)
      }

      await Promise.all([loadHistory(), loadStreak(), loadMastery(), loadDueTopics()])
      setFinished(true)
    } else {
      const next = questionNumber + 1
      setQuestionNumber(next)
      if (sessionMode !== 'normal') {
        // Use refs so we always get latest values regardless of render timing
        await loadQuestionForMode(
          next, topic, selectedLevel || 'secondary', difficulty, askedQuestions,
          sessionModeRef.current, mixedTopicsRef.current, predictedTopicsRef.current
        )
      } else {
        await loadQuestion(next)
      }
    }
  }

  // ── Ask Euler about a wrong answer ───────────────────────────────
  const askEuler = async () => {
    if (askingEuler) return
    setAskingEuler(true)
    setEulerExplanation('')
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const prompt = `A student answered a ${difficulty} ${topic} question incorrectly.

Question: ${question}
Student's answer: ${studentAnswer}
Correct answer: ${answer}

Please explain:
1. Exactly what the student did wrong
2. The correct step-by-step method
3. A tip to avoid this mistake in future

Be warm, encouraging, and specific. Address the student directly.`

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API_BASE}/solve/explain/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ expression: question, result: prompt }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const reader = res.body.getReader()
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
          if (payload === '[DONE]') break
          try {
            const { token } = JSON.parse(payload)
            setEulerExplanation(prev => prev + token)
          } catch {}
        }
      }
    } catch {
      setEulerExplanation('Could not reach Euler. Make sure the backend is running.')
    } finally {
      setAskingEuler(false)
    }
  }

  // ── Exam-prep session launchers ─────────────────────────────────────

  // One-click: find weakest topic and start a session on it
  // ── Helper: find level for a topic ──────────────────────────────────
  const levelForTopic = (t) =>
    Object.entries(topicsByLevel).find(([, ts]) => ts.includes(t))?.[0]
      || selectedLevel || 'secondary'

  // ── 🎯 Weak Topic Drill ───────────────────────────────────────────
  const startWeakDrill = async () => {
    if (!masteryData.length) return
    const weakest = [...masteryData]
      .filter(m => m.avg_score !== undefined)
      .sort((a, b) => (a.avg_score || 0) - (b.avg_score || 0))[0]
    if (!weakest) return
    const lvl = levelForTopic(weakest.topic)
    // Commit mode + topic to refs immediately (no stale closure)
    sessionModeRef.current = 'weak-drill'
    mixedTopicsRef.current = []
    predictedTopicsRef.current = []
    setSessionMode('weak-drill')
    setTopic(weakest.topic)
    setSelectedLevel(lvl)
    await startSessionWith(weakest.topic, lvl, 'medium', 'weak-drill', [], [])
  }

  // ── 🔀 Mixed Topic Session ────────────────────────────────────────
  const startMixedSession = async () => {
    const all = Object.entries(topicsByLevel).flatMap(([lvl, topics]) =>
      topics.map(t => ({ topic: t, level: lvl }))
    )
    if (all.length < 2) return
    const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, 5)
    // Pad to exactly 5 if fewer than 5 distinct topics
    while (shuffled.length < 5) shuffled.push(shuffled[shuffled.length - 1])
    // Commit refs before any async work
    sessionModeRef.current = 'mixed'
    mixedTopicsRef.current = shuffled
    predictedTopicsRef.current = []
    setSessionMode('mixed')
    setMixedTopics(shuffled)
    setTopic('Mixed Topics')
    setSelectedLevel(shuffled[0].level)
    await startSessionWith('Mixed Topics', shuffled[0].level, difficulty, 'mixed', shuffled, [])
  }

  // ── 🔮 Predicted Exam Questions ───────────────────────────────────
  const startPredictedSession = async () => {
    setPredictedLoading(true)
    const examTarget = profile?.exam_target || 'WAEC'
    const weakList = masteryData
      .filter(m => (m.avg_score || 0) < 70)
      .sort((a, b) => (a.avg_score || 0) - (b.avg_score || 0))
      .slice(0, 5)
      .map(m => m.topic)
    // Pad to 5 by repeating if fewer than 5 weak topics
    const padded = weakList.length > 0
      ? [...weakList, ...weakList, ...weakList].slice(0, 5)
      : Object.values(topicsByLevel).flat().slice(0, 5)
    const predicted = padded.map((t, i) => ({
      topic: t,
      level: levelForTopic(t),
      examContext: examTarget,
      questionIndex: i + 1,
    }))
    // Commit refs before async work
    sessionModeRef.current = 'predicted'
    mixedTopicsRef.current = []
    predictedTopicsRef.current = predicted
    setSessionMode('predicted')
    setPredictedTopics(predicted)
    setTopic(`${examTarget} Exam Prep`)
    setSelectedLevel(predicted[0]?.level || selectedLevel || 'secondary')
    setPredictedLoading(false)
    await startSessionWith(
      `${examTarget} Exam Prep`,
      predicted[0]?.level || 'secondary',
      'medium', 'predicted', [], predicted
    )
  }

  // ── Core session starter (all modes funnel through here) ──────────
  // mode, mixedSlots, predictedSlots are passed explicitly to avoid stale closure
  const startSessionWith = async (sessionTopic, sessionLevel, sessionDifficulty,
                                   mode = 'normal', mixedSlots = [], predictedSlots = []) => {
    setLoading(true)
    setSessionError(null)
    try {
      const { data: session, error } = await createSession(user.id, sessionTopic, sessionLevel, sessionDifficulty)
      if (error || !session) {
        console.warn('Session create failed, continuing anyway:', error)
        setSessionId(null)
      } else {
        setSessionId(session.id)
      }
      setAskedQuestions([])
      setWorkedExample(null)
      setShowWorkedExample(false)
      await loadQuestionForMode(1, sessionTopic, sessionLevel, sessionDifficulty, [],
                                 mode, mixedSlots, predictedSlots)
      setStarted(true)
      setScore(0)
      setCorrectCount(0)
      setQuestionNumber(1)
      setFinished(false)
    } catch (err) {
      console.error('startSessionWith error:', err)
      setSessionError('Failed to start session. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Mode-aware question loader ─────────────────────────────────────
  // All mode/slot args passed explicitly — no stale state reads
  const loadQuestionForMode = async (
    num, sessionTopic, sessionLevel, sessionDifficulty, history,
    mode, mixedSlots, predictedSlots
  ) => {
    setLoading(true)
    setStudentAnswer('')
    setSubmitted(false)
    setGradeResult(null)
    setShowHint(false)
    setShowAnswer(false)
    setElapsed(0)
    setEulerExplanation(null)
    setHints([])
    setHintLevel(0)
    setRetryQuestion(null)
    setShowRetry(false)
    setRetrySubmitted(false)
    setRetryAnswer('')
    setRetryResult(null)
    setRetryHintLevel(0)
    stopListening()
    try {
      let qTopic = sessionTopic
      let qLevel = sessionLevel
      // Pick per-question topic for mixed / predicted modes
      if (mode === 'mixed' && mixedSlots.length > 0) {
        const slot = mixedSlots[(num - 1) % mixedSlots.length]
        qTopic = slot.topic
        qLevel = slot.level
        setTopic(qTopic)
      } else if (mode === 'predicted' && predictedSlots.length > 0) {
        const slot = predictedSlots[(num - 1) % predictedSlots.length]
        qTopic = slot.topic
        qLevel = slot.level
        setTopic(qTopic)
      }
      const examCtx = mode === 'predicted'
        ? `This question must reflect the style and difficulty of ${profile?.exam_target || 'WAEC'} past exam questions on ${qTopic}. Use realistic exam phrasing and mark-scheme style working.`
        : ''
      const res = await generateQuestion(qTopic, qLevel, sessionDifficulty || difficulty, num, history, examCtx)
      const newQuestion = res.data.question
      setQuestion(newQuestion)
      setAnswer(res.data.answer)
      setHints(res.data.hints || [])
      setHintLevel(0)
      setAskedQuestions(prev => [...(history !== null ? history : prev), newQuestion])
    } catch (err) {
      console.error('loadQuestionForMode error:', err)
      setQuestion('Failed to load question. Please go back and try again.')
      setAnswer('')
      setHints([])
    } finally {
      setLoading(false)
    }
  }

  // ── Load retry question after wrong answer ──────────────────────────
  const loadRetryQuestion = async () => {
    if (loadingRetry) return
    setLoadingRetry(true)
    try {
      const res = await getRetryQuestion(
        topic, selectedLevel || 'secondary', question, studentAnswer
      )
      if (res.data?.question) {
        setRetryQuestion(res.data)
        setShowRetry(true)
        setRetryAnswer('')
        setRetrySubmitted(false)
        setRetryResult(null)
        setRetryHintLevel(0)
      }
    } catch {
      console.error('Failed to load retry question')
    } finally {
      setLoadingRetry(false)
    }
  }

  const handleRetrySubmit = async () => {
    if (!retryAnswer.trim() || retrySubmitted) return
    const res = await gradeAnswer(topic, retryQuestion.question, retryQuestion.answer, retryAnswer)
    setRetryResult(res.data)
    setRetrySubmitted(true)
  }

  // ── Voice input ───────────────────────────────────────────────────
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous     = true
    recognition.interimResults = true
    recognition.lang           = 'en-US'

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('')
      setStudentAnswer(transcript)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  const toggleVoice = () => {
    if (isListening) stopListening()
    else startListening()
  }

  const handleRestart = () => {
    setStarted(false); setFinished(false); setSessionId(null)
    setQuestion(''); setAnswer(''); setScore(0); setQuestionNumber(1)
    setTopic(''); setEulerExplanation(null); stopListening()
    setCorrectCount(0)
    setAskedQuestions([])
    setSessionMode('normal')
    sessionModeRef.current = 'normal'
    mixedTopicsRef.current = []
    predictedTopicsRef.current = []
    setMixedTopics([]); setPredictedTopics([]); setPredictedLoading(false)
    setWorkedExample(null); setShowWorkedExample(false); setLoadingExample(false)
    setHints([]); setHintLevel(0)
    setRetryQuestion(null); setShowRetry(false); setRetrySubmitted(false)
    setRetryAnswer(''); setRetryResult(null); setRetryHintLevel(0)
    setChallengeMode(false); setTimeLeft(CHALLENGE_TIME); setTimeExpired(false)
    clearInterval(challengeTimerRef.current)
    setSetupTab('practice')
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // ── SETUP SCREEN ──────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-6">
          <p className="font-mono text-xs tracking-widest uppercase
                        text-[var(--color-gold)] mb-2 flex items-center gap-3">
            <span className="block w-6 h-px bg-[var(--color-gold)]" />
            Practice Mode
          </p>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-serif font-black text-5xl tracking-tight">
                Test Your Knowledge
              </h1>
              <p className="text-[var(--color-muted)] mt-2 text-lg">
                Euler generates 5 questions from topics you've studied in Teach mode.
              </p>
            </div>
            {/* Streak badge */}
            {streak && (
              <div className="flex flex-col items-center bg-[var(--color-paper)] border-2
                              border-[var(--color-border)] rounded-2xl px-5 py-3 shrink-0">
                <span className="text-3xl">🍌</span>
                <span className="font-serif font-black text-2xl text-[var(--color-gold)]">
                  {streak.current_streak}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                  day streak
                </span>
                {streak.longest_streak > streak.current_streak && (
                  <span className="text-[10px] text-[var(--color-muted)] mt-0.5">
                    Best: {streak.longest_streak}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Due for review banner */}
          {dueTopics.length > 0 && (
            <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-amber-50 px-5 py-4">
              <p className="font-semibold text-amber-800 text-sm mb-2">
                🔔 {dueTopics.length} topic{dueTopics.length > 1 ? 's' : ''} due for review today
              </p>
              <div className="flex flex-wrap gap-2">
                {dueTopics.slice(0, 5).map(t => (
                  <button key={t.topic}
                    onClick={() => setTopic(t.topic)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border-2 transition-all
                      ${topic === t.topic
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : 'border-amber-300 text-amber-700 hover:bg-amber-100'
                      }`}>
                    {t.topic}
                    <span className="ml-1 opacity-60">
                      ({t.interval_days}d overdue)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Topic mastery overview ── */}
        {masteryData.length > 0 && (
          <div className="mb-6 card overflow-hidden">
            <div className="bg-[var(--color-ink)] px-5 py-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
                📊 Your Topic Mastery
              </p>
              <span className="text-[10px] text-white/40 font-mono">
                {masteryData.filter(m => m.mastery_level === 'master').length} mastered
              </span>
            </div>
            <div className="bg-white p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {masteryData.slice(0, 8).map(m => (
                <MasteryBar key={m.topic} topic={m.topic} mastery={m} />
              ))}
            </div>
          </div>
        )}

        {/* ── Exam Prep Modes ─────────────────────────────────────────── */}
        {hasAnyTopics && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="block w-6 h-px bg-[var(--color-gold)]" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-gold)]">
                Exam Prep Modes
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

              {/* Weak Topic Drill */}
              <button
                onClick={startWeakDrill}
                disabled={loading || !masteryData.length}
                className="flex flex-col gap-2 p-4 rounded-2xl border-2 text-left
                           transition-all disabled:opacity-40
                           border-red-200 bg-red-50 hover:border-red-400 hover:bg-red-100
                           group">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🎯</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest
                                   text-red-400">One-click</span>
                </div>
                <div>
                  <p className="font-bold text-sm text-red-800 group-hover:text-red-900">
                    Weak Topic Drill
                  </p>
                  <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
                    Auto-starts on your lowest mastery topic
                    {masteryData.length > 0 && (() => {
                      const weakest = [...masteryData]
                        .filter(m => m.avg_score !== undefined)
                        .sort((a, b) => (a.avg_score || 0) - (b.avg_score || 0))[0]
                      return weakest
                        ? <span className="block mt-1 font-semibold text-red-700">
                            → {weakest.topic} ({Math.round(weakest.avg_score || 0)}%)
                          </span>
                        : null
                    })()}
                  </p>
                </div>
              </button>

              {/* Mixed Topic Session */}
              <button
                onClick={startMixedSession}
                disabled={loading || Object.values(topicsByLevel).flat().length < 2}
                className="flex flex-col gap-2 p-4 rounded-2xl border-2 text-left
                           transition-all disabled:opacity-40
                           border-purple-200 bg-purple-50 hover:border-purple-400 hover:bg-purple-100
                           group">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🔀</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest
                                   text-purple-400">5 topics</span>
                </div>
                <div>
                  <p className="font-bold text-sm text-purple-800 group-hover:text-purple-900">
                    Mixed Session
                  </p>
                  <p className="text-xs text-purple-600 mt-0.5 leading-relaxed">
                    One question from each of 5 random studied topics — tests breadth
                  </p>
                </div>
              </button>

              {/* Predicted Exam Questions */}
              <button
                onClick={startPredictedSession}
                disabled={loading || predictedLoading || masteryData.filter(m => (m.avg_score || 0) < 70).length === 0}
                className="flex flex-col gap-2 p-4 rounded-2xl border-2 text-left
                           transition-all disabled:opacity-40
                           border-[var(--color-gold)] bg-yellow-50
                           hover:border-yellow-500 hover:bg-yellow-100 group">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🔮</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest
                                   text-yellow-600">
                    {profile?.exam_target || 'WAEC'}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-sm text-yellow-800 group-hover:text-yellow-900">
                    Predicted Exam Qs
                  </p>
                  <p className="text-xs text-yellow-700 mt-0.5 leading-relaxed">
                    {predictedLoading ? 'Preparing questions...' :
                      'Questions on your weak areas in the style of your target exam'}
                  </p>
                </div>
              </button>

            </div>
          </div>
        )}

        {/* ── Tab bar: Practice / Videos ── */}
        <div className="flex border-b-2 border-[var(--color-border)] mb-6">
          {[
            { id: 'practice', label: '🎯 Practice' },
            { id: 'videos',   label: '📺 Video Lessons' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setSetupTab(tab.id)}
              className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all -mb-0.5
                ${setupTab === tab.id
                  ? 'border-[var(--color-teal)] text-[var(--color-teal)]'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {setupTab === 'videos' ? (
          <div className="card overflow-hidden">
            <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-serif font-bold text-white text-lg">📺 Video Lessons</p>
                <p className="text-white/70 text-sm mt-0.5">Curated YouTube explanations matched to your level</p>
              </div>
              <span className="text-3xl">🎬</span>
            </div>
            <div className="bg-white p-6">
              <VideoBrowser topicsByLevel={topicsByLevel} selectedLevel={selectedLevel} />
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* ── Setup card ── */}
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-teal)] px-6 py-4">
              <p className="font-serif font-bold text-white text-lg">🎯 Start a Session</p>
            </div>
            <div className="bg-white p-6 space-y-5">

              {topicsLoading ? (
                <div className="flex items-center gap-3 py-6 justify-center">
                  <span className="w-5 h-5 border-2 border-[var(--color-teal)]
                                   border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-[var(--color-muted)]">
                    Loading your studied topics...
                  </span>
                </div>

              ) : !hasAnyTopics ? (
                /* ── No topics studied yet ── */
                <div className="text-center py-8 space-y-4">
                  <p className="text-4xl">📚</p>
                  <p className="font-semibold text-[var(--color-ink)]">
                    No topics studied yet
                  </p>
                  <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                    Practice questions are generated from topics you've studied
                    in <strong>Teach mode</strong>. Head there first to start learning,
                    then come back to test yourself!
                  </p>
                  <a href="/teach"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                               bg-[var(--color-teal)] text-white text-sm font-semibold
                               hover:opacity-90 transition-opacity">
                    📖 Go to Teach Mode →
                  </a>
                </div>

              ) : (
                <>
                  {/* ── Level tabs ── */}
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest
                                       text-[var(--color-muted)] block mb-2">
                      Your Level
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableLevels.map(level => (
                        <button
                          key={level}
                          onClick={() => handleLevelChange(level)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2
                                      transition-all flex flex-col items-start
                            ${selectedLevel === level
                              ? 'bg-[var(--color-teal)] border-[var(--color-teal)] text-white'
                              : 'border-[var(--color-border)] text-[var(--color-muted)]'
                            }`}
                        >
                          <span>
                            {LEVEL_LABELS[level] || level}
                            <span className="ml-1.5 opacity-70">
                              ({topicsByLevel[level].length})
                            </span>
                          </span>
                          {LEVEL_SUBTITLES[level] && (
                            <span className={`text-[10px] font-normal mt-0.5
                              ${selectedLevel === level ? 'text-white/70' : 'text-[var(--color-muted)]'}`}>
                              {LEVEL_SUBTITLES[level]}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Topic chips ── */}
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest
                                       text-[var(--color-muted)] block mb-2">
                      Choose Topic
                      <span className="ml-2 normal-case font-sans font-normal">
                        — only topics you've studied in Teach
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                      {topicsForLevel.map(t => (
                        <button
                          key={t}
                          onClick={() => setTopic(t)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border-2
                                      transition-all text-left
                            ${topic === t
                              ? 'bg-[var(--color-teal)] border-[var(--color-teal)] text-white'
                              : 'border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-teal)]'
                            }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    {topic && (
                      <p className="mt-2 text-xs text-[var(--color-teal)] font-medium">
                        ✓ Selected: {topic}
                      </p>
                    )}
                  </div>

                  {/* ── Difficulty ── */}
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest
                                       text-[var(--color-muted)] block mb-2">
                      Difficulty
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => setDifficulty(key)}
                          className={`py-2.5 rounded-xl text-sm font-semibold border-2
                                      transition-all
                            ${difficulty === key
                              ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                              : 'border-[var(--color-border)] text-[var(--color-muted)]'
                            }`}
                        >
                          {cfg.emoji} {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Challenge mode toggle */}
                  <div
                    onClick={() => setChallengeMode(c => !c)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border-2
                                cursor-pointer transition-all
                      ${challengeMode
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-[var(--color-border)] hover:border-orange-300'
                      }`}
                  >
                    <div>
                      <p className={`text-sm font-semibold
                        ${challengeMode ? 'text-orange-700' : 'text-[var(--color-ink)]'}`}>
                        ⚡ Timed Challenge Mode
                      </p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">
                        60 seconds per question — tests speed & accuracy
                      </p>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors relative shrink-0
                      ${challengeMode ? 'bg-orange-400' : 'bg-[var(--color-border)]'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow
                                       transition-all ${challengeMode ? 'left-5' : 'left-1'}`} />
                    </div>
                  </div>

                  {sessionError && (
                    <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200
                                    text-sm text-red-700">
                      ⚠️ {sessionError}
                    </div>
                  )}

                  <button
                    onClick={startSession}
                    disabled={!topic || loading}
                    className={`w-full py-4 text-base justify-center
                               flex items-center gap-2 disabled:opacity-50 rounded-xl font-bold
                               transition-all
                      ${challengeMode
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'btn-primary'
                      }`}
                  >
                    {loading
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : challengeMode ? '⚡ Start Challenge!' : '🚀 Start Practice Session'
                    }
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Recent sessions ── */}
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-ink)] px-6 py-4">
              <p className="font-serif font-bold text-white text-lg">📊 Recent Sessions</p>
            </div>
            <div className="bg-white divide-y divide-[var(--color-border)] max-h-80 overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[var(--color-muted)] text-sm">
                    No sessions yet — start your first practice!
                  </p>
                </div>
              ) : history.map(session => (
                <button
                  key={session.id}
                  onClick={() => { setTopic(session.topic); setDifficulty(session.difficulty || 'easy') }}
                  className="w-full px-5 py-3 hover:bg-[var(--color-cream)]
                             transition-colors text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-[var(--color-ink)] truncate
                                    group-hover:text-[var(--color-teal)] transition-colors">
                        {session.topic}
                      </p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">
                        {DIFFICULTY_CONFIG[session.difficulty]?.emoji} {session.difficulty}
                        &nbsp;·&nbsp;
                        {session.level && (LEVEL_LABELS[session.level] || session.level)}
                        &nbsp;·&nbsp;
                        {new Date(session.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`text-lg font-black font-serif shrink-0 ml-3
                      ${session.score >= 80 ? 'text-green-600'
                        : session.score >= 50 ? 'text-yellow-600'
                        : 'text-red-500'}`}>
                      {session.score}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        )} {/* end setupTab ternary */}
      </div>
    )
  }

  // ── FINISHED SCREEN ───────────────────────────────────────────────
  if (finished) {
    const finalPct = Math.round(score / 5)
    const grade    = finalPct >= 80 ? 'A' : finalPct >= 60 ? 'B' : finalPct >= 40 ? 'C' : 'D'

    const assignLabel = assignmentId ? '📋 Assignment Submitted' : null
    const modeLabel = sessionMode === 'weak-drill' ? '🎯 Weak Topic Drill'
      : sessionMode === 'mixed'   ? '🔀 Mixed Session'
      : sessionMode === 'predicted' ? `🔮 ${profile?.exam_target || 'WAEC'} Exam Prep`
      : null

    const message  = finalPct >= 80
      ? sessionMode === 'weak-drill' ? "Weak topic conquered! Keep drilling to master it! 🏆"
        : sessionMode === 'mixed'    ? "Excellent breadth! You're strong across multiple topics! 🎉"
        : sessionMode === 'predicted'? "Exam-ready performance! You're on track! 🏅"
        : "Excellent work! You've mastered this topic! 🎉"
      : finalPct >= 60 ? "Good job! Keep practising to improve further! 💪"
      : finalPct >= 40 ? "You're getting there! Review the topic and try again! 📚"
      : "Don't give up! Study the worked examples and try again! 🌟"

    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="card overflow-hidden">
          <div className="bg-[var(--color-teal)] px-6 py-8">
            <div className="text-7xl font-black font-serif text-white mb-2">{grade}</div>
            <p className="text-white/80 text-sm font-mono uppercase tracking-widest">Final Grade</p>
            {(modeLabel || assignLabel) && (
              <div className="flex gap-2 justify-center flex-wrap mt-2">
                {modeLabel && (
                  <span className="inline-block px-3 py-1 rounded-full bg-white/20
                                   text-white text-xs font-mono">
                    {modeLabel}
                  </span>
                )}
                {assignLabel && (
                  <span className="inline-block px-3 py-1 rounded-full bg-green-400/30
                                   text-white text-xs font-mono font-bold">
                    {assignLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="bg-white p-8 space-y-4">
            <div className="text-5xl font-black font-serif text-[var(--color-ink)]">{finalPct}%</div>
            <p className="font-medium text-[var(--color-ink)]">{message}</p>
            {/* Topics covered breakdown for mixed/predicted */}
            {(sessionMode === 'mixed' || sessionMode === 'predicted') && (
              <div className="text-left bg-[var(--color-paper)] rounded-xl p-3 border
                              border-[var(--color-border)]">
                <p className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-muted)] mb-2">Topics Covered</p>
                <div className="space-y-1">
                  {(sessionMode === 'mixed' ? mixedTopics : predictedTopics)
                    .slice(0, 5).map((slot, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[var(--color-ink)]">
                      <span className="w-5 h-5 rounded-full bg-[var(--color-teal)] text-white
                                       flex items-center justify-center font-bold text-[10px] shrink-0">
                        {i + 1}
                      </span>
                      {slot.topic}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-[var(--color-paper)] rounded-xl p-4">
                <div className="font-serif font-black text-2xl text-[var(--color-teal)]">
                  {correctCount}/5
                </div>
                <div className="text-xs text-[var(--color-muted)] font-mono uppercase mt-1">
                  Questions Correct
                </div>
              </div>
              <div className="bg-[var(--color-paper)] rounded-xl p-4">
                <div className="font-serif font-black text-2xl text-[var(--color-teal)] capitalize">
                  {difficulty}
                </div>
                <div className="text-xs text-[var(--color-muted)] font-mono uppercase mt-1">
                  Difficulty
                </div>
              </div>
            </div>

            {/* Streak update */}
            {streak && streak.current_streak > 0 && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200
                              rounded-xl px-4 py-3">
                <span className="text-2xl">🍌</span>
                <div>
                  <p className="font-bold text-amber-800 text-sm">
                    {streak.current_streak} day streak!
                  </p>
                  <p className="text-xs text-amber-600">
                    {streak.current_streak >= streak.longest_streak
                      ? "🎉 New personal best!"
                      : `Best: ${streak.longest_streak} days`}
                  </p>
                </div>
              </div>
            )}

            {/* Mastery update for this topic */}
            {(() => {
              const m = masteryData.find(d => d.topic === topic)
              if (!m) return null
              const cfg = MASTERY_CONFIG[m.mastery_level]
              return (
                <div className="rounded-xl px-4 py-3 border-2"
                     style={{ borderColor: cfg.color + '60', backgroundColor: cfg.color + '12' }}>
                  <p className="text-xs font-mono uppercase tracking-widest mb-2"
                     style={{ color: cfg.color }}>
                    {cfg.icon} Topic Mastery Updated
                  </p>
                  <MasteryBar topic={topic} mastery={m} />
                </div>
              )
            })()}
            <div className="flex gap-3 mt-2">
              <button onClick={handleRestart}
                className="flex-1 btn-primary py-3 text-sm justify-center">
                🔄 Try Again
              </button>
              <button onClick={() => { handleRestart(); setDifficulty('hard') }}
                className="flex-1 btn-secondary py-3 text-sm justify-center">
                ⬆️ Try Harder
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── WORKED EXAMPLE GATE ─────────────────────────────────────────────
  if (started && showWorkedExample && workedExample) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-4 flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest
                           text-[var(--color-gold)]">
            Before you start — worked example
          </span>
        </div>
        <div className="card overflow-hidden">
          <div className="bg-[var(--color-teal)] px-6 py-4">
            <p className="font-serif font-bold text-white text-lg">
              📖 Study This Example First
            </p>
            <p className="text-white/70 text-sm mt-1">
              {topic} · {LEVEL_LABELS[selectedLevel] || selectedLevel}
            </p>
          </div>
          <div className="bg-white p-6 space-y-5">

            {/* Example problem */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest
                             text-[var(--color-muted)] mb-2">Example Problem</p>
              <div className="bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                              rounded-xl p-4 text-sm text-[var(--color-ink)] leading-relaxed font-medium">
                {workedExample.example}
              </div>
            </div>

            {/* Step-by-step solution */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest
                             text-[var(--color-muted)] mb-2">Step-by-Step Solution</p>
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4
                              text-sm text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap">
                {workedExample.solution}
              </div>
            </div>

            {/* Key takeaway */}
            {workedExample.takeaway && (
              <div className="flex gap-3 bg-amber-50 border-2 border-amber-200
                              rounded-xl px-4 py-3">
                <span className="text-xl shrink-0">💡</span>
                <div>
                  <p className="font-semibold text-xs text-amber-800 uppercase tracking-wide mb-1">
                    Key Takeaway
                  </p>
                  <p className="text-sm text-amber-900">{workedExample.takeaway}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowWorkedExample(false)}
              className="w-full btn-primary py-4 text-base justify-center
                         flex items-center gap-2">
              ✅ I understand — Start Questions →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── QUESTION SCREEN ───────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-[var(--color-muted)] uppercase tracking-widest">
            {sessionMode === 'mixed' && mixedTopics[questionNumber - 1]
              ? <>🔀 Q{questionNumber}/5 — <span className="text-purple-600">{mixedTopics[questionNumber - 1].topic}</span></>
              : sessionMode === 'predicted' && predictedTopics[questionNumber - 1]
              ? <>🔮 Q{questionNumber}/5 — <span className="text-yellow-700">{predictedTopics[questionNumber - 1].topic}</span></>
              : sessionMode === 'weak-drill'
              ? <>🎯 Weak Drill — {topic}</>
              : <>Question {questionNumber} of 5 — {topic}</>
            }
          </span>
          <div className="flex items-center gap-3">
            {sessionMode !== 'normal' && (
              <span className={`font-mono text-[10px] px-2 py-1 rounded-lg border font-bold
                ${sessionMode === 'weak-drill' ? 'bg-red-50 border-red-200 text-red-600'
                  : sessionMode === 'mixed'    ? 'bg-purple-50 border-purple-200 text-purple-600'
                  : 'bg-yellow-50 border-yellow-300 text-yellow-700'}`}>
                {sessionMode === 'weak-drill' ? '🎯 Weak Drill'
                  : sessionMode === 'mixed'   ? '🔀 Mixed'
                  : `🔮 ${profile?.exam_target || 'WAEC'} Prep`}
              </span>
            )}
            <span className={`font-mono text-xs px-2 py-1 rounded-lg border
              ${DIFFICULTY_CONFIG[difficulty].color}`}>
              {DIFFICULTY_CONFIG[difficulty].emoji} {difficulty}
            </span>
            {challengeMode ? (
              /* Challenge countdown */
              <span className={`font-mono text-sm font-bold px-3 py-1 rounded-lg border-2
                ${timeLeft <= 10
                  ? 'text-red-600 border-red-300 bg-red-50 animate-pulse'
                  : timeLeft <= 30
                  ? 'text-orange-600 border-orange-300 bg-orange-50'
                  : 'text-green-600 border-green-300 bg-green-50'
                }`}>
                ⚡ {timeLeft}s
              </span>
            ) : (
              <span className="font-mono text-xs text-[var(--color-muted)]">
                ⏱ {formatTime(elapsed)}
              </span>
            )}
          </div>
        </div>

        {/* Session progress bar */}
        <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden mb-1">
          <div className="h-full bg-[var(--color-teal)] rounded-full transition-all duration-500"
               style={{ width: `${((questionNumber - 1) / 5) * 100}%` }} />
        </div>

        {/* Challenge time bar */}
        {challengeMode && !submitted && (
          <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000
              ${timeLeft <= 10 ? 'bg-red-500' : timeLeft <= 30 ? 'bg-orange-400' : 'bg-green-500'}`}
              style={{ width: `${(timeLeft / CHALLENGE_TIME) * 100}%` }} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="card bg-white p-12 text-center">
          <div className="w-10 h-10 border-4 border-[var(--color-teal)] border-t-transparent
                          rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-[var(--color-muted)]">
            Euler is preparing your question...
          </p>
        </div>
      ) : (
        <div className="space-y-5">

          {/* Question card */}
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-ink)] px-6 py-3 flex items-center justify-between">
              <span className="font-serif text-white font-semibold">
                Question {questionNumber}
              </span>
              <span className="font-mono text-white/60 text-xs">
                {LEVEL_LABELS[selectedLevel] || selectedLevel}
              </span>
            </div>
            <div className="bg-white p-6">
              <p className="text-[var(--color-ink)] text-base leading-relaxed font-medium">
                {question}
              </p>
              {hints.length > 0 && !submitted && (
                <div className="mt-4 space-y-2">
                  {/* Show revealed hints */}
                  {hints.slice(0, hintLevel).map((h, i) => (
                    <div key={i}
                      className={`rounded-xl px-4 py-3 text-sm border
                        ${i === 0 ? 'bg-yellow-50 border-yellow-200 text-yellow-900'
                          : i === 1 ? 'bg-orange-50 border-orange-200 text-orange-900'
                          : 'bg-red-50 border-red-200 text-red-900'}`}>
                      <span className="font-bold text-xs uppercase tracking-wide mr-2">
                        {i === 0 ? '💡 Hint 1' : i === 1 ? '🔍 Hint 2' : '🗺️ Hint 3'}
                      </span>
                      {h}
                    </div>
                  ))}
                  {/* Next hint button */}
                  {hintLevel < hints.length && (
                    <button
                      onClick={() => setHintLevel(l => l + 1)}
                      className={`text-xs font-mono uppercase tracking-widest
                                  transition-colors
                        ${hintLevel === 0
                          ? 'text-[var(--color-muted)] hover:text-yellow-600'
                          : hintLevel === 1
                          ? 'text-yellow-600 hover:text-orange-600'
                          : 'text-orange-600 hover:text-red-600'
                        }`}>
                      {hintLevel === 0 ? '💡 Show Hint 1'
                        : hintLevel === 1 ? '🔍 Show Hint 2 (more detail)'
                        : '🗺️ Show Hint 3 (almost full solution)'}
                    </button>
                  )}
                  {hintLevel === hints.length && hintLevel > 0 && (
                    <p className="text-[10px] font-mono text-[var(--color-muted)] uppercase tracking-wide">
                      All hints revealed — check the full solution after submitting
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Answer input */}
          {!submitted && (
            <div className="card bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
                <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                  Your Answer
                </label>
                {voiceSupported && (
                  <button
                    onClick={toggleVoice}
                    title={isListening ? 'Stop recording' : 'Speak your answer'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                                font-semibold border-2 transition-all
                      ${isListening
                        ? 'border-red-400 bg-red-50 text-red-600 animate-pulse'
                        : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-teal)] hover:text-[var(--color-teal)]'
                      }`}
                  >
                    {isListening ? (
                      <><span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> Stop Recording</>
                    ) : (
                      <>🎤 Speak Answer</>
                    )}
                  </button>
                )}
              </div>
              <div className="p-5 space-y-4">
                {/* Live transcript indicator */}
                {isListening && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200
                                  rounded-xl text-xs text-red-600 font-mono">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                    Listening... speak your full working clearly
                  </div>
                )}
                <textarea
                  value={studentAnswer}
                  onChange={e => setStudentAnswer(e.target.value)}
                  placeholder={voiceSupported
                    ? 'Type your answer or click "Speak Answer" to dictate...'
                    : 'Type your full working and answer here...'}
                  rows={5}
                  className={`w-full bg-[var(--color-paper)] border-2 rounded-xl px-4 py-3 text-sm
                             text-[var(--color-ink)] placeholder:text-[var(--color-muted)]
                             resize-none transition-colors
                             ${isListening
                               ? 'border-red-300 focus:border-red-400'
                               : 'border-[var(--color-border)] focus:border-[var(--color-teal)]'
                             }`}
                />
                <button onClick={handleSubmit} disabled={!studentAnswer.trim() || loading}
                  className="w-full btn-primary py-3.5 justify-center flex items-center gap-2 disabled:opacity-50">
                  Submit Answer ➤
                </button>
              </div>
            </div>
          )}

          {/* Grade result */}
          {submitted && gradeResult && (
            <div className="card overflow-hidden">
              <div className={`px-6 py-4 flex items-center justify-between
                ${gradeResult.is_correct ? 'bg-green-50' : 'bg-red-50'}`}>
                <ResultBadge result={gradeResult.result} />
                <span className={`font-serif font-black text-2xl
                  ${gradeResult.is_correct ? 'text-green-600' : 'text-red-500'}`}>
                  +{gradeResult.score}pts
                </span>
              </div>
              <div className="bg-white p-6 space-y-4">
                <p className="text-[var(--color-ink)] leading-relaxed">{gradeResult.feedback}</p>
                <p className="text-[var(--color-teal)] font-medium italic text-sm">
                  "{gradeResult.motivation}"
                </p>

                {/* ── Step-by-step breakdown ── */}
                {gradeResult.steps && gradeResult.steps.length > 0 && (
                  <StepBreakdown steps={gradeResult.steps} />
                )}

                {/* ── Video Panel — shown on wrong/partial answers ── */}
                {!gradeResult.is_correct && (
                  <VideoPanel topic={topic} level={selectedLevel || 'sss'} />
                )}

                {/* ── Ask Euler button — only on wrong/partial answers ── */}
                {!gradeResult.is_correct && (
                  <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-orange-800">
                          🤖 Ask Euler what went wrong
                        </p>
                        <p className="text-xs text-orange-600 mt-0.5">
                          Get a targeted explanation of your specific mistake
                        </p>
                      </div>
                      {!eulerExplanation && !askingEuler && (
                        <button
                          onClick={askEuler}
                          disabled={askingEuler}
                          className="shrink-0 ml-3 px-4 py-2 rounded-xl bg-orange-500
                                     hover:bg-orange-600 text-white text-xs font-bold
                                     transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {askingEuler
                            ? <><span className="w-3 h-3 border border-white/40 border-t-white
                                               rounded-full animate-spin" /> Thinking...</>
                            : '✨ Ask Euler'
                          }
                        </button>
                      )}
                    </div>

                    {/* Euler's targeted explanation */}
                    {(eulerExplanation || askingEuler) && (
                      <div className="border-t border-orange-200 px-4 py-4 bg-white">
                        <p className="font-mono text-[10px] uppercase tracking-widest
                                       text-orange-500 mb-2">
                          Euler's Analysis
                        </p>
                        <div className="text-sm text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap">
                          {eulerExplanation}
                          {askingEuler && <span className="inline-block w-2 h-4 bg-orange-400 ml-0.5 animate-pulse align-text-bottom" />}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Retry question — simpler version after wrong answer ── */}
                {!gradeResult.is_correct && !showRetry && (
                  <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-3
                                  flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm text-blue-800">
                        🔁 Try a simpler version
                      </p>
                      <p className="text-xs text-blue-600 mt-0.5">
                        Euler will generate an easier version of this question to build confidence
                      </p>
                    </div>
                    <button
                      onClick={loadRetryQuestion}
                      disabled={loadingRetry}
                      className="shrink-0 px-4 py-2 rounded-xl bg-blue-500
                                 hover:bg-blue-600 text-white text-xs font-bold
                                 transition-colors disabled:opacity-50
                                 flex items-center gap-1.5">
                      {loadingRetry
                        ? <><span className="w-3 h-3 border border-white/40
                                             border-t-white rounded-full animate-spin" /> Loading...</>
                        : '🔁 Get Simpler Question'
                      }
                    </button>
                  </div>
                )}

                {/* Retry question card */}
                {showRetry && retryQuestion && (
                  <div className="rounded-2xl border-2 border-blue-300 overflow-hidden">
                    <div className="bg-blue-500 px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white text-sm">🔁 Retry — Simpler Version</p>
                        <p className="text-blue-100 text-xs mt-0.5">
                          Same concept, easier numbers — build your confidence
                        </p>
                      </div>
                      <span className="text-blue-200 text-xs font-mono">Bonus question</span>
                    </div>
                    <div className="bg-white p-4 space-y-3">
                      {/* Retry question text */}
                      <div className="bg-[var(--color-paper)] rounded-xl p-4 text-sm
                                      text-[var(--color-ink)] font-medium leading-relaxed">
                        {retryQuestion.question}
                      </div>

                      {/* Retry progressive hints */}
                      {retryQuestion.hints?.length > 0 && !retrySubmitted && (
                        <div className="space-y-2">
                          {retryQuestion.hints.slice(0, retryHintLevel).map((h, i) => (
                            <div key={i}
                              className={`rounded-xl px-3 py-2 text-xs border
                                ${i === 0 ? 'bg-yellow-50 border-yellow-200 text-yellow-900'
                                  : i === 1 ? 'bg-orange-50 border-orange-200 text-orange-900'
                                  : 'bg-red-50 border-red-200 text-red-900'}`}>
                              <span className="font-bold uppercase tracking-wide mr-2">
                                {i === 0 ? '💡 Hint 1' : i === 1 ? '🔍 Hint 2' : '🗺️ Hint 3'}
                              </span>{h}
                            </div>
                          ))}
                          {retryHintLevel < retryQuestion.hints.length && (
                            <button
                              onClick={() => setRetryHintLevel(l => l + 1)}
                              className="text-[10px] font-mono uppercase tracking-widest
                                         text-[var(--color-muted)] hover:text-yellow-600 transition-colors">
                              💡 {retryHintLevel === 0 ? 'Show Hint' : 'Next Hint'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Retry answer input */}
                      {!retrySubmitted ? (
                        <div className="space-y-2">
                          <textarea
                            value={retryAnswer}
                            onChange={e => setRetryAnswer(e.target.value)}
                            placeholder="Type your answer here..."
                            rows={3}
                            className="w-full border-2 border-[var(--color-border)]
                                       focus:border-blue-400 rounded-xl px-3 py-2
                                       text-sm resize-none transition-colors"
                          />
                          <button
                            onClick={handleRetrySubmit}
                            disabled={!retryAnswer.trim()}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white
                                       font-bold py-2.5 rounded-xl text-sm transition-colors
                                       disabled:opacity-50">
                            Submit Retry Answer ➤
                          </button>
                        </div>
                      ) : retryResult && (
                        <div className={`rounded-xl px-4 py-3 border-2
                          ${retryResult.is_correct
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'}`}>
                          <p className={`font-bold text-sm mb-1
                            ${retryResult.is_correct ? 'text-green-700' : 'text-red-700'}`}>
                            {retryResult.is_correct ? '✅ Correct! Well done!' : '❌ Not quite — see solution below'}
                          </p>
                          <p className="text-xs text-[var(--color-muted)]">{retryResult.feedback}</p>
                          <button
                            onClick={() => {
                              const el = document.getElementById('retry-solution')
                              if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'
                            }}
                            className="mt-2 text-xs text-blue-600 hover:underline">
                            ▼ Show solution
                          </button>
                          <div id="retry-solution" style={{ display: 'none' }}
                            className="mt-2 bg-white rounded-xl p-3 text-xs
                                       text-[var(--color-ink)] whitespace-pre-wrap border
                                       border-[var(--color-border)]">
                            {retryQuestion.answer}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Show correct answer */}
                <div>
                  <button onClick={() => setShowAnswer(a => !a)}
                    className="text-sm font-medium text-[var(--color-teal)] hover:underline transition-all">
                    {showAnswer ? '▲ Hide Solution' : '▼ Show Full Solution'}
                  </button>
                  {showAnswer && (
                    <div className="mt-3 bg-[var(--color-paper)] border border-[var(--color-border)]
                                    rounded-xl p-4">
                      <ExplanationBody text={answer} />
                    </div>
                  )}
                </div>

                <button onClick={handleNext}
                  className="w-full btn-primary py-3.5 justify-center flex items-center gap-2">
                  {questionNumber >= 5 ? '🏁 Finish Session' : 'Next Question ➤'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
