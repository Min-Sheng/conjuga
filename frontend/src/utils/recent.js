export const RECENT_KEY = 'verbo_recent'
export const MAX_RECENT = 10

export function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

export function addRecent(infinitive) {
  const r = [infinitive, ...getRecent().filter(v => v !== infinitive)].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(r))
}
