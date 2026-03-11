import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const MODES = [
  { id: 'solve',         label: 'Solve',         icon: '=',    color: '#1a8a7a', hint: 'Equations & expressions' },
  { id: 'differentiate', label: 'Differentiate',  icon: 'd/dx', color: '#c17c2a', hint: 'Find the derivative'      },
  { id: 'integrate',     label: 'Integrate',      icon: '∫',    color: '#2a6bc1', hint: 'Find the integral'        },
]

const SYMBOL_GROUPS = [
  { label: 'COMMON',   symbols: [{ display: '√', insert: 'sqrt(' }, { display: 'xⁿ', insert: '^' }, { display: 'π', insert: 'pi' }, { display: 'e', insert: 'e' }, { display: '|x|', insert: 'Abs(' }, { display: 'n!', insert: 'factorial(' }] },
  { label: 'TRIG',     symbols: [{ display: 'sin', insert: 'sin(' }, { display: 'cos', insert: 'cos(' }, { display: 'tan', insert: 'tan(' }, { display: 'sin⁻¹', insert: 'asin(' }, { display: 'cos⁻¹', insert: 'acos(' }, { display: 'tan⁻¹', insert: 'atan(' }] },
  { label: 'LOG',      symbols: [{ display: 'log', insert: 'log(' }, { display: 'ln', insert: 'ln(' }, { display: 'log₂', insert: 'log(2,' }] },
  { label: 'CALCULUS', symbols: [{ display: 'd/dx', insert: 'diff(' }, { display: '∫', insert: 'integrate(' }, { display: 'lim', insert: 'limit(' }] },
  { label: 'GREEK',    symbols: [{ display: 'α', insert: 'alpha' }, { display: 'β', insert: 'beta' }, { display: 'θ', insert: 'theta' }, { display: 'λ', insert: 'lambda' }, { display: 'σ', insert: 'sigma' }, { display: 'Σ', insert: 'Sum(' }] },
]

const EXAMPLES = [
  { expr: 'x^2 + 5*x + 6 = 0', label: 'Quadratic'         },
  { expr: 'sin(pi/6)',           label: 'Trigonometry'      },
  { expr: 'integrate(x^2, x)',   label: 'Integral'          },
  { expr: 'diff(x^3, x)',        label: 'Derivative'        },
  { expr: 'sqrt(144)',           label: 'Square root'       },
  { expr: 'log(100)',            label: 'Logarithm base 10' },
  { expr: 'factorial(5)',        label: '5!'                },
  { expr: '(2+3)*4 - 1',         label: 'Arithmetic'        },
]

// ── API calls ─────────────────────────────────────────────────────────
async function callSolve(expression, mode) {
  const res = await fetch(`${API_BASE}/solve/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expression, mode }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Streaming SSE helper ──────────────────────────────────────────────
// onToken(str) is called for each token; resolves with full text when done.
async function streamSSE(url, body, onToken) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') return full
      try {
        const { token } = JSON.parse(payload)
        full += token
        onToken(token)
      } catch {}
    }
  }
  return full
}

async function callImageSolve(image_base64, image_type, extra_instruction) {
  const res = await fetch(`${API_BASE}/solve/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64, image_type, extra_instruction }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Extract the answer value from whatever shape the backend returns ──
function extractAnswer(data) {
  if (!data) return null
  if (data.error) return { error: data.error }

  const toArr = (v) => Array.isArray(v) ? v : (v ? [String(v)] : [])

  // Prefer numeric field
  if (data.numerical !== undefined && data.numerical !== null)
    return { value: String(data.numerical), steps: toArr(data.steps), solutions: toArr(data.solutions) }

  // Standard result field
  if (data.result !== undefined && data.result !== null)
    return { value: String(data.result), steps: toArr(data.steps), solutions: toArr(data.solutions) }

  // Calculus-specific fields
  if (data.derivative !== undefined)
    return { value: String(data.derivative), steps: toArr(data.steps), solutions: [] }
  if (data.integral !== undefined)
    return { value: String(data.integral), steps: toArr(data.steps), solutions: [] }
  if (data.simplified !== undefined)
    return { value: String(data.simplified), steps: toArr(data.steps), solutions: [] }

  // Plain value
  if (typeof data === 'string' || typeof data === 'number')
    return { value: String(data), steps: [], solutions: [] }

  // Try every key until we find something displayable
  const skip = new Set(['steps', 'solutions', 'success', 'type', 'input', 'expression', 'latex'])
  for (const k of Object.keys(data)) {
    if (!skip.has(k) && data[k] !== null && data[k] !== undefined)
      return { value: String(data[k]), steps: toArr(data.steps), solutions: toArr(data.solutions) }
  }

  return { error: 'Could not display result. Check expression syntax.' }
}

// ── Result panel (shown in right column) ─────────────────────────────
function ResultPanel({ raw, mode, expression, onExplain, explaining, explanation }) {
  const modeConfig = MODES.find(m => m.id === mode)
  const parsed = raw ? extractAnswer(raw) : null

  if (!parsed) return null

  return (
    <div className="rounded-2xl border-2 border-[var(--color-border)] overflow-hidden bg-[var(--color-paper)]">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]"
           style={{ backgroundColor: modeConfig?.color + '18' }}>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-base" style={{ color: modeConfig?.color }}>
            {modeConfig?.icon}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: modeConfig?.color }}>
            {modeConfig?.label} Result
          </span>
        </div>
        <button
          onClick={onExplain}
          disabled={explaining || !!parsed.error}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                     border-2 border-[var(--color-border)] hover:border-[var(--color-teal)]
                     hover:text-[var(--color-teal)] transition-all disabled:opacity-40">
          {explaining
            ? <><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> Explaining...</>
            : '🧠 Explain Steps'
          }
        </button>
      </div>

      {/* Answer */}
      <div className="px-4 py-4">
        {parsed.error ? (
          <p className="text-red-500 text-sm font-mono">{parsed.error}</p>
        ) : (
          <div className="space-y-3">
            {/* Big answer */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[var(--color-muted)] font-mono text-sm">=</span>
              <span className="font-mono text-2xl font-black break-all"
                    style={{ color: modeConfig?.color }}>
                {parsed.value}
              </span>
            </div>

            {/* Equation solutions */}
            {parsed.solutions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {parsed.solutions.map((s, i) => (
                  <span key={i}
                    className="px-3 py-1 rounded-lg font-mono font-semibold text-sm text-white"
                    style={{ backgroundColor: modeConfig?.color }}>
                    x = {String(s)}
                  </span>
                ))}
              </div>
            )}

            {/* Steps */}
            {parsed.steps.length > 0 && (
              <div className="border-t border-[var(--color-border)] pt-3 space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-2">Steps</p>
                {parsed.steps.map((step, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="shrink-0 w-4 h-4 rounded-full text-white text-[9px] font-bold
                                     flex items-center justify-center mt-0.5"
                          style={{ backgroundColor: modeConfig?.color }}>
                      {i + 1}
                    </span>
                    <span className="font-mono text-[var(--color-ink)]">{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Explanation */}
      {explanation && (
        <div className="border-t-2 border-[var(--color-border)] px-4 py-4"
             style={{ backgroundColor: modeConfig?.color + '0d' }}>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-2"
             style={{ color: modeConfig?.color }}>
            Euler's Explanation
          </p>
          <div className="text-sm text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap font-mono">
            {explanation}
            {explaining && <span className="inline-block w-2 h-4 ml-0.5 animate-pulse align-text-bottom" style={{ backgroundColor: modeConfig?.color }} />}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Image upload tab ──────────────────────────────────────────────────
function ImageTab() {
  const [image,       setImage]       = useState(null)
  const [preview,     setPreview]     = useState(null)
  const [instruction, setInstr]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState(null)
  const [error,       setError]       = useState(null)
  const fileRef = useRef()

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target.result)
      const [header, data] = e.target.result.split(',')
      const type = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
      setImage({ base64: data, type })
    }
    reader.readAsDataURL(file)
  }

  const handleSolve = async () => {
    if (!image) return
    setLoading(true); setError(null); setResult('')
    try {
      await streamSSE(
        `${API_BASE}/solve/image/stream`,
        { image_base64: image.base64, image_type: image.type, extra_instruction: instruction || undefined },
        (token) => setResult(prev => prev + token)
      )
    } catch {
      setError('Could not connect to backend. Make sure it is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
        onDragOver={e => e.preventDefault()}
        className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all
                    min-h-[180px] flex items-center justify-center
                    ${preview ? 'border-[var(--color-teal)]' : 'border-[var(--color-border)] hover:border-[var(--color-teal)]'}`}
      >
        {preview ? (
          <>
            <img src={preview} alt="Question" className="max-h-64 max-w-full rounded-xl object-contain" />
            <button
              onClick={e => { e.stopPropagation(); setPreview(null); setImage(null); setResult(null) }}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[var(--color-ink)]
                         text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors">
              ✕
            </button>
          </>
        ) : (
          <div className="text-center p-8">
            <p className="text-4xl mb-2">📸</p>
            <p className="font-semibold text-[var(--color-ink)]">Drop a photo or click to upload</p>
            <p className="text-sm text-[var(--color-muted)] mt-1">Photos of questions, textbooks, handwritten work</p>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />
      </div>

      <input value={instruction} onChange={e => setInstr(e.target.value)}
        placeholder='Optional: e.g. "Solve questions 1–10 only" or "Show working for question 5" (leave blank to solve all)'
        className="w-full border-2 border-[var(--color-border)] focus:border-[var(--color-teal)]
                   rounded-xl px-4 py-3 text-sm bg-[var(--color-paper)] transition-colors" />

      <button onClick={handleSolve} disabled={!image || loading}
        className="w-full py-3.5 rounded-xl bg-[var(--color-ink)] text-[var(--color-paper)]
                   font-semibold text-sm flex items-center justify-center gap-2
                   hover:opacity-90 transition-opacity disabled:opacity-40">
        {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Reading...</> : '🔍 Read & Solve This Question'}
      </button>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">⚠️ {error}</div>}
      {result && (
        <div className="rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-paper)] overflow-hidden">
          <div className="bg-[var(--color-teal)] px-5 py-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white">Solution</p>
          </div>
          <div className="px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap font-mono">
            {result}
            {loading && <span className="inline-block w-2 h-4 bg-[var(--color-teal)] ml-0.5 animate-pulse align-text-bottom" />}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Camera snap tab ───────────────────────────────────────────────────
function CameraTab() {
  // Phases: 'viewfinder' | 'preview' | 'extracting' | 'edit' | 'solving' | 'result'
  const [phase,        setPhase]        = useState('viewfinder')
  const [capturedImg,  setCapturedImg]  = useState(null)   // { base64, type, dataUrl }
  const [extracted,    setExtracted]    = useState('')      // editable OCR text
  const [solveResult,  setSolveResult]  = useState(null)
  const [error,        setError]        = useState(null)
  const [facingMode,   setFacingMode]   = useState('environment')  // back camera by default
  const [stream,       setStream]       = useState(null)
  const [camError,     setCamError]     = useState(null)

  const videoRef   = useRef()
  const canvasRef  = useRef()

  // ── Start camera ─────────────────────────────────────────────────────
  const startCamera = async () => {
    setCamError(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      setStream(s)
      if (videoRef.current) {
        videoRef.current.srcObject = s
        videoRef.current.play()
      }
    } catch (err) {
      setCamError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Could not start camera: ' + err.message
      )
    }
  }

  // ── Stop camera ───────────────────────────────────────────────────────
  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
  }

  // Start camera when entering viewfinder phase
  useEffect(() => {
    if (phase === 'viewfinder') startCamera()
    else stopCamera()
    return () => stopCamera()
  }, [phase, facingMode])

  // ── Capture frame from video ──────────────────────────────────────────
  const capturePhoto = () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const base64  = dataUrl.split(',')[1]
    setCapturedImg({ base64, type: 'image/jpeg', dataUrl })
    setPhase('preview')
  }

  // ── Send to Claude Vision for OCR extraction ──────────────────────────
  const extractText = async () => {
    if (!capturedImg) return
    setPhase('extracting')
    setError(null)
    try {
      const res = await callImageSolve(
        capturedImg.base64,
        capturedImg.type,
        'Extract ONLY the maths question text from this image. Return just the question text with no extra commentary, no "Here is the question:", no formatting — just the raw question as the student would read it. If there are multiple questions, extract only the clearest one.'
      )
      // The backend returns { explanation: "..." } — use that as the extracted text
      const text = res.explanation || ''
      setExtracted(text.trim())
      setPhase('edit')
    } catch {
      setError('Could not read the image. Make sure the backend is running.')
      setPhase('preview')
    }
  }

  // ── Send extracted/edited question to Euler ───────────────────────────
  const solveQuestion = async () => {
    if (!extracted.trim()) return
    setPhase('solving')
    setError(null)
    setSolveResult('')
    try {
      await streamSSE(
        `${API_BASE}/solve/image/stream`,
        {
          image_base64: capturedImg.base64,
          image_type: capturedImg.type,
          extra_instruction: `The student has confirmed this is the question: "${extracted.trim()}".\n\nPlease solve it fully with clear step-by-step working. Show all steps a student needs to understand and reproduce the answer.`,
        },
        (token) => {
          setSolveResult(prev => prev + token)
          // Switch to result phase on first token so user sees output immediately
          setPhase(p => p === 'solving' ? 'result' : p)
        }
      )
      setPhase('result')
    } catch {
      setError('Could not solve the question. Make sure the backend is running.')
      setPhase('edit')
    }
  }

  // ── Reset everything ──────────────────────────────────────────────────
  const reset = () => {
    setCapturedImg(null); setExtracted(''); setSolveResult(null)
    setError(null); setPhase('viewfinder')
  }

  // ── VIEWFINDER ────────────────────────────────────────────────────────
  if (phase === 'viewfinder') {
    return (
      <div className="max-w-2xl space-y-4">
        {camError ? (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-5 py-8 text-center space-y-3">
            <p className="text-3xl">📷</p>
            <p className="font-semibold text-red-800 text-sm">{camError}</p>
            <button onClick={startCamera}
              className="px-5 py-2 rounded-xl bg-red-500 text-white text-sm font-bold
                         hover:bg-red-600 transition-colors">
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Live viewfinder */}
            <div className="relative rounded-2xl overflow-hidden bg-black border-2
                            border-[var(--color-border)]" style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} autoPlay playsInline muted
                className="w-full h-full object-cover" />

              {/* Corner guide lines */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Framing corners */}
                {[
                  'top-6 left-6 border-t-4 border-l-4 rounded-tl-lg',
                  'top-6 right-6 border-t-4 border-r-4 rounded-tr-lg',
                  'bottom-6 left-6 border-b-4 border-l-4 rounded-bl-lg',
                  'bottom-6 right-6 border-b-4 border-r-4 rounded-br-lg',
                ].map((cls, i) => (
                  <div key={i} className={`absolute w-8 h-8 border-white/80 ${cls}`} />
                ))}
                {/* Centre cross */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-px bg-white/40" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-6 w-px bg-white/40" />
                </div>
              </div>

              {/* Flip camera button (top right) */}
              <button
                onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
                className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50
                           text-white flex items-center justify-center text-lg
                           hover:bg-black/70 transition-colors backdrop-blur-sm">
                🔄
              </button>

              {/* Hint text */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-4">
                <p className="text-white/80 text-xs text-center font-mono tracking-wide">
                  Point at the question — keep steady
                </p>
              </div>
            </div>

            {/* Capture button */}
            <div className="flex justify-center">
              <button onClick={capturePhoto}
                className="w-20 h-20 rounded-full border-4 border-[var(--color-teal)]
                           bg-white hover:bg-[var(--color-teal)] hover:text-white
                           flex items-center justify-center transition-all shadow-lg group">
                <div className="w-14 h-14 rounded-full bg-[var(--color-teal)] group-hover:bg-white
                                flex items-center justify-center transition-all">
                  <span className="text-2xl">📸</span>
                </div>
              </button>
            </div>
            <p className="text-center text-xs text-[var(--color-muted)] -mt-1">Tap to capture</p>
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    )
  }

  // ── PREVIEW ───────────────────────────────────────────────────────────
  if (phase === 'preview') {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="rounded-2xl overflow-hidden border-2 border-[var(--color-border)]">
          <img src={capturedImg.dataUrl} alt="Captured" className="w-full object-contain max-h-72" />
        </div>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            ⚠️ {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={reset}
            className="py-3 rounded-xl border-2 border-[var(--color-border)]
                       text-sm font-semibold text-[var(--color-muted)]
                       hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-all">
            🔄 Retake
          </button>
          <button onClick={extractText}
            className="py-3 rounded-xl bg-[var(--color-teal)] text-white
                       text-sm font-bold hover:opacity-90 transition-opacity">
            🔍 Read Question →
          </button>
        </div>
      </div>
    )
  }

  // ── EXTRACTING ────────────────────────────────────────────────────────
  if (phase === 'extracting') {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="rounded-2xl overflow-hidden border-2 border-[var(--color-border)] opacity-60">
          <img src={capturedImg.dataUrl} alt="Captured" className="w-full object-contain max-h-72" />
        </div>
        <div className="flex items-center gap-3 justify-center py-6">
          <span className="w-6 h-6 border-3 border-[var(--color-teal)] border-t-transparent
                           rounded-full animate-spin" />
          <p className="font-mono text-sm text-[var(--color-muted)]">
            Euler is reading the question...
          </p>
        </div>
      </div>
    )
  }

  // ── EDIT EXTRACTED TEXT ───────────────────────────────────────────────
  if (phase === 'edit') {
    return (
      <div className="max-w-2xl space-y-4">
        {/* Thumbnail */}
        <div className="rounded-xl overflow-hidden border border-[var(--color-border)] max-h-36">
          <img src={capturedImg.dataUrl} alt="Captured"
            className="w-full object-contain max-h-36 opacity-80" />
        </div>

        {/* Editable extracted text */}
        <div className="rounded-2xl border-2 border-[var(--color-teal)] overflow-hidden">
          <div className="bg-[var(--color-teal)] px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white text-sm">✏️ Confirm the Question</p>
              <p className="text-white/70 text-xs mt-0.5">
                Euler extracted this — correct any errors before solving
              </p>
            </div>
            <button onClick={reset}
              className="text-white/60 hover:text-white text-xs font-mono transition-colors">
              retake ↩
            </button>
          </div>
          <div className="bg-white p-4">
            <textarea
              value={extracted}
              onChange={e => setExtracted(e.target.value)}
              rows={5}
              placeholder="Question text will appear here..."
              className="w-full border-2 border-[var(--color-border)] focus:border-[var(--color-teal)]
                         rounded-xl px-4 py-3 text-sm text-[var(--color-ink)] resize-none
                         transition-colors leading-relaxed"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            ⚠️ {error}
          </div>
        )}

        <button onClick={solveQuestion} disabled={!extracted.trim()}
          className="w-full py-4 rounded-xl bg-[var(--color-ink)] text-white font-bold
                     text-sm flex items-center justify-center gap-2
                     hover:opacity-90 transition-opacity disabled:opacity-40">
          🧮 Solve This Question →
        </button>
      </div>
    )
  }

  // ── SOLVING ───────────────────────────────────────────────────────────
  if (phase === 'solving') {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-paper)] p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-2">
            Question
          </p>
          <p className="text-sm text-[var(--color-ink)] leading-relaxed">{extracted}</p>
        </div>
        <div className="flex items-center gap-3 justify-center py-8">
          <span className="w-8 h-8 border-4 border-[var(--color-teal)] border-t-transparent
                           rounded-full animate-spin" />
          <p className="font-mono text-sm text-[var(--color-muted)]">
            Euler is solving...
          </p>
        </div>
      </div>
    )
  }

  // ── RESULT ────────────────────────────────────────────────────────────
  if (phase === 'result') {
    return (
      <div className="max-w-2xl space-y-4">
        {/* Question recap */}
        <div className="rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-paper)] px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-1">
            Question
          </p>
          <p className="text-sm text-[var(--color-ink)] leading-relaxed">{extracted}</p>
        </div>

        {/* Solution */}
        <div className="rounded-2xl border-2 border-[var(--color-teal)] overflow-hidden">
          <div className="bg-[var(--color-teal)] px-5 py-3 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white">
              ✅ Euler's Solution
            </p>
            <button onClick={() => setPhase('edit')}
              className="text-white/60 hover:text-white text-xs font-mono transition-colors">
              edit question ↩
            </button>
          </div>
          <div className="px-5 py-4 bg-white">
            <div className="text-sm text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap font-mono">
              {solveResult}
              {phase === 'solving' && <span className="inline-block w-2 h-4 bg-[var(--color-teal)] ml-0.5 animate-pulse align-text-bottom" />}
            </div>
          </div>
        </div>

        <button onClick={reset}
          className="w-full py-3 rounded-xl border-2 border-[var(--color-border)]
                     text-sm font-semibold text-[var(--color-muted)]
                     hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-all">
          📷 Snap Another Question
        </button>
      </div>
    )
  }

  return null
}

// ── Main page ─────────────────────────────────────────────────────────
export default function Solve() {
  const [tab,         setTab]         = useState('type')
  const [mode,        setMode]        = useState('solve')
  const [expression,  setExpression]  = useState('')
  const [result,      setResult]      = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [explanation, setExplanation] = useState(null)
  const [explaining,  setExplaining]  = useState(false)
  const inputRef    = useRef()
  const debounceRef = useRef()

  const evaluate = useCallback(async (expr, evalMode) => {
    const clean = expr.trim()
    if (!clean) { setResult(null); setError(null); return }
    setLoading(true); setError(null); setExplanation(null)
    try {
      const data = await callSolve(clean, evalMode)
      setResult(data)
    } catch {
      setError('Could not connect to backend. Make sure it is running on port 8000.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleModeChange = (newMode) => {
    setMode(newMode); setExplanation(null)
    if (expression.trim()) evaluate(expression, newMode)
  }

  const handleExpressionChange = (val) => {
    setExpression(val); setExplanation(null)
    clearTimeout(debounceRef.current)
    if (!val.trim()) { setResult(null); setError(null); return }
    debounceRef.current = setTimeout(() => evaluate(val, mode), 600)
  }

  const handleSolve = () => {
    clearTimeout(debounceRef.current)
    evaluate(expression, mode)
  }

  const handleExplain = async () => {
    if (!result || !expression) return
    setExplaining(true)
    setExplanation('')
    try {
      await streamSSE(
        `${API_BASE}/solve/explain/stream`,
        { expression, result: JSON.stringify(result.data || result) },
        (token) => setExplanation(prev => prev + token)
      )
    } catch {
      setExplanation('Could not generate explanation. Please try again.')
    } finally {
      setExplaining(false)
    }
  }

  const insertAt = (text) => {
    const el = inputRef.current
    if (!el) { handleExpressionChange(expression + text); return }
    const start = el.selectionStart
    const end   = el.selectionEnd
    const newVal = expression.slice(0, start) + text + expression.slice(end)
    handleExpressionChange(newVal)
    setTimeout(() => { el.focus(); el.setSelectionRange(start + text.length, start + text.length) }, 0)
  }

  const activeMode = MODES.find(m => m.id === mode)

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase text-[var(--color-gold)] mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" />
          Solve Module
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight">Scientific Calculator</h1>
        <p className="text-[var(--color-muted)] mt-2 text-lg">
          Type an expression or upload a photo — Euler solves it across all modes instantly.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b-2 border-[var(--color-border)] mb-6">
        {[
          { id: 'type',   label: '⌨️  Type Expression' },
          { id: 'camera', label: '📷  Snap a Question' },
          { id: 'image',  label: '🖼️  Upload Photo' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-all
              ${tab === t.id ? 'border-[var(--color-ink)] text-[var(--color-ink)]'
                             : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'camera' ? <CameraTab /> :
       tab === 'image'  ? <ImageTab />  : (
        // ── 3-column layout: calculator | result+explain | examples+mode ──
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px_260px] gap-5 items-start">

          {/* ── LEFT: Calculator ── */}
          <div className="space-y-3">

            {/* Mode tabs */}
            <div className="grid grid-cols-3 gap-2">
              {MODES.map(m => (
                <button key={m.id} onClick={() => handleModeChange(m.id)}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all
                               flex flex-col items-center gap-0.5
                    ${mode === m.id ? 'text-white border-transparent shadow-md' : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}
                  style={mode === m.id ? { backgroundColor: m.color } : {}}>
                  <span className="text-base font-mono">{m.icon}</span>
                  <span>{m.label}</span>
                  {mode === m.id && <span className="text-[10px] text-white/70 font-normal">{m.hint}</span>}
                </button>
              ))}
            </div>

            {/* Input area — light background, NOT black */}
            <div className="rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-paper)] overflow-hidden">

              {/* Expression display */}
              <div className="px-4 pt-4 pb-2 bg-[var(--color-cream)] border-b border-[var(--color-border)]">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] mb-1">
                  Enter expression
                </p>
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={expression}
                    onChange={e => handleExpressionChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSolve()}
                    placeholder="e.g. x^2 + 5*x + 6 = 0"
                    className="flex-1 bg-transparent text-2xl font-mono text-[var(--color-ink)]
                               outline-none placeholder-[var(--color-border)]"
                  />
                  {loading && (
                    <span className="w-5 h-5 border-2 border-[var(--color-teal)]
                                     border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                </div>
              </div>

              {/* Symbol groups */}
              <div className="bg-[var(--color-paper)]">
                {SYMBOL_GROUPS.map(group => (
                  <div key={group.label}
                    className="flex items-center border-b border-[var(--color-border)] last:border-b-0">
                    <span className="px-3 py-2 font-mono text-[9px] uppercase tracking-widest
                                     text-[var(--color-muted)] w-16 shrink-0">
                      {group.label}
                    </span>
                    <div className="flex flex-wrap gap-1 px-2 py-2">
                      {group.symbols.map(sym => (
                        <button key={sym.display} onClick={() => insertAt(sym.insert)}
                          className="px-2.5 py-1.5 rounded-lg bg-[var(--color-cream)] hover:bg-[var(--color-border)]
                                     text-[var(--color-ink)] text-sm font-mono transition-colors
                                     border border-[var(--color-border)]">
                          {sym.display}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Numpad */}
              <div className="border-t border-[var(--color-border)] p-3 bg-[var(--color-cream)]">
                <div className="grid grid-cols-5 gap-1.5">
                  {/* Row 1 */}
                  <button onClick={() => { setExpression(''); setResult(null); setError(null) }}
                    className="py-3 rounded-xl bg-red-100 hover:bg-red-500 text-red-600 hover:text-white
                               font-bold font-mono transition-colors text-sm">
                    AC
                  </button>
                  {['(', ')', '%', '+'].map(k => (
                    <button key={k} onClick={() => insertAt(k)}
                      className="py-3 rounded-xl bg-white hover:bg-[var(--color-border)]
                                 text-[var(--color-ink)] font-mono font-semibold transition-colors border
                                 border-[var(--color-border)]">
                      {k}
                    </button>
                  ))}
                  {/* Row 2 */}
                  {['7','8','9'].map(k => (
                    <button key={k} onClick={() => insertAt(k)}
                      className="py-3 rounded-xl bg-white hover:bg-[var(--color-border)]
                                 text-[var(--color-ink)] font-mono text-lg transition-colors
                                 border border-[var(--color-border)]">
                      {k}
                    </button>
                  ))}
                  <button onClick={() => setExpression(p => p.slice(0,-1))}
                    className="py-3 rounded-xl bg-white hover:bg-[var(--color-border)]
                               text-[var(--color-ink)] font-mono transition-colors border border-[var(--color-border)]">
                    ⌫
                  </button>
                  <button onClick={() => insertAt('*')}
                    className="py-3 rounded-xl bg-white hover:bg-[var(--color-border)]
                               text-[var(--color-teal)] font-mono font-bold text-lg transition-colors
                               border border-[var(--color-border)]">
                    ×
                  </button>
                  {/* Row 3 */}
                  {['4','5','6'].map(k => (
                    <button key={k} onClick={() => insertAt(k)}
                      className="py-3 rounded-xl bg-white hover:bg-[var(--color-border)]
                                 text-[var(--color-ink)] font-mono text-lg transition-colors
                                 border border-[var(--color-border)]">
                      {k}
                    </button>
                  ))}
                  <button onClick={() => insertAt('^')}
                    className="py-3 rounded-xl bg-white hover:bg-[var(--color-border)]
                               text-[var(--color-ink)] font-mono text-sm transition-colors
                               border border-[var(--color-border)]">
                    xⁿ
                  </button>
                  <button onClick={() => insertAt('/')}
                    className="py-3 rounded-xl bg-white hover:bg-[var(--color-border)]
                               text-[var(--color-teal)] font-mono font-bold text-lg transition-colors
                               border border-[var(--color-border)]">
                    ÷
                  </button>
                  {/* Row 4 */}
                  {['1','2','3'].map(k => (
                    <button key={k} onClick={() => insertAt(k)}
                      className="py-3 rounded-xl bg-white hover:bg-[var(--color-border)]
                                 text-[var(--color-ink)] font-mono text-lg transition-colors
                                 border border-[var(--color-border)]">
                      {k}
                    </button>
                  ))}
                  <button onClick={() => insertAt('-')}
                    className="py-3 rounded-xl bg-white hover:bg-[var(--color-border)]
                               text-[var(--color-teal)] font-mono font-bold text-lg transition-colors
                               border border-[var(--color-border)]">
                    −
                  </button>
                  {/* = button spans 2 rows */}
                  <button onClick={handleSolve} disabled={loading || !expression.trim()}
                    className="row-span-2 rounded-xl text-white font-bold transition-all
                               disabled:opacity-40 flex items-center justify-center text-sm"
                    style={{ backgroundColor: activeMode?.color }}>
                    {loading
                      ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <span className="text-center">
                          <span className="block text-xl">{activeMode?.icon}</span>
                          <span className="block text-[11px] mt-0.5">{activeMode?.label}</span>
                        </span>
                    }
                  </button>
                  {/* Row 5 */}
                  <button onClick={() => insertAt('0')}
                    className="col-span-2 py-3 rounded-xl bg-white hover:bg-[var(--color-border)]
                               text-[var(--color-ink)] font-mono text-lg transition-colors
                               border border-[var(--color-border)]">
                    0
                  </button>
                  <button onClick={() => insertAt('.')}
                    className="py-3 rounded-xl bg-white hover:bg-[var(--color-border)]
                               text-[var(--color-ink)] font-mono text-lg transition-colors
                               border border-[var(--color-border)]">
                    .
                  </button>
                  <button onClick={() => insertAt('x')}
                    className="py-3 rounded-xl bg-white hover:bg-[var(--color-border)]
                               text-[var(--color-teal)] font-mono italic font-bold text-lg transition-colors
                               border border-[var(--color-border)]">
                    x
                  </button>
                </div>
              </div>
            </div>

            {/* Error (below calculator) */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3
                              text-sm text-red-600 flex items-center gap-2">
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* ── MIDDLE: Result + Explain Steps ── */}
          <div className="space-y-4">
            {result?.data ? (
              <ResultPanel
                raw={result.data}
                mode={mode}
                expression={expression}
                onExplain={handleExplain}
                explaining={explaining}
                explanation={explanation}
              />
            ) : (
              /* Placeholder when no result yet */
              <div className="rounded-2xl border-2 border-dashed border-[var(--color-border)]
                              flex flex-col items-center justify-center py-16 px-6 text-center">
                <span className="text-4xl mb-3">🧮</span>
                <p className="text-sm font-semibold text-[var(--color-muted)]">
                  Result appears here
                </p>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  Type an expression and press Enter
                </p>
              </div>
            )}
          </div>

          {/* ── RIGHT: How to Type Expressions + Current Mode ── */}
          <div className="space-y-4">

            {/* How to Type Expressions */}
            <div className="rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-paper)] overflow-hidden">
              <div className="bg-[var(--color-ink)] px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">
                  📋 How to Type Expressions
                </p>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {EXAMPLES.map(ex => (
                  <button key={ex.expr}
                    onClick={() => { handleExpressionChange(ex.expr); inputRef.current?.focus() }}
                    className="w-full flex items-center justify-between px-3 py-2.5
                               hover:bg-[var(--color-cream)] transition-colors text-left group">
                    <div>
                      <p className="font-mono text-xs text-[var(--color-teal)] font-semibold
                                    group-hover:text-[var(--color-ink)] transition-colors">
                        {ex.expr}
                      </p>
                      <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{ex.label}</p>
                    </div>
                    <span className="text-[var(--color-muted)] text-xs opacity-0
                                     group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Current Mode info */}
            <div className="rounded-2xl border-2 overflow-hidden"
                 style={{ borderColor: activeMode?.color + '40' }}>
              <div className="px-4 py-3" style={{ backgroundColor: activeMode?.color + '15' }}>
                <p className="font-mono text-[10px] uppercase tracking-widest mb-0.5"
                   style={{ color: activeMode?.color }}>Current Mode</p>
                <p className="font-bold text-[var(--color-ink)]">{activeMode?.label}</p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">{activeMode?.hint}</p>
              </div>
              <div className="px-4 py-3 bg-[var(--color-paper)]">
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  {mode === 'solve'
                    ? 'Solves equations, evaluates expressions, simplifies algebra.'
                    : mode === 'differentiate'
                    ? 'Finds the derivative. Use x as the variable. E.g. x^3 → 3x²'
                    : 'Finds the antiderivative. E.g. x^2 → x³/3 + C'
                  }
                </p>
                <p className="text-xs font-semibold mt-1.5" style={{ color: activeMode?.color }}>
                  💡 Switch modes anytime — re-evaluates instantly.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
