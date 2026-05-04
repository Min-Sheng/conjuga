import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import MoodSection from '../components/MoodSection'
import { addRecent, removeRecent } from '../utils/recent'
import { getTenseZh, getMoodZh } from '../utils/tenseLabels'

const MOOD_ORDER = ['indicativo', 'condicional', 'subjuntivo', 'imperativo', 'infinitivo', 'gerundio', 'participo']

function buildFormIndex(conjugations) {
  const index = {}
  for (const [mood, tenses] of Object.entries(conjugations)) {
    for (const [tense, persons] of Object.entries(tenses)) {
      for (const { person, form } of persons) {
        const key = form.toLowerCase()
        if (!index[key]) index[key] = []
        index[key].push({ mood, tense, person })
      }
    }
  }
  return index
}

function AnnotatedExample({ text, formIndex }) {
  const [activeToken, setActiveToken] = useState(null)

  const tokens = text.match(/[\wáéíóúüñÁÉÍÓÚÜÑ¿¡]+|[^[\wáéíóúüñÁÉÍÓÚÜÑ¿¡]+/g) || []

  return (
    <>
      {tokens.map((token, i) => {
        const clean = token.replace(/^[¿¡«"']+|[.,:;!?»"']+$/g, '').toLowerCase()
        const matches = formIndex[clean]

        if (matches?.length > 0) {
          return (
            <span key={i} style={{ position: 'relative', display: 'inline' }} onMouseEnter={() => setActiveToken(i)} onMouseLeave={() => setActiveToken(null)}>
              <span style={{ color: 'var(--accent)', textDecoration: 'underline', textDecorationStyle: 'dotted', cursor: 'default', fontStyle: 'italic', fontFamily: 'var(--font-display)', fontSize: 16 }}>
                {token}
              </span>
              {activeToken === i && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--ink)', color: '#fff', borderRadius: 8, padding: '6px 10px', fontSize: 12, whiteSpace: 'nowrap', zIndex: 100, pointerEvents: 'none', fontFamily: 'var(--font-ui)', fontStyle: 'normal', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                  {matches.map((m, mi) => (
                    <div key={mi}>{getMoodZh(m.mood)} · {getTenseZh(m.mood, m.tense)}{m.person ? ` · ${m.person}` : ''}</div>
                  ))}
                </div>
              )}
            </span>
          )
        }
        return <span key={i} style={{ fontStyle: 'italic', fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)' }}>{token}</span>
      })}
    </>
  )
}

export default function VerbPage() {
  const { infinitive: raw } = useParams()
  const infinitive = decodeURIComponent(raw)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['verb', infinitive],
    queryFn: () => api.lookup(infinitive),
    retry: false,
  })

  // Add to recent only on success; remove on failure (cleans up stale entries too)
  useEffect(() => { if (data?.infinitive) addRecent(data.infinitive) }, [data?.infinitive])
  useEffect(() => { if (error) removeRecent(infinitive) }, [error]) // eslint-disable-line

  const vocabQ = useQuery({ queryKey: ['vocab'], queryFn: api.getVocab })
  const inVocab = vocabQ.data?.some(v => v.verb_infinitive === data?.infinitive)

  const addMut = useMutation({
    mutationFn: () => api.addVocab(data.infinitive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vocab'] }),
  })
  const delMut = useMutation({
    mutationFn: () => api.deleteVocab(data.infinitive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vocab'] }),
  })

  const formIndex = useMemo(() => data ? buildFormIndex(data.conjugations) : {}, [data])

  return (
    <div className="page-root" style={{ paddingBottom: 'var(--nav-clearance)' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
          <button onClick={() => navigate(-1)} style={{
            background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.18)',
            color: '#fff', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 17, lineHeight: 1,
          }}>‹</button>
          <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, fontFamily: 'var(--font-ui)' }}>動詞查詢</span>
        </div>
      </div>

      {isLoading && <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>查詢中…</div>}

      {error && (
        <div style={{ padding: '16px' }}>
          <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(200,48,48,.2)', borderRadius: 14, padding: '16px 18px', color: 'var(--danger)', fontSize: 14 }}>
            找不到「{infinitive}」— 請確認拼字
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Verb header */}
          <div style={{ padding: '16px 16px 0' }}>
            <div className="card animate-up" style={{ padding: '20px 22px 18px' }}>
              {data.input_form !== data.infinitive && (
                <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em', marginBottom: 6, fontFamily: 'var(--font-ui)' }}>
                  <em style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{data.input_form}</em> →
                </div>
              )}
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 52, lineHeight: 1, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 10 }}>
                {data.infinitive}
              </div>
              {data.en_senses?.length > 0 && (
                <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, fontFamily: 'var(--font-ui)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  {data.en_senses.slice(0, 3).join(' · ')}
                </div>
              )}
              <button
                onClick={() => inVocab ? delMut.mutate() : addMut.mutate()}
                disabled={addMut.isPending || delMut.isPending}
                style={{
                  marginTop: 14, padding: '9px 18px',
                  background: inVocab ? 'var(--success-bg)' : 'var(--accent)',
                  color: inVocab ? 'var(--success)' : '#fff',
                  border: inVocab ? '1.5px solid rgba(46,125,90,.25)' : 'none',
                  borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', transition: 'all 0.15s',
                  boxShadow: inVocab ? 'none' : '0 2px 8px rgba(200,72,26,.25)',
                }}
              >
                {inVocab ? '✓ 已加入單字庫' : '＋ 加入單字庫'}
              </button>
            </div>
          </div>

          {/* Example sentences */}
          {data.examples?.length > 0 && (
            <div style={{ padding: '0 16px 4px' }}>
              <div className="card animate-up" style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'var(--font-ui)' }}>
                  例句
                </div>
                {data.examples.map((ex, i) => (
                  <div key={i} style={{ marginBottom: i < data.examples.length - 1 ? 14 : 0 }}>
                    <div style={{ fontSize: 16, color: 'var(--ink)', marginBottom: 3 }}>
                      <AnnotatedExample text={ex.text} formIndex={formIndex} />
                    </div>
                    {ex.english && (
                      <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>
                        {ex.english}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conjugations */}
          <div style={{ padding: '12px 16px' }}>
            {[...MOOD_ORDER, ...Object.keys(data.conjugations).filter(m => !MOOD_ORDER.includes(m))]
              .filter(m => data.conjugations[m])
              .map((mood, i) => (
                <MoodSection key={mood} mood={mood} tenses={data.conjugations[mood]} defaultOpen={i === 0} />
              ))}
          </div>
        </>
      )}
    </div>
  )
}
