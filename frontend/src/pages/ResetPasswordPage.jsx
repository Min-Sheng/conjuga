import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api/client'

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
  label: {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)',
    marginBottom: 6, letterSpacing: '0.02em',
  },
  inputWrap: { marginBottom: 20 },
  errBox: {
    background: 'var(--danger-bg)', border: '1px solid rgba(200,48,48,.2)',
    borderRadius: 10, padding: '10px 14px', marginBottom: 14,
    fontSize: 13, color: 'var(--danger)',
  },
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const token = queryParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('無效的重設連結。')
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      return setError('兩次輸入的密碼不一致')
    }
    setLoading(true)
    try {
      await api.resetPassword({ token, new_password: password })
      setSuccess(true)
    } catch (err) {
      setError(err.message || '重設密碼失敗，連結可能已過期')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      <div style={S.hero}>
        <div style={S.heroTile} />
        <div style={S.heroAccent} />
        <div style={S.brand} className="animate-up">
          <span style={S.brandV}>Verb<span style={S.brandDot}>o</span></span>
          <span style={S.brandSub}>設定新密碼</span>
        </div>
      </div>

      <div style={S.card} className="animate-up delay-1">
        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ color: 'var(--success, #1e8e3e)', fontSize: 48, marginBottom: 16 }}>✓</div>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>密碼重設成功</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>您現在可以使用新密碼登入</p>
            <button className="btn-primary" onClick={() => navigate('/auth')}>
              前往登入
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={S.inputWrap}>
              <label style={S.label}>新密碼 <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(至少 8 個字元)</span></label>
              <input 
                className="input-field" 
                type="password" 
                placeholder="輸入新密碼" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                minLength={8} 
              />
            </div>
            <div style={S.inputWrap}>
              <label style={S.label}>確認新密碼</label>
              <input 
                className="input-field" 
                type="password" 
                placeholder="再次輸入新密碼" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                required 
                minLength={8} 
              />
            </div>
            {error && <div style={S.errBox}>{error}</div>}
            <button type="submit" disabled={loading || !token} className="btn-primary">
              {loading ? '處理中…' : '確認重設'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button type="button" onClick={() => navigate('/auth')} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer' }}>返回登入</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
