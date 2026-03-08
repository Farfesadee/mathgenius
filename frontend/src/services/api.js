import axios from 'axios'
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
})
// ── SOLVE ──────────────────────────────────────
export const solveExpression = (expression, mode = 'solve') =>
  API.post('/solve/', { expression, mode })
export const explainSolution = (expression, result) =>
  API.post('/solve/explain', { expression, result })
export const solveFromImage = (image_base64, image_type, extra_instruction = null) =>
  API.post('/solve/image', { image_base64, image_type, extra_instruction })
// ── TEACH ──────────────────────────────────────
export const askTutor = (question, topic, level, conversation_history = [], user_id = null) =>
  API.post('/teach/ask', { question, topic, level, conversation_history, user_id })
export const getTopicOverview = (topic, level) =>
  API.post('/teach/overview', { topic, level })
export const getTopics = () =>
  API.get('/teach/topics')
export const generateQuestion = (topic, level, difficulty, questionNumber, previousQuestions = [], examContext = '') =>
  API.post('/solve/practice/question', {
    topic, level, difficulty,
    question_number:    questionNumber,
    previous_questions: previousQuestions,
    exam_context:       examContext,
  })
export const gradeAnswer = (topic, question, correctAnswer, studentAnswer) =>
  API.post('/solve/practice/grade', {
    topic, question, correct_answer: correctAnswer, student_answer: studentAnswer
  })
export const askExamQuestion = (question, examType, year, topic) =>
  API.post('/exams/ask', { question, exam_type: examType, year, topic })
export const listExamPapers = () =>
  API.get('/exams/papers')
export const ingestExamPaper = (pdfBase64, title, examType, year) =>
  API.post('/exams/ingest', {
    pdf_base64: pdfBase64,
    title,
    exam_type: examType,
    year,
  })
export const parseQuestions = (markdownContent, examType, year) =>
  API.post('/cbt/parse', { markdown_content: markdownContent, exam_type: examType, year })
export const explainCBTAnswer = (question, studentAnswer) =>
  API.post('/cbt/explain', question)
export const generateCBTReport = (questions, score, total, timeSecs, examType, topic) =>
  API.post('/cbt/report-summary', {
    questions, score, total,
    time_taken_secs: timeSecs,
    exam_type: examType,
    topic,
  })
// ── TRACKING ───────────────────────────────────────────────
export const getUserProfile = (userId) =>
  API.get(`/tracking/profile/${userId}`)
export const updateUserProfile = (userId, data) =>
  API.put(`/tracking/profile/${userId}`, data)
// ── DAILY CHALLENGE & MCQ ───────────────────────────────
export const getDailyChallenge = (examType = 'JAMB') =>
  API.get('/cbt/daily-challenge', { params: { exam_type: examType } })
export const generateMCQ = (topic, difficulty = 'medium', level = 'secondary') =>
  API.post('/cbt/generate-mcq', { topic, difficulty, level })

// ── PRACTICE LEARNING QUALITY ──────────────────────────────────
export const getWorkedExample = (topic, level, difficulty) =>
  API.post('/solve/practice/worked-example', { topic, level, difficulty })

export const getRetryQuestion = (topic, level, originalQuestion, studentWrongAnswer) =>
  API.post('/solve/practice/retry-question', {
    topic, level,
    original_question:    originalQuestion,
    student_wrong_answer: studentWrongAnswer,
  })
