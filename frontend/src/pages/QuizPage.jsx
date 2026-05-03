import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { getTenseZh, getTenseEs, getMoodZh } from '../utils/tenseLabels'

// ─── Tense catalogue ──────────────────────────────────────────────────────────
// d = default on
const SELECTABLE_TENSES = [
  // 直說式
  { mood: 'indicativo',  tense: 'presente',                     label: '簡單現在式',              d: true  },
  { mood: 'indicativo',  tense: 'pretérito-perfecto-simple',    label: '簡單過去式',              d: true  },
  { mood: 'indicativo',  tense: 'pretérito-imperfecto',         label: '過去未完成式',            d: true  },
  { mood: 'indicativo',  tense: 'pretérito-perfecto-compuesto', label: '現在完成式',              d: true  },
  { mood: 'indicativo',  tense: 'pretérito-pluscuamperfecto',   label: '過去完成式',              d: true  },
  { mood: 'indicativo',  tense: 'futuro',                       label: '簡單未來式',              d: true  },
  { mood: 'indicativo',  tense: 'futuro-perfecto',              label: '未來完成式',              d: false },
  // 條件式
  { mood: 'condicional', tense: 'presente',                     label: '簡單條件式',              d: true  },
  { mood: 'condicional', tense: 'perfecto',                     label: '條件完成式',              d: false },
  // 虛擬式
  { mood: 'subjuntivo',  tense: 'presente',                     label: '虛擬現在式',              d: true  },
  { mood: 'subjuntivo',  tense: 'pretérito-imperfecto-1',       label: '虛擬過去未完成式（-ra）', d: true  },
  { mood: 'subjuntivo',  tense: 'pretérito-imperfecto-2',       label: '虛擬過去未完成式（-se）', d: false },
  { mood: 'subjuntivo',  tense: 'pretérito-perfecto',           label: '虛擬現在完成式',          d: false },
  { mood: 'subjuntivo',  tense: 'pretérito-pluscuamperfecto-1', label: '虛擬過去完成式（-ra）',   d: false },
  { mood: 'subjuntivo',  tense: 'pretérito-pluscuamperfecto-2', label: '虛擬過去完成式（-se）',   d: false },
  { mood: 'subjuntivo',  tense: 'futuro',                       label: '虛擬未來式',              d: false },
  { mood: 'subjuntivo',  tense: 'futuro-perfecto',              label: '虛擬未來完成式',          d: false },
  // 命令式
  { mood: 'imperativo',  tense: 'afirmativo',                   label: '肯定命令式',              d: true  },
  { mood: 'imperativo',  tense: 'negativo',                     label: '否定命令式',              d: true  },
  // 不定式
  { mood: 'infinitivo',  tense: 'infinitivo',                   label: '不定式',                  d: false },
  { mood: 'infinitivo',  tense: 'infinitivo-compuesto',         label: '完成不定式',              d: false },
  // 非人稱
  { mood: 'gerundio',    tense: 'gerundio',                     label: '副動詞',                  d: false },
  { mood: 'participo',   tense: 'participo',                    label: '分詞',                    d: false },
]

const ALL_KEYS        = SELECTABLE_TENSES.map(t => `${t.mood}:${t.tense}`)
const DEFAULT_KEYS    = SELECTABLE_TENSES.filter(t => t.d).map(t => `${t.mood}:${t.tense}`)
const STORAGE_KEY     = 'verbo_quiz_tenses_v2'
const PER_TENSE_KEY   = 'verbo_quiz_per_tense_v3'

const MOOD_GROUP_LABEL = {
  indicativo: '直說式', condicional: '條件式',
  subjuntivo: '虛擬式', imperativo: '命令式',
  infinitivo: '不定式', gerundio: '非人稱', participo: '非人稱',
}

function loadSelection() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (Array.isArray(saved) && saved.length > 0) return saved
  } catch {}
  return DEFAULT_KEYS
}

function loadPerTense() {
  const v = parseInt(localStorage.getItem(PER_TENSE_KEY) || '7', 10)
  return isNaN(v) ? 7 : Math.max(1, Math.min(20, v))
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Step 1: Tense selector ───────────────────────────────────────────────────
function TenseSelector({ onNext }) {
  const [selected, setSelected] = useState(loadSelection)
  const [perTense, setPerTense] = useState(loadPerTense)

  const toggle = (key) =>
    setSelected(prev =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter(k => k !== key) : prev
        : [...prev, key]
    )

  const selectAll = () => setSelected(ALL_KEYS)
  const resetDefault = () => setSelected(DEFAULT_KEYS)

  const handleNext = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected))
    localStorage.setItem(PER_TENSE_KEY, String(perTense))
    onNext(selected, perTense)
  }

  // Build mood groups
  const groups = []
  const seen = {}
  for (const t of SELECTABLE_TENSES) {
    const g = MOOD_GROUP_LABEL[t.mood] || t.mood
    if (!seen[g]) { seen[g] = true; groups.push({ label: g, items: [] }) }
    groups[groups.length - 1].items.push(t)
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(80px + var(--safe-bot))' }}>
      <div className="page-header">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-ui)' }}>測驗設定</div>
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, marginTop: 2, fontFamily: 'var(--font-ui)' }}>選擇要練習的時態</div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Select all / reset row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={selectAll} style={{ flex: 1, padding: '9px', background: 'var(--surface)', border: '1.5px solid var(--border-2)', borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            全選
          </button>
          <button onClick={resetDefault} style={{ flex: 1, padding: '9px', background: 'var(--surface)', border: '1.5px solid var(--border-2)', borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            重設預設
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>
            已選 {selected.length} / {SELECTABLE_TENSES.length}
          </div>
        </div>

        {groups.map(({ label, items }) => (
          <div key={label} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font-ui)' }}>
              {label}
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              {items.map((t, i) => {
                const key = `${t.mood}:${t.tense}`
                const on = selected.includes(key)
                return (
                  <button key={key} onClick={() => toggle(key)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', background: on ? 'rgba(200,72,26,.06)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.12s',
                  }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 14, color: on ? 'var(--accent)' : 'var(--ink)', fontWeight: on ? 600 : 400, fontFamily: 'var(--font-ui)' }}>
                        {t.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', fontFamily: 'var(--font-display)', marginTop: 1 }}>
                        {getTenseEs(t.mood, t.tense)}
                      </div>
                      {!t.d && <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--bg-2)', borderRadius: 4, padding: '1px 5px', fontFamily: 'var(--font-ui)' }}>少用</span>}
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: on ? 'var(--accent)' : 'var(--bg)', border: `2px solid ${on ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}>
                      {on && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* Per-tense count */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>每個時態題數</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-ui)' }}>{perTense}</span>
          </div>
          <input type="range" min="1" max="20" value={perTense} onChange={e => setPerTense(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--font-ui)' }}>
            <span>1 題</span>
            <span>預計共 <strong style={{ color: 'var(--ink)' }}>{selected.length * perTense}</strong> 題</span>
            <span>20 題</span>
          </div>
        </div>

        <button onClick={handleNext} className="btn-primary">
          下一步：選擇單字 →
        </button>
      </div>
    </div>
  )
}

// ─── Step 2: Verb selector ────────────────────────────────────────────────────
function VerbSelector({ selectedTenses, perTense, onStart, onBack }) {
  const { data: vocab, isLoading } = useQuery({ queryKey: ['vocab'], queryFn: api.getVocab })

  const [selected, setSelected] = useState(null) // null = not yet initialised

  // Default: verbs that have at least one non-mastered tense
  useEffect(() => {
    if (!vocab || selected !== null) return
    const unfamiliar = vocab
      .filter(v => {
        const m = v.tense_mastery || []
        return m.some(t => t.status !== 'mastered')
      })
      .map(v => v.verb_infinitive)
    setSelected(unfamiliar.length > 0 ? unfamiliar : vocab.map(v => v.verb_infinitive))
  }, [vocab]) // eslint-disable-line

  if (isLoading || !vocab || selected === null) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>載入中…</div>
  }

  const toggleVerb = (inf) =>
    setSelected(prev =>
      prev.includes(inf)
        ? prev.length > 1 ? prev.filter(v => v !== inf) : prev
        : [...prev, inf]
    )

  const selectAll = () => setSelected(vocab.map(v => v.verb_infinitive))
  const selectUnfamiliar = () => {
    const u = vocab.filter(v => (v.tense_mastery || []).some(t => t.status !== 'mastered')).map(v => v.verb_infinitive)
    setSelected(u.length > 0 ? u : vocab.map(v => v.verb_infinitive))
  }
  const deselectAll = () => setSelected(vocab.length > 0 ? [vocab[0].verb_infinitive] : [])

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(80px + var(--safe-bot))' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.18)', color: '#fff', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 17, lineHeight: 1 }}>‹</button>
          <div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-ui)' }}>選擇單字</div>
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, fontFamily: 'var(--font-ui)' }}>選 {selected.length} / {vocab.length} 個動詞</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Bulk action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[['全選', selectAll], ['只選不熟', selectUnfamiliar], ['全部取消', deselectAll]].map(([label, fn]) => (
            <button key={label} onClick={fn} style={{ flex: 1, padding: '9px 4px', background: 'var(--surface)', border: '1.5px solid var(--border-2)', borderRadius: 10, fontSize: 12, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
              {label}
            </button>
          ))}
        </div>

        {vocab.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>
            單字庫是空的，請先加入動詞
          </div>
        )}

        <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
          {vocab.map((item, i) => {
            const on = selected.includes(item.verb_infinitive)
            const mastery = item.tense_mastery || []
            const masteredCount = mastery.filter(t => t.status === 'mastered').length
            const hasStrugging = mastery.some(t => t.status === 'struggling')
            return (
              <button key={item.verb_infinitive} onClick={() => toggleVerb(item.verb_infinitive)} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 16px', background: on ? 'rgba(200,72,26,.06)' : 'transparent',
                border: 'none', cursor: 'pointer',
                borderBottom: i < vocab.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.12s',
              }}>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: on ? 'var(--accent)' : 'var(--ink)' }}>
                    {item.verb_infinitive}
                  </span>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--font-ui)' }}>
                    {hasStrugging && <span style={{ color: '#FF9500', marginRight: 6 }}>⚠ 需加強</span>}
                    熟悉 {masteredCount}/{mastery.length}
                    {item.due_count > 0 && <span style={{ color: 'var(--danger)', marginLeft: 6 }}>・待複習 {item.due_count}</span>}
                  </div>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: on ? 'var(--accent)' : 'var(--bg)', border: `2px solid ${on ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}>
                  {on && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => onStart(selectedTenses, perTense, selected)}
          disabled={selected.length === 0}
          className="btn-primary"
        >
          開始測驗（{selected.length} 個動詞）→
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Quiz session ─────────────────────────────────────────────────────
function QuizSession({ selectedTenses, perTense, selectedVerbs, onReset }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: cards, isLoading } = useQuery({
    queryKey: ['quiz-due', selectedTenses.join(','), perTense, selectedVerbs.join(',')],
    queryFn: () => api.getDue(selectedTenses, perTense, selectedVerbs),
    staleTime: 0,
  })

  const [index, setIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [fillAnswer, setFillAnswer] = useState('')
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [done, setDone] = useState(false)

  const mutation = useMutation({
    mutationFn: (data) => api.submitAnswer(data),
    onSuccess: (res) => { setResult(res); queryClient.invalidateQueries({ queryKey: ['quiz-stats'] }) },
  })

  // Only non-distractor cards are questions
  const questionCards = useMemo(() => (cards || []).filter(c => !c.distractor_only), [cards])
  const card = questionCards[index]
  const questionType = card ? (card.repetitions < 3 ? 'multiple_choice' : 'fill_in') : null
  const isImpersonal = card && !card.person

  // Generate choices from ALL cards (including distractor_only siblings)
  const choices = useMemo(() => {
    if (!card || questionType !== 'multiple_choice') return []
    const correct = card.correct_form
    const sameTense = (cards || [])
      .filter(c => c.id !== card.id && c.tense === card.tense && c.verb_infinitive === card.verb_infinitive)
      .map(c => c.correct_form)
      .filter((f, i, arr) => f !== correct && arr.indexOf(f) === i)
    const sameVerb = (cards || [])
      .filter(c => c.id !== card.id && c.verb_infinitive === card.verb_infinitive)
      .map(c => c.correct_form)
      .filter((f, i, arr) => f !== correct && !sameTense.includes(f) && arr.indexOf(f) === i)
    return shuffle([correct, ...[...sameTense, ...sameVerb].slice(0, 3)])
  }, [card?.id, questionType]) // eslint-disable-line

  if (isLoading) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>載入中…</div>

  if (!cards || questionCards.length === 0 || done) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: 'calc(80px + var(--safe-bot))' }}>
        <div className="page-header">
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-ui)', position: 'relative', zIndex: 1 }}>測驗</div>
        </div>
        <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{done ? '🎉' : '✅'}</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 8, fontFamily: 'var(--font-ui)' }}>
            {done ? '本輪完成！' : '所選條件今日沒有待複習的卡片'}
          </div>
          <div style={{ fontSize: 14, marginBottom: 24, fontFamily: 'var(--font-ui)' }}>
            {done ? `完成 ${questionCards.length} 張卡片` : '可以換選其他時態或去單字庫加入更多動詞'}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onReset} style={{ padding: '11px 20px', background: 'var(--surface)', color: 'var(--ink)', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
              重新設定
            </button>
            <button onClick={() => navigate('/vocab')} className="btn-primary" style={{ width: 'auto', padding: '11px 20px' }}>
              前往單字庫
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleMultipleChoice = (choice) => {
    if (result || mutation.isPending) return
    setSelectedChoice(choice)
    mutation.mutate({ card_id: card.id, question_type: 'multiple_choice', user_answer: choice })
  }
  const handleFillSubmit = (e) => {
    e.preventDefault()
    if (result || mutation.isPending || !fillAnswer.trim()) return
    mutation.mutate({ card_id: card.id, question_type: 'fill_in', user_answer: fillAnswer.trim() })
  }
  const handleNext = () => {
    if (index < questionCards.length - 1) {
      setIndex(i => i + 1); setResult(null); setFillAnswer(''); setSelectedChoice(null)
    } else {
      setDone(true)
    }
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(80px + var(--safe-bot))' }}>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <button onClick={onReset} style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.18)', color: '#fff', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
            ‹ 設定
          </button>
          <div style={{ color: 'rgba(255,255,255,.9)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)' }}>
            {index + 1} / {questionCards.length}
          </div>
        </div>
        <div style={{ marginTop: 10, height: 4, background: 'rgba(255,255,255,.25)', borderRadius: 2, position: 'relative', zIndex: 1 }}>
          <div style={{ height: '100%', background: '#fff', borderRadius: 2, width: `${(index / questionCards.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Question card */}
        <div className="card" style={{ padding: '20px', marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em', fontFamily: 'var(--font-ui)' }}>
              {getMoodZh(card.mood)} · {getTenseZh(card.mood, card.tense)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>
              {getTenseEs(card.mood, card.tense)}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 36, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>
            {card.verb_infinitive}
          </div>
          {card.en_senses?.length > 0 && (
            <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-ui)', marginBottom: 8 }}>
              {card.en_senses.slice(0, 2).join(' · ')}
            </div>
          )}
          <div style={{ fontSize: 15, color: 'var(--ink-2)', fontFamily: 'var(--font-ui)' }}>
            {isImpersonal
              ? <span>{getTenseZh(card.mood, card.tense)}形式是？</span>
              : <><span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{card.person}</span> 的變化形？</>
            }
          </div>
        </div>

        {questionType === 'multiple_choice' && !result && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {choices.map((choice) => (
              <button key={choice} onClick={() => handleMultipleChoice(choice)} disabled={mutation.isPending}
                style={{ padding: '18px 12px', border: `2px solid ${selectedChoice === choice ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12, background: selectedChoice === choice ? 'rgba(200,72,26,.08)' : 'var(--surface)', fontSize: 20, fontStyle: 'italic', fontFamily: 'var(--font-display)', color: 'var(--ink)', cursor: 'pointer', transition: 'all 0.12s' }}>
                {choice}
              </button>
            ))}
          </div>
        )}

        {questionType === 'multiple_choice' && result && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {choices.map((choice) => {
              const isCorrect = choice === result.correct_form
              const isWrong = choice === selectedChoice && !result.is_correct
              return (
                <button key={choice} disabled style={{ padding: '18px 12px', border: `2px solid ${isCorrect ? 'var(--success)' : isWrong ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 12, background: isCorrect ? 'rgba(52,199,89,.1)' : isWrong ? 'rgba(255,59,48,.08)' : 'var(--surface)', fontSize: 20, fontStyle: 'italic', fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
                  {choice}
                </button>
              )
            })}
          </div>
        )}

        {questionType === 'fill_in' && (
          <form onSubmit={handleFillSubmit}>
            <div className="card" style={{ padding: '16px' }}>
              <input style={{ width: '100%', padding: '13px 16px', fontSize: 22, fontStyle: 'italic', fontFamily: 'var(--font-display)', border: `2px solid ${result ? (result.is_correct ? 'var(--success)' : 'var(--danger)') : 'var(--border-2)'}`, borderRadius: 10, outline: 'none', color: 'var(--ink)', background: result ? (result.is_correct ? 'rgba(52,199,89,.08)' : 'rgba(255,59,48,.06)') : 'var(--surface)', textAlign: 'center', boxSizing: 'border-box' }}
                placeholder="輸入動詞變化形" value={fillAnswer} onChange={e => setFillAnswer(e.target.value)}
                disabled={!!result} autoComplete="off" autoCapitalize="off" spellCheck={false} autoFocus />
              {!result && (
                <button type="submit" disabled={mutation.isPending} className="btn-primary" style={{ marginTop: 12 }}>
                  確認
                </button>
              )}
            </div>
          </form>
        )}

        {result && (
          <div style={{ marginTop: 16, background: result.is_correct ? 'rgba(52,199,89,.08)' : 'rgba(255,59,48,.06)', border: `1.5px solid ${result.is_correct ? 'var(--success)' : 'var(--danger)'}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: result.is_correct ? 'var(--success)' : 'var(--danger)', marginBottom: 4, fontFamily: 'var(--font-ui)' }}>
              {result.is_correct ? '✓ 答對了！' : '✗ 答錯了'}
            </div>
            {!result.is_correct && (
              <div style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 4, fontFamily: 'var(--font-ui)' }}>
                正確答案：<span style={{ fontStyle: 'italic', fontFamily: 'var(--font-display)', fontSize: 20 }}>{result.correct_form}</span>
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, fontFamily: 'var(--font-ui)' }}>
              下次複習：{result.next_due}
            </div>
            <button onClick={handleNext} className="btn-primary">
              {index < questionCards.length - 1 ? '下一題 →' : '完成！'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function QuizPage() {
  const [step, setStep] = useState('tense')
  const [config, setConfig] = useState(null)

  if (step === 'tense') {
    return (
      <TenseSelector
        onNext={(tenses, perTense) => { setConfig({ tenses, perTense }); setStep('verb') }}
      />
    )
  }

  if (step === 'verb') {
    return (
      <VerbSelector
        selectedTenses={config.tenses}
        perTense={config.perTense}
        onBack={() => setStep('tense')}
        onStart={(tenses, perTense, verbs) => { setConfig({ tenses, perTense, verbs }); setStep('quiz') }}
      />
    )
  }

  return (
    <QuizSession
      selectedTenses={config.tenses}
      perTense={config.perTense}
      selectedVerbs={config.verbs}
      onReset={() => { setConfig(null); setStep('tense') }}
    />
  )
}
