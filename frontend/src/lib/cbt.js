import { supabase } from './supabase'

// ── Upload parsed questions to Supabase ───────────────────
export async function uploadQuestions(questions, examType, year, subject = 'Mathematics') {
  const rows = questions.map(q => ({
    exam_type:     examType,
    subject,
    year,
    topic:         q.topic         || null,
    question_no:   q.question_no   || null,
    question_text: q.question_text || '',
    option_a:      q.option_a      || '',
    option_b:      q.option_b      || '',
    option_c:      q.option_c      || '',
    option_d:      q.option_d      || '',
    correct_answer: q.correct_answer || null,
    difficulty:    q.difficulty    || 'medium',
  }))

  const { data, error } = await supabase
    .from('exam_questions')
    .insert(rows)
    .select()
  return { data, error }
}

// ── Fetch questions for a CBT session ─────────────────────
export async function fetchCBTQuestions({
  examType, topics, difficulty, year, count = 10
}) {
  let query = supabase
    .from('exam_questions')
    .select('*')

  if (examType && examType !== 'Mixed') query = query.eq('exam_type', examType)

  // Multi-topic support
  if (topics && topics.length === 1) {
    query = query.ilike('topic', `%${topics[0]}%`)
  } else if (topics && topics.length > 1) {
    // Supabase OR filter for multiple topics
    const topicFilter = topics.map(t => `topic.ilike.%${t}%`).join(',')
    query = query.or(topicFilter)
  }

  if (difficulty && difficulty !== 'mixed') query = query.eq('difficulty', difficulty)
  if (year) query = query.eq('year', year)

  query = query
    .not('option_a', 'is', null)
    .not('option_b', 'is', null)
    .not('option_c', 'is', null)
    .not('option_d', 'is', null)

  const { data, error } = await query
  if (error || !data?.length) return { data: [], error }

  // Shuffle — if multiple topics, interleave them
  let pool = [...data]
  if (topics && topics.length > 1) {
    // Group by topic and round-robin pick
    const grouped = {}
    topics.forEach(t => { grouped[t] = [] })
    pool.forEach(q => {
      const match = topics.find(t =>
        q.topic?.toLowerCase().includes(t.toLowerCase())
      )
      if (match) grouped[match].push(q)
    })
    // Round-robin interleave
    const interleaved = []
    let added = true
    while (added) {
      added = false
      topics.forEach(t => {
        if (grouped[t].length > 0) {
          interleaved.push(grouped[t].shift())
          added = true
        }
      })
    }
    pool = interleaved
  }

  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, count)
  return { data: shuffled, error: null }
}

// ── Create CBT session ────────────────────────────────────
export async function createCBTSession(userId, config) {
  const { data, error } = await supabase
    .from('cbt_sessions')
    .insert({
      user_id:         userId,
      exam_type:       config.examType,
      topic:           config.topic      || null,
      difficulty:      config.difficulty || 'mixed',
      year:            config.year       || null,
      duration_mins:   config.duration,
      total_questions: config.count,
      status:          'ongoing',
    })
    .select()
    .single()
  return { data, error }
}

// ── Save answers and complete session ─────────────────────
export async function completeCBTSession(sessionId, answers, timeTakenSecs) {
  const correct = answers.filter(a => a.is_correct).length
  const total   = answers.length
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0

  // Save all answers
  const rows = answers.map(a => ({
    session_id:     sessionId,
    question_id:    a.question_id,
    question_text:  a.question_text,
    option_a:       a.option_a,
    option_b:       a.option_b,
    option_c:       a.option_c,
    option_d:       a.option_d,
    correct_answer: a.correct_answer,
    student_answer: a.student_answer,
    is_correct:     a.is_correct,
    time_taken_secs: a.time_taken_secs || 0,
    topic:          a.topic,
  }))

  await supabase.from('cbt_answers').insert(rows)

  // Update session
  const { data, error } = await supabase
    .from('cbt_sessions')
    .update({
      score:           correct,
      percentage:      pct,
      time_taken_secs: timeTakenSecs,
      status:          'completed',
      completed_at:    new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single()

  return { data, score: correct, percentage: pct, error }
}

// ── Get CBT history ───────────────────────────────────────
export async function getCBTHistory(userId) {
  const { data, error } = await supabase
    .from('cbt_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20)
  return { data, error }
}

// ── Get available topics from questions table ─────────────
export async function getAvailableTopics(examType) {
  let query = supabase
    .from('exam_questions')
    .select('topic')
    .not('topic', 'is', null)

  if (examType && examType !== 'Mixed') {
    query = query.eq('exam_type', examType)
  }

  const { data } = await query
  const topics = [...new Set((data || []).map(r => r.topic).filter(Boolean))].sort()
  return topics
}

// ── Get available years ───────────────────────────────────
export async function getAvailableYears(examType) {
  let query = supabase
    .from('exam_questions')
    .select('year')
    .not('year', 'is', null)

  if (examType && examType !== 'Mixed') {
    query = query.eq('exam_type', examType)
  }

  const { data } = await query
  const years = [...new Set((data || []).map(r => r.year).filter(Boolean))].sort((a, b) => b - a)
  return years
}

// ── Get question bank stats ───────────────────────────────
export async function getQuestionBankStats() {
  const { data } = await supabase
    .from('exam_questions')
    .select('exam_type, year')

  if (!data) return {}

  const stats = {}
  data.forEach(q => {
    if (!stats[q.exam_type]) stats[q.exam_type] = { total: 0, years: new Set() }
    stats[q.exam_type].total++
    if (q.year) stats[q.exam_type].years.add(q.year)
  })

  Object.keys(stats).forEach(k => {
    stats[k].years = stats[k].years.size
  })

  return stats
}