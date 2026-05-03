import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'

const S = {
  page: { minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' },
  hero: {
    background: 'linear-gradient(150deg, var(--navy) 0%, #0D2448 60%, #1A3560 100%)',
    padding: 'calc(var(--safe-top) + 48px) 28px 40px',
    position: 'relative', overflow: 'hidden', flexShrink: 0,
  },
  heroTile: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,.04) 0 1px, transparent 1.5px)',
    backgroundSize: '20px 20px',
  },
  heroAccent: {
    position: 'absolute', top: '-30%', right: '-15%', width: 240, height: 240,
    borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,72,26,.40) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  brand: {
    position: 'relative', zIndex: 1, textAlign: 'center',
  },
  brandV: {
    display: 'inline-block',
    fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 400,
    fontSize: 72, lineHeight: 1, color: '#FFF',
    letterSpacing: '-0.02em',
    textShadow: '0 2px 20px rgba(200,72,26,.4)',
  },
  brandDot: { color: 'var(--accent-2)' },
  brandSub: {
    display: 'block', fontFamily: 'var(--font-ui)', fontStyle: 'normal',
    fontSize: 12, color: 'rgba(255,255,255,.5)', letterSpacing: '0.28em',
    textTransform: 'uppercase', marginTop: 8,
  },
  card: {
    margin: '-20px 16px 0', position: 'relative', zIndex: 2,
    background: 'var(--surface)',
    borderRadius: 20, padding: '24px 20px',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border)',
  },
  tabBar: {
    display: 'flex', background: 'var(--bg-2)',
    borderRadius: 10, padding: 3, marginBottom: 24,
  },
  tab: (active) => ({
    flex: 1, padding: '9px 0', border: 'none', borderRadius: 8,
    background: active ? 'var(--surface)' : 'transparent',
    color: active ? 'var(--ink)' : 'var(--muted)',
    fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
    transition: 'all 0.18s',
  }),
  label: {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)',
    marginBottom: 6, letterSpacing: '0.02em',
  },
  inputWrap: { marginBottom: 14 },
  errBox: {
    background: 'var(--danger-bg)', border: '1px solid rgba(200,48,48,.2)',
    borderRadius: 10, padding: '10px 14px', marginBottom: 14,
    fontSize: 13, color: 'var(--danger)',
  },
  divider: { display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' },
  dividerLine: { flex: 1, height: 1, background: 'var(--border-2)' },
  dividerText: { fontSize: 12, color: 'var(--muted)', fontWeight: 500 },
  goog: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', padding: '12px 16px',
    background: 'var(--surface)', color: 'var(--ink)',
    border: '1.5px solid var(--border-2)', borderRadius: 12,
    fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', transition: 'background 0.12s, border-color 0.12s',
  },
}

export default function AuthPage() {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (tab === 'login') await login(email, password)
      else await register(email, password, name || email.split('@')[0])
      navigate('/')
    } catch (err) { setError(err.message || '發生錯誤，請再試一次') }
    finally { setLoading(false) }
  }

  return (
    <div style={S.page}>
      <div style={S.hero}>
        <div style={S.heroTile} />
        <div style={S.heroAccent} />
        <div style={S.brand} className="animate-up">
          <span style={S.brandV}>Verb<span style={S.brandDot}>o</span></span>
          <span style={S.brandSub}>西班牙文動詞學習</span>
        </div>
      </div>

      <div style={S.card} className="animate-up delay-1">
        <div style={S.tabBar}>
          <button style={S.tab(tab === 'login')} onClick={() => { setTab('login'); setError('') }}>登入</button>
          <button style={S.tab(tab === 'register')} onClick={() => { setTab('register'); setError('') }}>註冊</button>
        </div>

        <form onSubmit={handleSubmit}>
          {tab === 'register' && (
            <div style={S.inputWrap}>
              <label style={S.label}>暱稱</label>
              <input className="input-field" type="text" placeholder="你的名字" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}
          <div style={S.inputWrap}>
            <label style={S.label}>電子郵件</label>
            <input className="input-field" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={S.label}>密碼{tab === 'register' && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> (至少 8 個字元)</span>}</label>
            <input className="input-field" type="password" placeholder={tab === 'register' ? '至少 8 個字元' : '密碼'} value={password} onChange={e => setPassword(e.target.value)} required minLength={tab === 'register' ? 8 : undefined} />
          </div>
          {error && <div style={S.errBox}>{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '處理中…' : tab === 'login' ? '登入' : '建立帳號'}
          </button>
        </form>

        <div style={S.divider}>
          <div style={S.dividerLine} /><span style={S.dividerText}>或</span><div style={S.dividerLine} />
        </div>

        <button style={S.goog} onClick={() => (window.location.href = '/api/auth/google')}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          使用 Google 登入
        </button>
      </div>
    </div>
  )
}
