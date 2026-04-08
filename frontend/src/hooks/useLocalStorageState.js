import { useState, useEffect } from 'react'

export function useLocalStorageState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return typeof defaultValue === 'function' ? defaultValue() : defaultValue
    try {
      const raw = window.localStorage.getItem(key)
      return raw !== null ? JSON.parse(raw) : (typeof defaultValue === 'function' ? defaultValue() : defaultValue)
    } catch {
      return typeof defaultValue === 'function' ? defaultValue() : defaultValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore localStorage write failures
    }
  }, [key, value])

  return [value, setValue]
}
