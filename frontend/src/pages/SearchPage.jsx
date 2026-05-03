import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { getRecent } from '../utils/recent'
import ProfileModal from '../components/ProfileModal'

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [recent, setRecent] = useState(getRecent)
  const [profileOpen, setProfileOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const go = (term) => {
    if (!term.trim()) return
    navigate(`/verb/${encodeURIComponent(term.trim())}`)
  }

  const handleSubmit = (e) => { e.preventDefault(); go(q) }

  // Refresh recent list when user navigates back to this page
  const refreshRecent = () => setRecent(getRecent())

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(80px + var(--safe-bot))' }} onFocus={refreshRecent}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 28, color: '#fff', letterSpacing: '-0.01em' }}>
              Verb<span style={{ color: 'var(--accent-2)' }}>o</span>
            </span>
          </div>
          <button onClick={() => setProfileOpen(true)} style={{
            background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.18)',
            color: '#fff', borderRadius: 20, padding: '6px 14px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}>
            {user?.display_name?.split(' ')[0] || '帳號'}
          </button>
        </div>
        <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 12, marginTop: 4, position: 'relative', zIndex: 1, fontFamily: 'var(--font-ui)' }}>
          輸入任意變化形，例如 <em style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'rgba(255,255,255,.75)' }}>hablo、fueron、dijiste</em>
        </p>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Search card */}
        <div className="card animate-up" style={{ padding: '16px', marginBottom: 20 }}>
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--bg-2)', borderRadius: 12, padding: '12px 14px',
              border: '1.5px solid var(--border-2)', marginBottom: 12,
            }}>
              <svg width="16" height="16" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                style={{
                  flex: 1, border: 'none', background: 'transparent', outline: 'none',
                  fontSize: 18, color: 'var(--ink)', fontFamily: 'var(--font-display)', fontStyle: 'italic',
                }}
                placeholder="buscar un verbo…"
                value={q} onChange={e => setQ(e.target.value)}
                autoComplete="off" autoCapitalize="off" spellCheck={false}
              />
              {q && (
                <button type="button" onClick={() => setQ('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, lineHeight: 1, padding: 2 }}>×</button>
              )}
            </div>
            <button type="submit" className="btn-primary">查詢</button>
          </form>
        </div>

        {/* Recent */}
        {recent.length > 0 && (
          <div className="animate-up delay-1">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, fontFamily: 'var(--font-ui)' }}>最近查詢</div>
            <div className="card" style={{ overflow: 'hidden' }}>
              {recent.map((verb, i) => (
                <button key={verb} onClick={() => go(verb)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '13px 16px', background: 'none', border: 'none',
                  borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--ink)' }}>{verb}</span>
                  <svg width="14" height="14" fill="none" stroke="var(--muted-2)" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {recent.length === 0 && (
          <div className="animate-up delay-2" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 48, color: 'var(--muted-2)', marginBottom: 12 }}>¿?</div>
            <div style={{ fontSize: 14, fontFamily: 'var(--font-ui)' }}>輸入任意西班牙文動詞變化形</div>
          </div>
        )}
      </div>

      {profileOpen && (
        <ProfileModal onClose={() => { setProfileOpen(false); setRecent(getRecent()) }} onLogout={logout} />
      )}
    </div>
  )
}
