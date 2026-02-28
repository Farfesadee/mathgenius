import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Calculator from '../components/solve/Calculator'
import ResultDisplay from '../components/solve/ResultDisplay'
import ImageSolver from '../components/solve/ImageSolver'
import { solveExpression, explainSolution } from '../services/api'

export default function Solve() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') === 'image' ? 'image' : 'calculator')
  const [mode, setMode] = useState('solve')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [explaining, setExplaining] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [error, setError] = useState('')

  const handleSolve = async (expr, currentMode) => {
    if (!expr.trim()) return
    setLoading(true)
    setResult(null)
    setExplanation('')
    setError('')
    try {
      const res = await solveExpression(expr, currentMode)
      setResult(res.data.data)
    } catch {
      setError('Could not connect to backend. Make sure it is running on port 8000.')
    } finally {
      setLoading(false)
    }
  }

  const handleExplain = async () => {
    if (!result) return
    setExplaining(true)
    try {
      const res = await explainSolution(
        result.input,
        result.solution || result.simplified || result.result || ''
      )
      setExplanation(res.data.explanation)
    } catch {
      setExplanation('Could not get explanation. Make sure backend is running.')
    } finally {
      setExplaining(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase text-[var(--color-gold)] mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" />
          Solve Module
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight">
          Scientific Calculator
        </h1>
        <p className="text-[var(--color-muted)] mt-2 text-lg">
          Type an expression or upload a photo of your question — Euler will solve it using all available methods.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b-2 border-[var(--color-ink)] mb-8">
        {[
          { id: 'calculator', label: '⌨️ Type Expression' },
          { id: 'image', label: '📷 Upload Photo / Screenshot' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-6 py-3 font-semibold text-sm transition-all duration-150 border-b-2 -mb-0.5
              ${tab === t.id
                ? 'border-[var(--color-gold)] text-[var(--color-ink)]'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'calculator' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          {/* Calculator */}
          <Calculator
            onSolve={handleSolve}
            mode={mode}
            onModeChange={setMode}
          />

          {/* Result panel */}
          <div>
            {loading && (
              <div className="card p-10 text-center">
                <div className="font-mono text-[var(--color-teal)] animate-pulse text-lg">
                  ⏳ Solving...
                </div>
              </div>
            )}
            {error && (
              <div className="border-2 border-red-300 bg-red-50 rounded-2xl p-6 text-red-600 font-mono text-sm">
                ⚠️ {error}
              </div>
            )}
            {!loading && (
              <ResultDisplay
                result={result}
                onExplain={handleExplain}
                explaining={explaining}
                explanation={explanation}
              />
            )}
            {!result && !loading && (
              <div className="card">
                <div className="bg-[var(--color-ink)] px-6 py-3">
                  <span className="font-serif text-white font-semibold">📋 How to Type Expressions</span>
                </div>
                <div className="bg-white p-6 grid grid-cols-2 gap-3">
                  {[
                    ['x^2 + 5*x + 6 = 0', 'Quadratic equation'],
                    ['sqrt(144)', 'Square root'],
                    ['sin(pi/6)', 'Trigonometry'],
                    ['diff(x^3, x)', 'Differentiate x³'],
                    ['integrate(x^2, x)', 'Integrate x²'],
                    ['log(100)', 'Logarithm base 10'],
                    ['factorial(5)', '5!'],
                    ['(2+3)*4 - 1', 'Arithmetic'],
                  ].map(([expr, desc]) => (
                    <div key={expr} className="bg-[var(--color-paper)] rounded-xl p-3">
                      <p className="font-mono text-xs text-[var(--color-teal)] font-semibold">{expr}</p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Image upload tab */
        <div className="max-w-3xl mx-auto">
          <ImageSolver />
        </div>
      )}
    </div>
  )
}