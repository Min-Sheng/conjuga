import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export default function NavBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const { data: stats } = useQuery({
    queryKey: ['quiz-stats'],
    queryFn: api.getStats,
    refetchInterval: 60_000,
  })
  const due = stats?.due_today || 0

  const tabs = [
    { path: '/',      label: '搜尋',  icon: <SearchIco /> },
    { path: '/vocab', label: '單字庫', icon: <BookIco /> },
    { path: '/quiz',  label: '測驗',  icon: <QuizIco />, badge: due },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480,
      background: 'rgba(250,245,236,.88)',
      backdropFilter: 'blur(16px) saturate(1.4)',
      borderTop: '1px solid var(--border-2)',
      display: 'flex',
      paddingBottom: 'var(--safe-bot)',
      zIndex: 100,
    }}>
      {tabs.map(({ path, label, icon, badge }) => {
        const active = path === '/' ? pathname === '/' : pathname.startsWith(path)
        return (
          <button key={path} onClick={() => navigate(path)} style={{
            flex: 1, padding: '10px 4px 8px', border: 'none', background: 'none',
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3, position: 'relative',
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{ color: active ? 'var(--accent)' : 'var(--muted-2)', transition: 'color 0.15s' }}>
                {icon}
              </div>
              {badge > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -8,
                  background: 'var(--accent)', color: '#fff',
                  borderRadius: 10, fontSize: 10, fontWeight: 700,
                  padding: '1px 5px', lineHeight: 1.4, minWidth: 16, textAlign: 'center',
                }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span style={{
              fontSize: 10, fontWeight: active ? 700 : 500,
              color: active ? 'var(--accent)' : 'var(--muted)',
              transition: 'color 0.15s',
              fontFamily: 'var(--font-ui)',
            }}>
              {label}
            </span>
            {active && (
              <span style={{
                position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                width: 20, height: 2, background: 'var(--accent)', borderRadius: 2,
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}

function SearchIco() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
}
function BookIco() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
}
function QuizIco() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
}
