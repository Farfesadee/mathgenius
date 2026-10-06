// UTM tracking: capture inbound utm_* params once, persist for the session,
// and re-attach them to outbound/share links so campaigns stay attributed.

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
const STORE_KEY = 'mg_utm'

export function captureUtms() {
  if (typeof window === 'undefined') return {}
  let stored = {}
  try {
    stored = JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}')
  } catch { stored = {} }
  const params = new URLSearchParams(window.location.search)
  let changed = false
  UTM_KEYS.forEach(k => {
    const v = params.get(k)
    if (v) { stored[k] = v; changed = true }
  })
  if (changed) {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(stored)) } catch { /* ignore */ }
  }
  return stored
}

export function getUtm() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}')
  } catch {
    return {}
  }
}

// Append stored UTM params to an outbound URL (skips empty / same-page anchors).
export function withUtm(url) {
  const utm = getUtm()
  const keys = Object.keys(utm)
  if (!url || keys.length === 0) return url
  try {
    const u = new URL(url, window.location.origin)
    keys.forEach(k => { if (!u.searchParams.get(k)) u.searchParams.set(k, utm[k]) })
    return u.toString()
  } catch {
    return url
  }
}
