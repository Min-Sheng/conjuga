import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'

export default function AuthPage() {
  const [tab, setTab] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') {
        await login(email, password)
      } else {
        await register(email, password, name || email.split('@')[0])
      }
      navigate('/')
    } catch (err) {
      setError(err.message || '發生錯誤，請再試一次')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--accent)',
        padding: 'calc(var(--safe-top) + 48px) 24px 32px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, fontStyle: 'italic', color: '#fff', fontFamily: 'Georgia, serif', marginBottom: 4 }}>
          Verbo
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.06em' }}>
          西班牙文動詞學習
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--paper)',
        margin: '0 16px',
        marginTop: -16,
        borderRadius: 16,
        padding: '24px 20px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: 24, background: 'var(--bg)', borderRadius: 8, padding: 2 }}>
          {['login', 'register'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              style={{
                flex: 1, padding: '8px 0', border: 'none', borderRadius: 6, cursor: 'pointer',
                fontSize: 14, fontWeight: 500,
                background: tab === t ? 'var(--paper)' : 'transparent',
                color: tab === t ? 'var(--ink)' : 'var(--muted)',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {t === 'login' ? '登入' : '註冊'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {tab === 'register' && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>暱稱</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="你的名字"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>電子郵件</label>
            <input
              style={inputStyle}
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>密碼{tab === 'register' && ' (至少 8 個字元)'}</label>
            <input
              style={inputStyle}
              type="password"
              placeholder={tab === 'register' ? '至少 8 個字元' : '密碼'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={tab === 'register' ? 8 : undefined}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 14, padding: '10px 12px', background: '#FFF2F0', borderRadius: 8 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={primaryBtnStyle}>
            {loading ? '處理中…' : tab === 'login' ? '登入' : '建立帳號'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: 8 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>或</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <button onClick={handleGoogleLogin} style={googleBtnStyle}>
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

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 500,
  color: 'var(--ink-2, #3A3A3C)', marginBottom: 6,
}

const inputStyle = {
  width: '100%', padding: '11px 14px', fontSize: 16,
  border: '1.5px solid var(--border)', borderRadius: 10,
  outline: 'none', background: 'var(--paper)',
  color: 'var(--ink)',
  transition: 'border-color 0.15s',
}

const primaryBtnStyle = {
  width: '100%', padding: '13px', fontSize: 15, fontWeight: 600,
  background: 'var(--accent)', color: '#fff',
  border: 'none', borderRadius: 10, cursor: 'pointer',
  transition: 'background 0.15s',
}

const googleBtnStyle = {
  width: '100%', padding: '11px', fontSize: 14, fontWeight: 500,
  background: 'var(--paper)', color: 'var(--ink)',
  border: '1.5px solid var(--border)', borderRadius: 10,
  cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', gap: 10, transition: 'background 0.15s',
}
