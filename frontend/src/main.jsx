import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    const DEV_SW_UNREGISTERED = 'mathgenius-dev-sw-unregistered'
    if (!sessionStorage.getItem(DEV_SW_UNREGISTERED)) {
      navigator.serviceWorker.getRegistrations()
        .then(async (registrations) => {
          if (!registrations.length) return
          await Promise.all(registrations.map(reg => reg.unregister()))
          sessionStorage.setItem(DEV_SW_UNREGISTERED, '1')
          window.location.reload()
        })
        .catch((error) => {
          console.error('Failed to unregister service workers in dev:', error)
        })
    }
  }

  if (import.meta.env.PROD) {
    let refreshing = false

    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })
      } catch (error) {
        console.error('Service worker registration failed:', error)
      }
    })

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)