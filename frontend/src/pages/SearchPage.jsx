import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'

const RECENT_KEY = 'verbo_recent'
const MAX_RECENT = 10

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
function addRecent(infinitive) {
  const recent = [infinitive, ...getRecent().filter(v => v !== infinitive)].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent))
}

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [recent, setRecent] = useState(getRecent)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (!q.trim()) return
    const term = q.trim()
    addRecent(term)
    setRecent(getRecent())
    navigate(`/verb/${encodeURIComponent(term)}`)
  }

  const handleRecent = (verb) => {
    navigate(`/verb/${encodeURIComponent(verb)}`)
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(72px + var(--safe-bot))' }}>
      {/* Header */}
      <div style={{
        background: 'var(--accent)',
        padding: 'calc(var(--safe-top) + 16px) 20px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 22, fontStyle: 'italic', color: '#fff', fontFamily: 'Georgia, serif' }}>
          Verbo
        </div>
        <button
          onClick={logout}
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
            borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {user?.display_name?.charAt(0).toUpperCase() || '我'}
        </button>
      </div>

      {/* Search card */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          background: 'var(--paper)', borderRadius: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
          padding: '16px',
        }}>
          <form onSubmit={handleSearch}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--bg)', borderRadius: 10, padding: '10px 14px',
              border: '1.5px solid var(--border)',
            }}>
              <svg width="16" height="16" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                style={{
                  flex: 1, border: 'none', background: 'transparent', outline: 'none',
                  fontSize: 16, color: 'var(--ink)',
                }}
                placeholder="輸入西班牙文動詞（任何變化形）"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {q && (
                <button type="button" onClick={() => setQ('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, lineHeight: 1 }}>×</button>
              )}
            </div>
            <button type="submit" style={{
              width: '100%', marginTop: 10, padding: '11px',
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>
              查詢
            </button>
          </form>
        </div>
      </div>

      {/* Recent lookups */}
      {recent.length > 0 && (
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            最近查詢
          </div>
          <div style={{ background: 'var(--paper)', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            {recent.map((verb, i) => (
              <button
                key={verb}
                onClick={() => handleRecent(verb)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '13px 16px', background: 'none', border: 'none',
                  borderBottom: i < recent.length - 1 ? '1px solid var(--bg)' : 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 15, color: 'var(--ink)', fontStyle: 'italic' }}>{verb}</span>
                <svg width="14" height="14" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {recent.length === 0 && (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div>輸入任意動詞變化形，例如 <em>hablo</em>、<em>fueron</em>、<em>dijiste</em></div>
        </div>
      )}
    </div>
  )
}
