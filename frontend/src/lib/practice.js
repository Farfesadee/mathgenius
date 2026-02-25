import { supabase } from './supabase'

export async function createSession(userId, topic, level, difficulty) {
  const { data, error } = await supabase
    .from('practice_sessions')
    .insert({ user_id: userId, topic, level, difficulty, total_questions: 5 })
    .select()
    .single()
  return { data, error }
}

export async function saveAttempt(sessionId, {
  questionText, studentAnswer, correctAnswer, isCorrect, feedback, timeTaken
}) {
  const { data, error } = await supabase
    .from('practice_attempts')
    .insert({
      session_id:      sessionId,
      question_text:   questionText,
      student_answer:  studentAnswer,
      correct_answer:  correctAnswer,
      is_correct:      isCorrect,
      feedback:        feedback,
      time_taken_secs: timeTaken,
    })
    .select()
    .single()
  return { data, error }
}

export async function completeSession(sessionId, score) {
  const { data, error } = await supabase
    .from('practice_sessions')
    .update({ score, completed_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select()
    .single()
  return { data, error }
}

export async function getSessionHistory(userId) {
  const { data, error } = await supabase
    .from('practice_sessions')
    .select('*, practice_attempts(*)')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(20)
  return { data, error }
}