import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { MOOD_INFO, MOOD_ORDER, getTenseZh, getTenseEs } from '../utils/tenseLabels'

const STATUS_COLOR = {
  new:        'var(--muted)',
  learning:   'var(--accent)',
  mastered:   'var(--success)',
  struggling: '#FF9500',
}
const STATUS_LABEL = {
  new: '新學', learning: '練習中', mastered: '已熟悉', struggling: '需加強',
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function TenseTooltip({ t, active, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!active) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [active, onClose])

  if (!active) return null

  return (
    <div ref={ref} style={{
      position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
      marginBottom: 6, zIndex: 100,
      background: 'var(--ink)', color: '#fff',
      borderRadius: 8, padding: '7px 10px',
      whiteSpace: 'nowrap', pointerEvents: 'none',
      boxShadow: '0 4px 16px rgba(0,0,0,.25)',
      minWidth: 130,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)', lineHeight: 1.3 }}>
        {getTenseZh(t.mood, t.tense)}
      </div>
      <div style={{ fontSize: 11, fontStyle: 'italic', fontFamily: 'var(--font-display)', color: 'rgba(255,255,255,.65)', lineHeight: 1.3 }}>
        {getTenseEs(t.mood, t.tense)}
      </div>
      <div style={{
        marginTop: 4, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-ui)',
        color: STATUS_COLOR[t.status] === 'var(--muted)' ? '#aaa' : STATUS_COLOR[t.status],
      }}>
        {STATUS_LABEL[t.status] || t.status}
      </div>
    </div>
  )
}

// ── Tense dot ─────────────────────────────────────────────────────────────────
function TenseDot({ t, verbInfinitive, activeTooltip, setActiveTooltip }) {
  const key = `${verbInfinitive}:${t.mood}:${t.tense}`
  const active = activeTooltip === key

  const toggle = (e) => {
    e.stopPropagation()
    setActiveTooltip(active ? null : key)
  }

  return (
    <div
      style={{ position: 'relative', cursor: 'pointer' }}
      onMouseEnter={() => setActiveTooltip(key)}
      onMouseLeave={() => setActiveTooltip(null)}
      onClick={toggle}
    >
      <div style={{
        width: 11, height: 11, borderRadius: '50%',
        background: STATUS_COLOR[t.status] || 'var(--muted)',
        transition: 'transform 0.1s',
        transform: active ? 'scale(1.3)' : 'scale(1)',
      }} />
      <TenseTooltip t={t} active={active} onClose={() => setActiveTooltip(null)} />
    </div>
  )
}

// ── Mood dot row ──────────────────────────────────────────────────────────────
function MoodDotRow({ mastery, verbInfinitive }) {
  const [activeTooltip, setActiveTooltip] = useState(null)

  // Group tenses by mood, preserving MOOD_ORDER
  const grouped = {}
  for (const t of mastery) {
    if (!grouped[t.mood]) grouped[t.mood] = []
    grouped[t.mood].push(t)
  }

  return (
    <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: '8px 12px', alignItems: 'center' }}>
      {MOOD_ORDER.filter(m => grouped[m]).map(mood => {
        const info = MOOD_INFO[mood]
        if (!info) return null
        return (
          <div key={mood} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-ui)',
              background: info.accent.bg, color: info.accent.text,
              borderRadius: 4, padding: '2px 5px', letterSpacing: '0.03em',
            }}>
              {info.zh}
            </span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {grouped[mood].map(t => (
                <TenseDot
                  key={`${t.mood}:${t.tense}`}
                  t={t}
                  verbInfinitive={verbInfinitive}
                  activeTooltip={activeTooltip}
                  setActiveTooltip={setActiveTooltip}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VocabPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: vocab, isLoading } = useQuery({
    queryKey: ['vocab'],
    queryFn: api.getVocab,
  })

  const removeMutation = useMutation({
    mutationFn: (infinitive) => api.deleteVocab(infinitive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vocab'] }),
  })

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(80px + var(--safe-bot))' }}>
      <div className="page-header">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-ui)' }}>單字庫</div>
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, marginTop: 2, fontFamily: 'var(--font-ui)' }}>
            已儲存 {vocab?.length || 0} 個動詞
          </div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {isLoading && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>載入中…</div>}

        {!isLoading && vocab?.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--muted)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 48, color: 'var(--muted-2)', marginBottom: 12 }}>∅</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, fontFamily: 'var(--font-ui)' }}>單字庫是空的</div>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)' }}>查詢動詞後點「加入單字庫」即可開始練習</div>
          </div>
        )}

        {vocab?.map((item) => {
          const mastery = item.tense_mastery || []
          const masteredCount = mastery.filter(t => t.status === 'mastered').length
          const strugglingCount = mastery.filter(t => t.status === 'struggling').length

          return (
            <div key={item.verb_infinitive} className="card animate-up" style={{ marginBottom: 10, overflow: 'visible' }}>
              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 12 }}>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/verb/${encodeURIComponent(item.verb_infinitive)}`)}>
                  <div style={{ fontSize: 22, fontStyle: 'italic', color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                    {item.verb_infinitive}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, fontFamily: 'var(--font-ui)' }}>
                    {item.due_count > 0
                      ? <span style={{ color: 'var(--danger)', fontWeight: 500 }}>待複習 {item.due_count} 張</span>
                      : <span style={{ color: 'var(--success)' }}>✓ 今日已完成</span>
                    }
                    {strugglingCount > 0 && (
                      <span style={{ color: '#FF9500', fontWeight: 500, marginLeft: 8 }}>
                        ⚠ {strugglingCount} 個時態需加強
                      </span>
                    )}
                  </div>
                </div>

                <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>
                  {masteredCount}/{mastery.length}
                </span>

                <button onClick={() => removeMutation.mutate(item.verb_infinitive)}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', padding: '4px', lineHeight: 1 }}>
                  ×
                </button>
              </div>

              {/* Mood-grouped dot row with hover tooltip */}
              {mastery.length > 0 && (
                <MoodDotRow mastery={mastery} verbInfinitive={item.verb_infinitive} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
