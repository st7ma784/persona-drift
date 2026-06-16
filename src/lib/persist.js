// Persists the live simulation (config + agents + timeline + world state) to
// localStorage so a page reload / navigating away and back resumes exactly
// where you left off, instead of losing the whole transcript.

const KEY = 'pdo_session_v2'

export function saveSession(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: Date.now() }))
  } catch (_) {
    // Quota exceeded or storage unavailable — fail silently, simulation still runs in-memory.
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.config) return null
    return parsed
  } catch (_) {
    return null
  }
}

export function clearSession() {
  try { localStorage.removeItem(KEY) } catch (_) {}
}
