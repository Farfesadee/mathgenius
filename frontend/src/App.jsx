import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'

import Home           from './pages/Home'
import Solve          from './pages/Solve'
import Teach          from './pages/Teach'
import Login          from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword  from './pages/ResetPassword'
import Onboarding     from './pages/Onboarding'
import Bookmarks      from './pages/Bookmarks'
import Practice       from './pages/Practice'
import Dashboard      from './pages/Dashboard'
import PastQuestions  from './pages/PastQuestions'
import CBT from './pages/CBT'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth pages — no layout */}
          <Route path="/login"          element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/onboarding"      element={<Onboarding />} />

          {/* Main app — with header */}
          <Route element={<Layout />}>
            <Route path="/"      element={<Home />} />
            <Route path="/solve" element={<Solve />} />
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
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}