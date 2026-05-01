import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

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
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(72px + var(--safe-bot))' }}>
      {/* Header */}
      <div style={{
        background: 'var(--accent)',
        padding: 'calc(var(--safe-top) + 16px) 20px 20px',
      }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>單字庫</div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 }}>
          已儲存 {vocab?.length || 0} 個動詞
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {isLoading && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>載入中…</div>
        )}

        {!isLoading && vocab?.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>單字庫是空的</div>
            <div style={{ fontSize: 13 }}>查詢動詞後點「加入單字庫」即可開始練習</div>
          </div>
        )}

        {vocab?.length > 0 && (
          <div style={{ background: 'var(--paper)', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            {vocab.map((item, i) => {
              const mastery = item.card_count > 0
                ? Math.round(((item.card_count - item.due_count) / item.card_count) * 100)
                : 0
              return (
                <div
                  key={item.verb_infinitive}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '13px 16px',
                    borderBottom: i < vocab.length - 1 ? '1px solid var(--bg)' : 'none',
                    gap: 12,
                  }}
                >
                  {/* Verb name */}
                  <div
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => navigate(`/verb/${encodeURIComponent(item.verb_infinitive)}`)}
                  >
                    <div style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--ink)', fontFamily: 'Georgia, serif' }}>
                      {item.verb_infinitive}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {item.due_count > 0
                        ? <span style={{ color: 'var(--danger)', fontWeight: 500 }}>待複習 {item.due_count} 張</span>
                        : <span style={{ color: 'var(--success)' }}>✓ 今日已完成</span>
                      }
                    </div>
                  </div>

                  {/* Mastery ring */}
                  <MasteryBadge mastery={mastery} />

                  {/* Remove button */}
                  <button
                    onClick={() => removeMutation.mutate(item.verb_infinitive)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--muted)',
                      fontSize: 18, cursor: 'pointer', padding: '4px', lineHeight: 1,
                    }}
                    title="移除"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function MasteryBadge({ mastery }) {
  const color = mastery >= 80 ? 'var(--success)' : mastery >= 40 ? 'var(--accent)' : 'var(--muted)'
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: `conic-gradient(${color} ${mastery * 3.6}deg, var(--bg) 0deg)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', background: 'var(--paper)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color,
      }}>
        {mastery}%
      </div>
    </div>
  )
}
