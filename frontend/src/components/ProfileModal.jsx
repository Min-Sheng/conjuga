import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../App'

export default function ProfileModal({ onClose, onLogout }) {
  const { user, updateProfile } = useAuth()
  const backdropRef = useRef(null)

  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [nameMsg, setNameMsg] = useState(null)
  const [nameSaving, setNameSaving] = useState(false)

  const [curPwd, setCurPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState(null)
  const [pwdSaving, setPwdSaving] = useState(false)

  // Close on backdrop click
  const handleBackdrop = (e) => { if (e.target === backdropRef.current) onClose() }

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const saveName = async () => {
    if (!displayName.trim()) return
    setNameSaving(true); setNameMsg(null)
    try {
      await updateProfile({ display_name: displayName.trim() })
      setNameMsg({ ok: true, text: '已儲存' })
    } catch (err) {
      setNameMsg({ ok: false, text: err.message || '儲存失敗' })
    } finally { setNameSaving(false) }
  }

  const savePassword = async () => {
    if (!curPwd || !newPwd) return
    setPwdSaving(true); setPwdMsg(null)
    try {
      await updateProfile({ current_password: curPwd, new_password: newPwd })
      setPwdMsg({ ok: true, text: '密碼已更新' })
      setCurPwd(''); setNewPwd('')
    } catch (err) {
      setPwdMsg({ ok: false, text: err.message || '更新失敗' })
    } finally { setPwdSaving(false) }
  }

  const isGoogleOnly = user && !user.has_password

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'var(--surface)',
        borderRadius: '20px 20px 0 0',
        padding: '24px 20px calc(24px + var(--safe-bot))',
        boxShadow: '0 -8px 40px rgba(0,0,0,.2)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Handle bar */}
        <div style={{ width: 36, height: 4, background: 'var(--border-2)', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>帳號設定</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Email (read-only) */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6, fontFamily: 'var(--font-ui)' }}>電子郵件</label>
          <div style={{ padding: '11px 14px', background: 'var(--bg-2)', borderRadius: 10, fontSize: 14, color: 'var(--muted)', fontFamily: 'var(--font-ui)', border: '1.5px solid var(--border)' }}>
            {user?.email}
          </div>
        </div>

        {/* Display name */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6, fontFamily: 'var(--font-ui)' }}>顯示名稱</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input-field"
              style={{ flex: 1 }}
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setNameMsg(null) }}
              placeholder="你的名字"
            />
            <button
              onClick={saveName}
              disabled={nameSaving || !displayName.trim()}
              style={{ padding: '11px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', opacity: (!displayName.trim() || nameSaving) ? 0.5 : 1 }}
            >
              {nameSaving ? '…' : '儲存'}
            </button>
          </div>
          {nameMsg && <div style={{ marginTop: 6, fontSize: 12, color: nameMsg.ok ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-ui)' }}>{nameMsg.text}</div>}
        </div>

        {/* Password change */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'var(--font-ui)' }}>{isGoogleOnly ? '設定登入密碼' : '修改密碼'}</div>
          {!isGoogleOnly && (
            <input
              className="input-field"
              style={{ marginBottom: 10 }}
              type="password"
              placeholder="目前密碼"
              value={curPwd}
              onChange={e => { setCurPwd(e.target.value); setPwdMsg(null) }}
            />
          )}
          <input
            className="input-field"
            style={{ marginBottom: 10 }}
            type="password"
            placeholder={isGoogleOnly ? "設定密碼（至少 8 個字元）" : "新密碼（至少 8 個字元）"}
            value={newPwd}
            onChange={e => { setNewPwd(e.target.value); setPwdMsg(null) }}
            minLength={8}
          />
          <button
            onClick={savePassword}
            disabled={pwdSaving || (!isGoogleOnly && !curPwd) || !newPwd || newPwd.length < 8}
            style={{ width: '100%', padding: '12px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)', opacity: (pwdSaving || (!isGoogleOnly && !curPwd) || !newPwd || newPwd.length < 8) ? 0.5 : 1 }}
          >
            {pwdSaving ? '更新中…' : (isGoogleOnly ? '設定密碼' : '更新密碼')}
          </button>
          {pwdMsg && <div style={{ marginTop: 6, fontSize: 12, color: pwdMsg.ok ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-ui)' }}>{pwdMsg.text}</div>}
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

        <button
          onClick={() => { onLogout(); onClose() }}
          style={{ width: '100%', padding: '13px', background: 'rgba(255,59,48,.08)', color: 'var(--danger)', border: '1.5px solid rgba(255,59,48,.2)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
        >
          登出
        </button>
      </div>
    </div>
  )
}
