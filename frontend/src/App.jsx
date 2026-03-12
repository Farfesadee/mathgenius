import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import OfflineBanner from './components/OfflineBanner'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import InstallBanner from './components/InstallBanner'
import Home from './pages/Home'
import Solve from './pages/Solve'
import Teach from './pages/Teach'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Onboarding from './pages/Onboarding'
import Bookmarks from './pages/Bookmarks'
import Practice from './pages/Practice'
import Dashboard from './pages/Dashboard'
import PastQuestions from './pages/PastQuestions'
import CBT from './pages/CBT'
import Leaderboard from './pages/Leaderboard'
import TopicMastery from './pages/TopicMastery'
import Notes from './pages/Notes'
import StudyPlanner from './pages/StudyPlanner'
import CBTHistory from './pages/CBTHistory'
import Profile from './pages/Profile'
import FormulaSheet from './pages/FormulaSheet'
import Landing from './pages/Landing'
import DailyChallenge from './pages/DailyChallenge'
import AIQuiz from './pages/AIQuiz'
import WeeklyReport from './pages/WeeklyReport'
import TopicWiki from './pages/TopicWiki'
import Certificate from './pages/Certificate'
import Review from './pages/Review'
import Challenge from './pages/Challenge'
import ShareProfile from './pages/ShareProfile'
import Groups from './pages/Groups'
import TheoryPractice from './pages/TheoryPractice'
// ── New pages ──────────────────────────────────────────────────────
import MockExam from './pages/MockExam'
import Classroom from './pages/Classroom'
import TeacherParentDashboard from './pages/TeacherParentDashboard'
import Battle from './pages/Battle'
import QuestionBank from './pages/QuestionBank'

function AppRoutes() {
  const { user } = useAuth()
  return (
    <>
      <InstallBanner />
      <Routes>
        {/* Public auth pages — no layout */}
        <Route path="/login" element={<Login defaultTab="login" />} />
        <Route path="/signup" element={<Login defaultTab="signup" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/onboarding" element={user ? <Navigate to="/dashboard" replace /> : <Onboarding />} />

        {/* Landing */}
        <Route path="/" element={<Landing />} />

        {/* Main app — with header layout */}
        <Route element={<Layout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/solve" element={<Solve />} />
          <Route path="/formulas" element={<FormulaSheet />} />
          <Route path="/teach" element={
            <ProtectedRoute><Teach /></ProtectedRoute>
          } />
          <Route path="/past-questions" element={
            <ProtectedRoute><PastQuestions /></ProtectedRoute>
          } />
          <Route path="/bookmarks" element={
            <ProtectedRoute><Bookmarks /></ProtectedRoute>
          } />
          <Route path="/practice" element={
            <ProtectedRoute><Practice /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/cbt" element={
            <ProtectedRoute><CBT /></ProtectedRoute>
          } />
          <Route path="/leaderboard" element={
            <ProtectedRoute><Leaderboard /></ProtectedRoute>
          } />
          <Route path="/mastery" element={
            <ProtectedRoute><TopicMastery /></ProtectedRoute>
          } />
          <Route path="/notes" element={
            <ProtectedRoute><Notes /></ProtectedRoute>
          } />
          <Route path="/planner" element={
            <ProtectedRoute><StudyPlanner /></ProtectedRoute>
          } />
          <Route path="/cbt-history" element={
            <ProtectedRoute><CBTHistory /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="/daily" element={
            <ProtectedRoute><DailyChallenge /></ProtectedRoute>
          } />
          <Route path="/ai-quiz" element={
            <ProtectedRoute><AIQuiz /></ProtectedRoute>
          } />
          <Route path="/weekly-report" element={
            <ProtectedRoute><WeeklyReport /></ProtectedRoute>
          } />
          <Route path="/wiki/:topic" element={
            <ProtectedRoute><TopicWiki /></ProtectedRoute>
          } />
          <Route path="/certificate" element={
            <ProtectedRoute><Certificate /></ProtectedRoute>
          } />
          <Route path="/review" element={
            <ProtectedRoute><Review /></ProtectedRoute>
          } />
          <Route path="/challenge" element={<ProtectedRoute><Challenge /></ProtectedRoute>} />
          <Route path="/challenge/:seed" element={<ProtectedRoute><Challenge /></ProtectedRoute>} />
          <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
          <Route path="/theory" element={
            <ProtectedRoute><TheoryPractice /></ProtectedRoute>
          } />

          {/* ── New routes ────────────────────────────────────────── */}
          <Route path="/mock-exam" element={
            <ProtectedRoute><MockExam /></ProtectedRoute>
          } />
          <Route path="/classroom" element={
            <ProtectedRoute><Classroom /></ProtectedRoute>
          } />
          <Route path="/monitor" element={
            <ProtectedRoute><TeacherParentDashboard /></ProtectedRoute>
          } />
          <Route path="/battle" element={
            <ProtectedRoute><Battle /></ProtectedRoute>
          } />
          <Route path="/question-bank" element={
            <ProtectedRoute><QuestionBank /></ProtectedRoute>
          } />
        </Route>

        {/* Public routes — no login needed */}
        <Route path="/share/:userId" element={<ShareProfile />} />

        {/* Catch-all — send logged-in users to dashboard, guests to landing */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <OfflineBanner />
            <AppRoutes />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
