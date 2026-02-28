import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center
                       bg-[var(--color-paper)]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[var(--color-teal)]
                          border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-mono text-sm text-[var(--color-muted)]">
            Loading...
          </p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/" replace />
  return children
}