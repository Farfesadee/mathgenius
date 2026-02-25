import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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
export const askTutor = (question, topic, level, conversation_history = []) =>
  API.post('/teach/ask', { question, topic, level, conversation_history })

export const getTopicOverview = (topic, level) =>
  API.post('/teach/overview', { topic, level })

export const getTopics = () =>
  API.get('/teach/topics')


export const generateQuestion = (topic, level, difficulty, questionNumber) =>
  API.post('/solve/practice/question', {
    topic, level, difficulty, question_number: questionNumber
  })

export const gradeAnswer = (topic, question, correctAnswer, studentAnswer) =>
  API.post('/solve/practice/grade', {
    topic, question, correct_answer: correctAnswer, student_answer: studentAnswer
  })


export const askExamQuestion  = (question, examType, year, topic) =>
  API.post('/exams/ask', { question, exam_type: examType, year, topic })

export const listExamPapers   = () =>
  API.get('/exams/papers')

export const ingestExamPaper  = (pdfBase64, title, examType, year) =>
  API.post('/exams/ingest', {
    pdf_base64: pdfBase64,
    title,
    exam_type: examType,
    year,
  })


  export const parseQuestions     = (markdownContent, examType, year) =>
  API.post('/cbt/parse', { markdown_content: markdownContent, exam_type: examType, year })

export const explainCBTAnswer   = (question, studentAnswer) =>
  API.post('/cbt/explain', question)

export const generateCBTReport  = (questions, score, total, timeSecs, examType, topic) =>
  API.post('/cbt/report-summary', {
    questions, score, total,
    time_taken_secs: timeSecs,
    exam_type: examType,
    topic,
  })