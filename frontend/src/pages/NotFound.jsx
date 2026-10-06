import { Link, useNavigate } from 'react-router-dom'
import { Compass, ArrowLeft, Home } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[var(--color-paper)] flex items-center
                    justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="card overflow-hidden">
          <div className="bg-[var(--color-ink)] px-8 py-10">
            <Compass size={56} className="text-white mx-auto mb-4" />
            <p className="font-mono text-[var(--color-gold)] text-sm mb-1">404</p>
            <h1 className="font-serif font-black text-3xl text-white leading-tight">
              Lost in the numbers?
            </h1>
            <p className="text-white/60 mt-2 text-sm">
              This page does not exist or was moved.
            </p>
          </div>
          <div className="bg-white p-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate(-1)}
              className="btn-secondary px-6 py-3 text-sm flex items-center
                         justify-center gap-1">
              <ArrowLeft size={16} /> Go Back
            </button>
            <Link to="/"
              className="btn-primary px-6 py-3 text-sm flex items-center
                         justify-center gap-1">
              <Home size={16} /> Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
