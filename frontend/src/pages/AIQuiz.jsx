import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { generateMCQ } from '../services/api'
import { ExplanationBody } from '../utils/RenderMath'

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard']
const LEVEL_OPTIONS = ['junior secondary', 'secondary', 'university']

const SUGGESTED_TOPICS = [
    'Quadratic Equations', 'Differentiation', 'Integration', 'Probability',
    'Logarithms', 'Trigonometry', 'Matrices', 'Vectors', 'Binomial Expansion',
    'Sequences and Series', 'Circle Theorems', 'Statistics',
]

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

export default function AIQuiz() {
    const { user } = useAuth()

    // Setup
    const [topic, setTopic] = useState('')
    const [difficulty, setDifficulty] = useState('medium')
    const [level, setLevel] = useState('secondary')
    const [generating, setGenerating] = useState(false)

    // Question state
    const [question, setQuestion] = useState(null)
    const [selected, setSelected] = useState(null)
    const [submitted, setSubmitted] = useState(false)
    const [score, setScore] = useState({ correct: 0, total: 0 })
    const [error, setError] = useState(null)

    const generate = async () => {
        if (!topic.trim() || generating) return
        setGenerating(true)
        setQuestion(null)
        setSelected(null)
        setSubmitted(false)
        setError(null)
        try {
            const res = await generateMCQ(topic.trim(), difficulty, level)
            setQuestion(res.data)
        } catch {
            setError('⚠️ Could not generate question. Make sure the backend is running.')
        }
        setGenerating(false)
    }

    const handleSubmit = () => {
        if (!selected || submitted) return
        const isCorrect = selected === question.correct_answer
        setSubmitted(true)
        setScore(s => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }))
    }

    const handleNext = () => generate()

    const optionText = (letter) => {
        const map = { A: question?.option_a, B: question?.option_b, C: question?.option_c, D: question?.option_d }
        return map[letter] || ''
    }

    return (
        <div className="max-w-3xl mx-auto px-6 py-10">

            {/* Header */}
            <div className="mb-8">
                <p className="font-mono text-xs tracking-widest uppercase
                      text-[var(--color-gold)] mb-2 flex items-center gap-3">
                    <span className="block w-6 h-px bg-[var(--color-gold)]" />
                    AI Question Generator
                </p>
                <h1 className="font-serif font-black text-5xl tracking-tight">🤖 AI Quiz</h1>
                <p className="text-[var(--color-muted)] mt-2">
                    Type any topic and Euler generates a multiple-choice question instantly.
                </p>
            </div>

            {/* Setup card */}
            <div className="card overflow-hidden mb-6">
                <div className="bg-[var(--color-teal)] px-6 py-4">
                    <p className="font-serif font-bold text-white text-lg">🎯 Generate a Question</p>
                </div>
                <div className="bg-white p-6 space-y-5">

                    {/* Topic input */}
                    <div>
                        <label className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-muted)] block mb-2">
                            Topic (type anything)
                        </label>
                        <input
                            type="text"
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && generate()}
                            placeholder="e.g. Quadratic Equations, Integration by parts..."
                            className="w-full border-2 border-[var(--color-border)]
                         focus:border-[var(--color-teal)] rounded-xl px-4 py-3 text-sm
                         transition-colors"
                        />
                        {/* Suggested topics */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {SUGGESTED_TOPICS.map(t => (
                                <button key={t} onClick={() => setTopic(t)}
                                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-all
                    ${topic === t
                                            ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                                            : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-teal)]'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Difficulty + Level row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="font-mono text-[10px] uppercase tracking-widest
                                 text-[var(--color-muted)] block mb-2">Difficulty</label>
                            <div className="flex gap-2">
                                {DIFFICULTY_OPTIONS.map(d => (
                                    <button key={d} onClick={() => setDifficulty(d)}
                                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all capitalize
                      ${difficulty === d
                                                ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                                                : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                                        {d === 'easy' ? '🟢' : d === 'medium' ? '🟡' : '🔴'} {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="font-mono text-[10px] uppercase tracking-widest
                                 text-[var(--color-muted)] block mb-2">Level</label>
                            <select value={level} onChange={e => setLevel(e.target.value)}
                                className="w-full border-2 border-[var(--color-border)]
                           focus:border-[var(--color-teal)] rounded-xl px-3 py-2.5 text-xs
                           transition-colors capitalize">
                                {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                    </div>

                    <button onClick={generate} disabled={!topic.trim() || generating}
                        className="w-full btn-primary py-4 text-base justify-center flex items-center gap-2 disabled:opacity-50">
                        {generating
                            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                            : '🤖 Generate Question'
                        }
                    </button>
                </div>
            </div>

            {/* Score tracker */}
            {score.total > 0 && (
                <div className="flex items-center gap-4 mb-4 px-1">
                    <span className="font-serif font-black text-2xl text-[var(--color-teal)]">
                        {score.correct}/{score.total}
                    </span>
                    <div className="flex-1 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-teal)] rounded-full transition-all duration-500"
                            style={{ width: `${Math.round((score.correct / score.total) * 100)}%` }} />
                    </div>
                    <span className="font-mono text-sm text-[var(--color-muted)]">
                        {Math.round((score.correct / score.total) * 100)}% accuracy
                    </span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="card bg-white p-6 text-center text-[var(--color-muted)]">{error}</div>
            )}

            {/* Question card */}
            {question && !generating && (
                <div className="space-y-4">
                    <div className="card overflow-hidden">
                        <div className="bg-[var(--color-ink)] px-6 py-3 flex items-center justify-between">
                            <span className="font-serif font-bold text-white">AI-Generated Question</span>
                            <span className="font-mono text-white/60 text-xs capitalize">{topic} · {difficulty}</span>
                        </div>
                        <div className="bg-white p-6">
                            <p className="text-[var(--color-ink)] text-base leading-relaxed font-medium">
                                {question.question_text}
                            </p>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                        {OPTION_LETTERS.map(letter => {
                            const text = optionText(letter)
                            if (!text) return null
                            const isCorrect = letter === question.correct_answer
                            const isSelected = letter === selected

                            let style = 'border-[var(--color-border)] bg-white hover:border-[var(--color-teal)] cursor-pointer'
                            if (submitted) {
                                if (isCorrect) style = 'border-green-500 bg-green-50 cursor-default'
                                else if (isSelected) style = 'border-red-400 bg-red-50 cursor-default'
                                else style = 'border-[var(--color-border)] bg-white opacity-50 cursor-default'
                            } else if (isSelected) {
                                style = 'border-[var(--color-teal)] bg-[#e8f4f4]'
                            }

                            return (
                                <button key={letter} disabled={submitted} onClick={() => setSelected(letter)}
                                    className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left
                             transition-all duration-150 ${style}`}>
                                    <span className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center
                                   font-bold text-sm border-2 transition-all
                    ${submitted && isCorrect ? 'bg-green-500 border-green-500 text-white'
                                            : submitted && isSelected ? 'bg-red-400 border-red-400 text-white'
                                                : isSelected ? 'bg-[var(--color-teal)] border-[var(--color-teal)] text-white'
                                                    : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                                        {letter}
                                    </span>
                                    <span className="text-sm text-[var(--color-ink)] pt-0.5">{text}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Submit / Result */}
                    {!submitted ? (
                        <button onClick={handleSubmit} disabled={!selected}
                            className="w-full btn-primary py-4 text-base justify-center flex disabled:opacity-50">
                            Submit Answer ➤
                        </button>
                    ) : (
                        <div className="card overflow-hidden">
                            <div className={`px-6 py-4 ${selected === question.correct_answer ? 'bg-green-50' : 'bg-red-50'}`}>
                                <p className="font-serif font-bold text-lg text-[var(--color-ink)] mb-2">
                                    {selected === question.correct_answer ? '🎉 Correct!' : `❌ Incorrect — Answer was ${question.correct_answer}`}
                                </p>
                                {question.explanation && (
                                    <div className="bg-white rounded-xl p-4 text-sm leading-relaxed">
                                        <p className="font-semibold text-[var(--color-teal)] mb-1">📖 Explanation</p>
                                        <ExplanationBody text={question.explanation} />
                                    </div>
                                )}
                            </div>
                            <div className="bg-white p-4">
                                <button onClick={handleNext}
                                    className="w-full btn-primary py-3.5 text-sm justify-center flex">
                                    🤖 Generate Next Question ➤
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
