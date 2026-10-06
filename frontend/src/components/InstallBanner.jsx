import { useState } from 'react'
import { usePWA } from '../hooks/usePWA'
import { Wifi, Smartphone, X } from 'lucide-react'

export default function InstallBanner() {
  const { installPrompt, isInstalled, install, isOnline } = usePWA()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('mg_install_dismissed') === '1'
  )

  const handleDismiss = () => {
    localStorage.setItem('mg_install_dismissed', '1')
    setDismissed(true)
  }

  return (
    <>
      {/* Offline bar */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500
                        text-white text-center text-xs font-mono py-2 px-4">
          <Wifi size={14} className="inline mr-1" /> You're offline, some features may be unavailable
        </div>
      )}

      {/* Install prompt */}
      {installPrompt && !isInstalled && !dismissed && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4
                        sm:w-80 z-50 bg-[var(--color-ink)] text-white
                        rounded-2xl shadow-2xl p-4 border-2
                        border-[var(--color-gold)]">
          <div className="flex items-start gap-3">
            <Smartphone size={24} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-serif font-bold text-sm">
                Install MathGenius
              </p>
              <p className="text-white/70 text-xs mt-0.5">
                Add to your home screen for the full app experience, works offline too!
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={install}
                  className="bg-[var(--color-gold)] text-[var(--color-ink)]
                             font-bold text-xs px-4 py-2 rounded-xl
                             hover:opacity-90 transition-opacity"
                >
                  Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-white/50 hover:text-white text-xs
                             px-3 py-2 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button onClick={handleDismiss}
              className="text-white/40 hover:text-white shrink-0
                         transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}