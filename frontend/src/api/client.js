const BASE = '/api'

function getToken() {
  return localStorage.getItem('token')
}

export function setToken(token) {
  localStorage.setItem('token', token)
}

export function clearToken() {
  localStorage.removeItem('token')
}

export function isAuthenticated() {
  return !!getToken()
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/auth'
    return
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  delete: (path) => request('DELETE', path),

  // Auth
  register: (data) => request('POST', '/auth/register', data),
  login: (data) => request('POST', '/auth/login', data),
  me: () => request('GET', '/auth/me'),

  // Verbs
  lookup: (q) => request('GET', `/verbs/lookup?q=${encodeURIComponent(q)}`),

  // Vocabulary
  getVocab: () => request('GET', '/vocab'),
  addVocab: (infinitive) => request('POST', `/vocab/${infinitive}`),
  deleteVocab: (infinitive) => request('DELETE', `/vocab/${infinitive}`),

  // Quiz
  getDue: (moodTenses = [], perTense = 5) => {
    const params = new URLSearchParams({ limit: 500, per_tense: perTense })
    if (moodTenses.length) params.set('filter', moodTenses.join(','))
    return request('GET', `/quiz/due?${params}`)
  },
  submitAnswer: (data) => request('POST', '/quiz/answer', data),
  getStats: () => request('GET', '/quiz/stats'),
}
