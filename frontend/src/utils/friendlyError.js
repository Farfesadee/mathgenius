// User-facing error copy. Technical details (HTTP codes, "backend", stack
// traces) must never reach users — map anything like that to friendly text.

export const CONNECTION_ERROR =
  'Euler is having trouble connecting right now. Please check your internet connection and try again.'

const TECHNICAL = /HTTP \d+|Failed to fetch|NetworkError|network request|backend|Load failed|timed? ?out|AbortError|TypeError/i

export function friendlyError(err, fallback) {
  const msg = (err && err.message) || ''
  if (TECHNICAL.test(msg)) return CONNECTION_ERROR
  return msg || fallback || 'Something did not work. Please try again.'
}
