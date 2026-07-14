// API Response Types

export interface ApiError {
  status: number
  detail: string
  requestId?: string
  fullError?: Record<string, unknown>
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  timestamp?: string
}

// Solve Module
export interface SolveRequest {
  expression: string
  mode?: 'solve' | 'differentiate' | 'integrate'
}

export interface SolveResponse {
  success: boolean
  data: string | Record<string, unknown>
}

export interface ExplainRequest {
  expression: string
  result: string
}

export interface ExplainResponse {
  success: boolean
  explanation: string
}

// Teach Module
export interface TeachRequest {
  question: string
  topic?: string
  level?: 'primary' | 'jss' | 'sss' | 'secondary' | 'university'
  conversation_history?: Message[]
  user_id?: string
}

export interface TeachResponse {
  success: boolean
  response: string
  topic: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
}

// CBT Module
export interface GenerateMCQRequest {
  topic: string
  difficulty?: 'easy' | 'medium' | 'hard'
  level?: string
}

export interface MCQOption {
  letter: 'A' | 'B' | 'C' | 'D'
  text: string
}

export interface MCQuestion {
  id: string
  question_text: string
  options: MCQOption[]
  correct_answer: string
  topic: string
  difficulty: string
}

export interface DailyChallenge {
  questions: MCQuestion[]
  exam_type: string
  date: string
}

// Tracking Module
export interface SessionStartRequest {
  user_id: string
  exam_type: string
  topic?: string
  year?: number
  difficulty?: string
}

export interface SessionStartResponse {
  session_id: string
  user_id: string
  created_at: string
}

export interface QuestionAttemptRequest {
  user_id: string
  session_id: string
  question_id: string
  selected_answer: string
  correct_answer: string
  is_correct: boolean
  topic?: string
  time_spent_secs?: number
}

export interface UserStats {
  user_id: string
  total_attempted: number
  correct_count: number
  accuracy: number
  streak_current: number
  streak_max: number
  xp_total: number
  level: number
  last_active: string
}

export interface TopicPerformance {
  topic: string
  total_attempted: number
  correct_count: number
  avg_score: number
  mastery_level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  last_attempted: string
}

// Past Questions Module
export interface PastQuestion {
  id: string
  question_text: string
  options?: MCQOption[]
  answer_text?: string
  correct_answer: string
  exam_type: string
  year: number
  topic: string
  difficulty?: string
}

export interface PastQuestionFilter {
  exam_type?: string
  year?: number
  topic?: string
  difficulty?: string
  limit?: number
  offset?: number
}

// Study Plan Module
export interface StudyPlan {
  user_id: string
  exam_target: string
  exam_date?: string
  created_at: string
  plan_items: StudyPlanItem[]
}

export interface StudyPlanItem {
  date: string
  topic: string
  duration_mins: number
  priority: 'high' | 'medium' | 'low'
  completed: boolean
}

// Profile Module
export interface UserProfile {
  id: string
  display_name: string
  level: string
  target_exam?: string
  target_score?: number
  study_goal_mins_per_day?: number
  created_at: string
  onboarded: boolean
}

export interface ProfileUpdateRequest {
  display_name?: string
  level?: string
  target_exam?: string
  target_score?: number
  study_goal_mins_per_day?: number
}
