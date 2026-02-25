import { Outlet } from 'react-router-dom'
import Header from './Header'
import FloatChat from '../FloatChat'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      <Header />
      <main>
        <Outlet />
      </main>
      <FloatChat />
    </div>
  )
}