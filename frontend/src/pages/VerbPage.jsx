import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import MoodSection from '../components/MoodSection'

const PRIORITY_MOODS = ['indicativo', 'subjuntivo', 'imperativo']

export default function VerbPage() {
  const { infinitive: rawInfinitive } = useParams()
  const infinitive = decodeURIComponent(rawInfinitive)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['verb', infinitive],
    queryFn: () => api.lookup(infinitive),
    retry: false,
  })

  const vocabQuery = useQuery({
    queryKey: ['vocab'],
    queryFn: api.getVocab,
  })

  const isInVocab = vocabQuery.data?.some(v => v.verb_infinitive === data?.infinitive)

  const addMutation = useMutation({
    mutationFn: () => api.addVocab(data.infinitive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vocab'] }),
  })

  const removeMutation = useMutation({
    mutationFn: () => api.deleteVocab(data.infinitive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vocab'] }),
  })

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(72px + var(--safe-bot))' }}>
      {/* Header */}
      <div style={{
        background: 'var(--accent)',
        padding: 'calc(var(--safe-top) + 12px) 16px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
        >
          ‹
        </button>
        <span style={{ color: '#fff', fontSize: 17, fontWeight: 600 }}>動詞查詢</span>
      </div>

      {isLoading && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>查詢中…</div>
      )}

      {error && (
        <div style={{ padding: '24px 16px' }}>
          <div style={{ background: '#FFF2F0', borderRadius: 12, padding: '16px', color: 'var(--danger)', fontSize: 14 }}>
            找不到「{infinitive}」— 請確認拼字是否正確
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Verb header card */}
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{
              background: 'var(--paper)', borderRadius: 14,
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '20px',
            }}>
              {data.input_form !== data.infinitive && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                  {data.input_form} →
                </div>
              )}
              <div style={{ fontSize: 42, fontStyle: 'italic', color: 'var(--ink)', fontFamily: 'Georgia, serif', lineHeight: 1.1 }}>
                {data.infinitive}
              </div>
              {data.en_senses?.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 14, color: 'var(--ink-2, #3A3A3C)', lineHeight: 1.6 }}>
                  {data.en_senses.slice(0, 3).join(' · ')}
                </div>
              )}

              {/* Add/remove from vocab */}
              <button
                onClick={() => isInVocab ? removeMutation.mutate() : addMutation.mutate()}
                disabled={addMutation.isPending || removeMutation.isPending}
                style={{
                  marginTop: 14, padding: '9px 18px',
                  background: isInVocab ? 'var(--bg)' : 'var(--accent)',
                  color: isInVocab ? 'var(--ink)' : '#fff',
                  border: isInVocab ? '1.5px solid var(--border)' : 'none',
                  borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {isInVocab ? '✓ 已加入單字庫' : '+ 加入單字庫'}
              </button>
            </div>
          </div>

          {/* Conjugation sections */}
          <div style={{ padding: '16px' }}>
            {/* Priority moods first, then others */}
            {[...PRIORITY_MOODS, ...Object.keys(data.conjugations).filter(m => !PRIORITY_MOODS.includes(m))]
              .filter(m => data.conjugations[m])
              .map((mood, i) => (
                <MoodSection
                  key={mood}
                  mood={mood}
                  tenses={data.conjugations[mood]}
                  defaultOpen={i === 0}
                />
              ))}
          </div>
        </>
      )}
    </div>
  )
}
