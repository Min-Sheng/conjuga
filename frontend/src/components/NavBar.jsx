import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const TABS = [
  { path: '/', label: '搜尋', icon: SearchIcon },
  { path: '/vocab', label: '單字庫', icon: BookIcon },
  { path: '/quiz', label: '測驗', icon: QuizIcon },
]

export default function NavBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const { data: stats } = useQuery({
    queryKey: ['quiz-stats'],
    queryFn: api.getStats,
    refetchInterval: 60_000,
  })

  const dueCount = stats?.due_today || 0

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      paddingBottom: 'var(--safe-bot)',
      zIndex: 100,
    }}>
      {TABS.map(({ path, label, icon: Icon }) => {
        const active = pathname === path || (path !== '/' && pathname.startsWith(path))
        const showBadge = path === '/quiz' && dueCount > 0
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1, padding: '10px 4px 8px', border: 'none', background: 'none',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, position: 'relative',
            }}
          >
            <div style={{ position: 'relative' }}>
              <Icon active={active} />
              {showBadge && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  background: 'var(--danger)', color: '#fff',
                  borderRadius: 10, fontSize: 10, fontWeight: 700,
                  padding: '1px 5px', lineHeight: 1.4,
                  minWidth: 16, textAlign: 'center',
                }}>
                  {dueCount > 99 ? '99+' : dueCount}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? 'var(--accent)' : 'var(--muted)' }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function SearchIcon({ active }) {
  return (
    <svg width="22" height="22" fill="none" stroke={active ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  )
}

function BookIcon({ active }) {
  return (
    <svg width="22" height="22" fill="none" stroke={active ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    </svg>
  )
}

function QuizIcon({ active }) {
  return (
    <svg width="22" height="22" fill="none" stroke={active ? 'var(--accent)' : 'var(--muted)'} strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  )
}
