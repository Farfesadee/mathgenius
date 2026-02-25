import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { askExamQuestion, listExamPapers, ingestExamPaper } from '../services/api'
import { ExplanationBody } from '../utils/RenderMath'
import { saveBookmark } from '../lib/bookmarks'

const EXAM_TYPES = ['WAEC', 'NECO', 'JAMB', 'OTHER']
const YEARS      = Array.from({ length: 25 }, (_, i) => 2024 - i)

const SAMPLE_QUESTIONS = {
  WAEC: [
    'Solve the equation 3x² - 7x + 2 = 0',
    'Find the area of a triangle with sides 5cm, 12cm and 13cm',
    'If log₂8 = x, find x',
    'A bag contains 4 red and 6 blue balls. Two balls are drawn without replacement. Find the probability that both are red.',
    'The bearing of B from A is 060°. Find the bearing of A from B.',
  ],
  NECO: [
    'Simplify (2√3 + √2)(2√3 - √2)',
    'Find the equation of a line passing through (2, 3) with gradient 4',
    'In triangle ABC, angle A = 60°, b = 8cm, c = 6cm. Find side a.',
    'Evaluate ∫(3x² + 2x - 1)dx',
    'Find the range of values of x for which 2x - 3 > 7',
  ],
  JAMB: [
    'If f(x) = 3x - 2 and g(x) = x², find f(g(2))',
    'Simplify (x² - 9)/(x² - x - 6)',
    'The sum of the first n terms of an AP is 3n² + 4n. Find the common difference.',
    'Find dy/dx if y = x³ - 6x² + 9x + 1',
    'A circle has equation x² + y² - 4x + 6y = 3. Find the centre and radius.',
  ],
}

function PaperCard({ paper }) {
  const colors = {
    WAEC:  'bg-blue-500',
    NECO:  'bg-green-500',
    JAMB:  'bg-purple-500',
    OTHER: 'bg-gray-500',
  }
  return (
    <div className="card overflow-hidden">
      <div className={`${colors[paper.exam_type] || colors.OTHER}
                       px-4 py-2 flex items-center justify-between`}>
        <span className="font-bold text-white text-sm">{paper.exam_type}</span>
        <span className="text-white/70 text-xs">{paper.size_mb} MB</span>
      </div>
      <div className="bg-white px-4 py-3">
        <p className="text-sm font-medium text-[var(--color-ink)] truncate">
          {paper.name.replace(/_/g, ' ')}
        </p>
      </div>
    </div>
  )
}

export default function PastQuestions() {
  const { user } = useAuth()
  const fileRef  = useRef(null)

  const [examType,   setExamType]   = useState('WAEC')
  const [year,       setYear]       = useState(2023)
  const [question,   setQuestion]   = useState('')
  const [response,   setResponse]   = useState('')
  const [loading,    setLoading]    = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [papers,     setPapers]     = useState([])
  const [tab,        setTab]        = useState('practice')  // practice | upload | papers

  // Upload state
  const [uploadTitle,    setUploadTitle]    = useState('')
  const [uploadExamType, setUploadExamType] = useState('WAEC')
  const [uploadYear,     setUploadYear]     = useState(2023)
  const [uploading,      setUploading]      = useState(false)
  const [uploadSuccess,  setUploadSuccess]  = useState('')
  const [uploadError,    setUploadError]    = useState('')

  useEffect(() => {
    loadPapers()
  }, [])

  const loadPapers = async () => {
    try {
      const res = await listExamPapers()
      setPapers(res.data.papers || [])
    } catch {
      setPapers([])
    }
  }

  const handleAsk = async () => {
    if (!question.trim() || loading) return
    setLoading(true)
    setResponse('')
    setBookmarked(false)
    try {
      const res = await askExamQuestion(question, examType, year)
      setResponse(res.data.response)
    } catch {
      setResponse('⚠️ Could not connect to backend. Make sure it is running.')
    }
    setLoading(false)
  }

  const handleSampleQuestion = (q) => {
    setQuestion(q)
    setResponse('')
  }

  const handleBookmark = async () => {
    if (!user || bookmarked || !response) return
    await saveBookmark({
      userId:  user.id,
      type:    'solution',
      title:   `${examType} ${year}: ${question.slice(0, 50)}...`,
      content: response,
      topic:   `${examType} Past Questions`,
    })
    setBookmarked(true)
    setTimeout(() => setBookmarked(false), 3000)
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uploadTitle) return

    setUploading(true)
    setUploadError('')
    setUploadSuccess('')

    try {
      const reader  = new FileReader()
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(',')[1]
        try {
          await ingestExamPaper(base64, uploadTitle, uploadExamType, uploadYear)
          setUploadSuccess(`✅ "${uploadTitle}" uploaded and ingested successfully!`)
          setUploadTitle('')
          await loadPapers()
        } catch (err) {
          setUploadError('❌ Upload failed. Check that the backend is running.')
        }
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setUploadError('❌ Could not read the file.')
      setUploading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase
                      text-[var(--color-gold)] mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" />
          Exam Preparation
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight">
          Past Questions
        </h1>
        <p className="text-[var(--color-muted)] mt-2 text-lg">
          Practice WAEC, NECO and JAMB past questions with full worked solutions from Euler.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-2 border-[var(--color-ink)] rounded-2xl
                      overflow-hidden mb-8 w-fit">
        {[
          { id: 'practice', label: '🎯 Practice Questions' },
          { id: 'papers',   label: '📁 Available Papers'   },
          { id: 'upload',   label: '⬆️ Upload Paper'       },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-6 py-3 text-sm font-semibold transition-all
              ${tab === t.id
                ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
                : 'bg-white text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PRACTICE TAB ── */}
      {tab === 'practice' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* Main area */}
          <div className="space-y-5">

            {/* Exam selector */}
            <div className="card bg-white overflow-hidden">
              <div className="bg-[var(--color-teal)] px-6 py-3">
                <p className="font-serif font-bold text-white">
                  Configure Exam
                </p>
              </div>
              <div className="p-5 flex flex-wrap gap-4">
                {/* Exam type */}
                <div className="flex-1 min-w-[140px]">
                  <label className="font-mono text-[10px] uppercase tracking-widest
                                     text-[var(--color-muted)] block mb-2">
                    Exam Type
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {EXAM_TYPES.map(et => (
                      <button
                        key={et}
                        onClick={() => setExamType(et)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold
                                    border-2 transition-all
                          ${examType === et
                            ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                            : 'border-[var(--color-border)] text-[var(--color-muted)]'
                          }`}
                      >
                        {et}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Year */}
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest
                                     text-[var(--color-muted)] block mb-2">
                    Year
                  </label>
                  <select
                    value={year}
                    onChange={e => setYear(Number(e.target.value))}
                    className="bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                               focus:border-[var(--color-teal)] rounded-xl px-4 py-2 text-sm
                               text-[var(--color-ink)] transition-colors"
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Question input */}
            <div className="card bg-white overflow-hidden">
              <div className="bg-[var(--color-ink)] px-6 py-3">
                <p className="font-serif font-bold text-white">
                  Enter Your Question
                </p>
              </div>
              <div className="p-5 space-y-4">
                <textarea
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder={`Type a ${examType} question here, or pick one from the samples on the right...`}
                  rows={4}
                  className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                             focus:border-[var(--color-teal)] rounded-xl px-4 py-3 text-sm
                             text-[var(--color-ink)] placeholder:text-[var(--color-muted)]
                             resize-none transition-colors"
                />
                <button
                  onClick={handleAsk}
                  disabled={!question.trim() || loading}
                  className="w-full btn-primary py-3.5 justify-center flex
                             items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30
                                       border-t-white rounded-full animate-spin" />
                      Euler is solving...
                    </>
                  ) : (
                    '🧮 Solve with Full Working'
                  )}
                </button>
              </div>
            </div>

            {/* Response */}
            {response && !loading && (
              <div className="card overflow-hidden">
                <div className="bg-[var(--color-teal)] px-6 py-3
                                flex items-center justify-between">
                  <span className="font-serif font-bold text-white">
                    🧠 Euler's Solution
                  </span>
                  {user && (
                    <button
                      onClick={handleBookmark}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium
                                  transition-all
                        ${bookmarked
                          ? 'bg-yellow-400 text-[var(--color-ink)]'
                          : 'bg-white/20 hover:bg-white/30 text-white'
                        }`}
                    >
                      {bookmarked ? '🔖 Saved!' : '🔖 Save'}
                    </button>
                  )}
                </div>
                <div className="bg-white p-6">
                  <ExplanationBody text={response} />
                </div>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div className="card bg-white p-6 space-y-3">
                <p className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-muted)]">
                  ⏳ Euler is working through this...
                </p>
                {[...Array(6)].map((_, i) => (
                  <div key={i}
                       className={`h-3 bg-[var(--color-border)] rounded
                                   animate-pulse ${i === 5 ? 'w-2/3' : 'w-full'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sample questions sidebar */}
          <div className="space-y-4">
            <div className="card overflow-hidden">
              <div className="bg-[var(--color-gold)] px-5 py-3">
                <p className="font-serif font-bold text-[var(--color-ink)]">
                  📋 Sample {examType} Questions
                </p>
              </div>
              <div className="bg-white divide-y divide-[var(--color-border)]">
                {(SAMPLE_QUESTIONS[examType] || SAMPLE_QUESTIONS.WAEC).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSampleQuestion(q)}
                    className="w-full text-left px-5 py-3.5 text-sm
                               text-[var(--color-ink)] hover:bg-[var(--color-cream)]
                               transition-colors leading-snug"
                  >
                    <span className="font-mono text-[var(--color-teal)] text-xs mr-2">
                      Q{i + 1}
                    </span>
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Exam tips */}
            <div className="card bg-white overflow-hidden">
              <div className="bg-[var(--color-ink)] px-5 py-3">
                <p className="font-serif font-bold text-white text-sm">
                  💡 Exam Tips
                </p>
              </div>
              <div className="p-4 space-y-3">
                {[
                  'Always show your working — examiners award method marks',
                  'Read each question twice before attempting',
                  'Circle key information in the question',
                  'Check your answer makes practical sense',
                  'If stuck, move on and come back later',
                ].map((tip, i) => (
                  <div key={i} className="flex gap-2 text-sm text-[var(--color-ink)]">
                    <span className="text-[var(--color-teal)] font-bold shrink-0">
                      {i + 1}.
                    </span>
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PAPERS TAB ── */}
      {tab === 'papers' && (
        <div>
          {papers.length === 0 ? (
            <div className="card bg-white p-12 text-center">
              <div className="text-5xl mb-4">📁</div>
              <h3 className="font-serif font-bold text-xl text-[var(--color-ink)] mb-2">
                No papers uploaded yet
              </h3>
              <p className="text-[var(--color-muted)] text-sm mb-4">
                Upload WAEC, NECO or JAMB PDF papers and Euler will learn from them.
              </p>
              <button
                onClick={() => setTab('upload')}
                className="btn-primary px-6 py-3 text-sm"
              >
                ⬆️ Upload First Paper
              </button>
            </div>
          ) : (
            <div>
              <p className="text-[var(--color-muted)] text-sm mb-4">
                {papers.length} paper{papers.length !== 1 ? 's' : ''} available
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {papers.map(paper => (
                  <PaperCard key={paper.filename} paper={paper} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── UPLOAD TAB ── */}
      {tab === 'upload' && (
        <div className="max-w-lg">
          <div className="card overflow-hidden">
            <div className="bg-[var(--color-teal)] px-6 py-4">
              <p className="font-serif font-bold text-white text-lg">
                ⬆️ Upload Past Paper
              </p>
              <p className="text-white/70 text-xs mt-1">
                Euler will learn from the uploaded PDF and use it to answer questions
              </p>
            </div>
            <div className="bg-white p-6 space-y-5">

              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] block mb-2">
                  Paper Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. Mathematics Paper 1"
                  className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                             focus:border-[var(--color-teal)] rounded-xl px-4 py-3 text-sm
                             transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest
                                     text-[var(--color-muted)] block mb-2">
                    Exam Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {EXAM_TYPES.map(et => (
                      <button
                        key={et}
                        type="button"
                        onClick={() => setUploadExamType(et)}
                        className={`py-2 rounded-xl text-xs font-semibold border-2
                                    transition-all
                          ${uploadExamType === et
                            ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                            : 'border-[var(--color-border)] text-[var(--color-muted)]'
                          }`}
                      >
                        {et}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest
                                     text-[var(--color-muted)] block mb-2">
                    Year
                  </label>
                  <select
                    value={uploadYear}
                    onChange={e => setUploadYear(Number(e.target.value))}
                    className="w-full bg-[var(--color-paper)] border-2
                               border-[var(--color-border)] focus:border-[var(--color-teal)]
                               rounded-xl px-3 py-3 text-sm transition-colors"
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File input */}
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] block mb-2">
                  PDF File
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-[var(--color-border)]
                             hover:border-[var(--color-teal)] rounded-xl p-8
                             text-center cursor-pointer transition-colors"
                >
                  <div className="text-3xl mb-2">📄</div>
                  <p className="text-sm text-[var(--color-muted)]">
                    Click to select a PDF file
                  </p>
                  <p className="text-xs text-[var(--color-muted)] mt-1">
                    Maximum 50MB
                  </p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={!uploadTitle || uploading}
                />
              </div>

              {uploading && (
                <div className="flex items-center gap-3 text-sm
                                text-[var(--color-teal)]">
                  <span className="w-4 h-4 border-2 border-[var(--color-teal)]
                                   border-t-transparent rounded-full animate-spin" />
                  Uploading and ingesting — this may take a few minutes...
                </div>
              )}

              {uploadSuccess && (
                <div className="bg-green-50 border border-green-200
                                rounded-xl px-4 py-3 text-green-700 text-sm">
                  {uploadSuccess}
                </div>
              )}

              {uploadError && (
                <div className="bg-red-50 border border-red-200
                                rounded-xl px-4 py-3 text-red-600 text-sm">
                  {uploadError}
                </div>
              )}

              {!uploadTitle && (
                <p className="text-xs text-[var(--color-muted)]">
                  ⚠️ Enter a title before selecting a file
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}