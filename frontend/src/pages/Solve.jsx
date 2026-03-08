import { useState, useEffect, useRef, useCallback } from 'react'

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

async function callExplain(expression, result) {
  const res = await fetch(`${API_BASE}/solve/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expression, result }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
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
    setLoading(true); setError(null); setResult(null)
    try {
      const data = await callImageSolve(image.base64, image.type, instruction || undefined)
      setResult(data.explanation)
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
        placeholder='Additional instruction (optional) — e.g. "Only show the graphical method"'
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
          <div className="px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap font-mono">{result}</div>
        </div>
      )}
    </div>
  )
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
    try {
      const data = await callExplain(expression, JSON.stringify(result.data || result))
      setExplanation(data.explanation)
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
        {[{ id: 'type', label: '⌨️  Type Expression' }, { id: 'image', label: '📷  Upload Photo / Screenshot' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-all
              ${tab === t.id ? 'border-[var(--color-ink)] text-[var(--color-ink)]'
                             : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'image' ? <ImageTab /> : (
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
