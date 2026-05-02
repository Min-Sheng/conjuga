import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

const STATUS_COLOR = {
  new:       'var(--muted)',
  learning:  'var(--accent)',
  mastered:  'var(--success)',
  struggling:'#FF9500',
}
const STATUS_LABEL = {
  new: '未練習', learning: '練習中', mastered: '已熟悉', struggling: '需加強',
}

// Short labels for the 7 DEFAULT_TENSES (same order as backend)
const TENSE_SHORT = [
  '現在', '過去', '未完', '未來', '條件', '虛擬', '命令'
]

export default function VocabPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(null) // verb_infinitive of expanded item

  const { data: vocab, isLoading } = useQuery({
    queryKey: ['vocab'],
    queryFn: api.getVocab,
  })

  const removeMutation = useMutation({
    mutationFn: (infinitive) => api.deleteVocab(infinitive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vocab'] }),
  })

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(72px + var(--safe-bot))' }}>
      <div style={{ background: 'var(--accent)', padding: 'calc(var(--safe-top) + 16px) 20px 20px' }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>單字庫</div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 }}>
          已儲存 {vocab?.length || 0} 個動詞
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {isLoading && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>載入中…</div>}

        {!isLoading && vocab?.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>單字庫是空的</div>
            <div style={{ fontSize: 13 }}>查詢動詞後點「加入單字庫」即可開始練習</div>
          </div>
        )}

        {vocab?.map((item, i) => {
          const isExpanded = expanded === item.verb_infinitive
          const mastery = item.tense_mastery || []
          const masteredCount = mastery.filter(t => t.status === 'mastered').length
          const strugglingCount = mastery.filter(t => t.status === 'struggling').length

          return (
            <div key={item.verb_infinitive} style={{ background: 'var(--paper)', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 10, overflow: 'hidden' }}>
              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 12 }}>
                {/* Verb name + summary */}
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/verb/${encodeURIComponent(item.verb_infinitive)}`)}>
                  <div style={{ fontSize: 17, fontStyle: 'italic', color: 'var(--ink)', fontFamily: 'Georgia, serif' }}>
                    {item.verb_infinitive}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
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

                {/* Expand toggle */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : item.verb_infinitive)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: 'var(--muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <span style={{ fontSize: 11 }}>{masteredCount}/{mastery.length}</span>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>

                {/* Remove */}
                <button onClick={() => removeMutation.mutate(item.verb_infinitive)}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer', padding: '4px', lineHeight: 1 }}>
                  ×
                </button>
              </div>

              {/* Tense dots (always visible) */}
              {mastery.length > 0 && (
                <div style={{ padding: '0 16px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {mastery.map((t, idx) => (
                    <div key={`${t.mood}:${t.tense}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[t.status] || 'var(--muted)' }} />
                      <span style={{ fontSize: 9, color: 'var(--muted)' }}>{TENSE_SHORT[idx] || t.tense}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Expanded detail */}
              {isExpanded && mastery.length > 0 && (
                <div style={{ borderTop: '1px solid var(--bg)', padding: '12px 16px' }}>
                  {mastery.map((t) => (
                    <div key={`${t.mood}:${t.tense}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px dotted var(--bg)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[t.status], flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: 'var(--ink)' }}>
                          {t.tense === 'presente' ? (t.mood === 'indicativo' ? '簡單現在式' : t.mood === 'condicional' ? '簡單條件式' : '虛擬現在式') :
                           t.tense === 'pretérito-perfecto-simple' ? '簡單過去式' :
                           t.tense === 'pretérito-imperfecto' ? '過去未完成式' :
                           t.tense === 'futuro' ? '簡單未來式' :
                           t.tense === 'afirmativo' ? '肯定命令式' : t.tense}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {t.repetitions > 0 ? `EF ${t.ease_factor}` : ''}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLOR[t.status] }}>
                          {STATUS_LABEL[t.status]}
                        </span>
                        {t.due > 0 && (
                          <span style={{ fontSize: 11, background: '#FFF0F0', color: 'var(--danger)', borderRadius: 6, padding: '1px 6px' }}>
                            {t.due} 待複習
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
