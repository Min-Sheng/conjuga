import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

// Available tenses for selection (must match DEFAULT_TENSES in backend)
const SELECTABLE_TENSES = [
  { mood: 'indicativo',  tense: 'presente',                  label: '直說式 · 簡單現在式' },
  { mood: 'indicativo',  tense: 'pretérito-perfecto-simple',  label: '直說式 · 簡單過去式' },
  { mood: 'indicativo',  tense: 'pretérito-imperfecto',       label: '直說式 · 過去未完成式' },
  { mood: 'indicativo',  tense: 'futuro',                     label: '直說式 · 簡單未來式' },
  { mood: 'condicional', tense: 'presente',                   label: '條件式 · 簡單條件式' },
  { mood: 'subjuntivo',  tense: 'presente',                   label: '虛擬式 · 虛擬現在式' },
  { mood: 'imperativo',  tense: 'afirmativo',                 label: '命令式 · 肯定命令式' },
]

const STORAGE_KEY = 'verbo_quiz_tenses'
const PER_TENSE_KEY = 'verbo_quiz_per_tense'
const ALL_KEYS = SELECTABLE_TENSES.map(t => `${t.mood}:${t.tense}`)

function loadSelection() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (Array.isArray(saved) && saved.length > 0) return saved
  } catch {}
  return ALL_KEYS
}

function loadPerTense() {
  const v = parseInt(localStorage.getItem(PER_TENSE_KEY) || '5', 10)
  return isNaN(v) ? 5 : Math.max(1, Math.min(20, v))
}

function getMoodLabel(mood) {
  const map = { indicativo: '直說式', condicional: '條件式', subjuntivo: '虛擬式', imperativo: '命令式' }
  return map[mood] || mood
}

// ─── Tense Selection Screen ───────────────────────────────────────────────
function TenseSelector({ onStart }) {
  const [selected, setSelected] = useState(loadSelection)
  const [perTense, setPerTense] = useState(loadPerTense)

  const toggle = (key) => {
    setSelected(prev =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter(k => k !== key) : prev
        : [...prev, key]
    )
  }

  const handleStart = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected))
    localStorage.setItem(PER_TENSE_KEY, String(perTense))
    onStart(selected, perTense)
  }

  const groupedByMood = SELECTABLE_TENSES.reduce((acc, t) => {
    if (!acc[t.mood]) acc[t.mood] = []
    acc[t.mood].push(t)
    return acc
  }, {})

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(72px + var(--safe-bot))' }}>
      <div style={{ background: 'var(--accent)', padding: 'calc(var(--safe-top) + 16px) 20px 20px' }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>測驗設定</div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 }}>
          選擇要練習的時態
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {Object.entries(groupedByMood).map(([mood, tenses]) => (
          <div key={mood} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
              {getMoodLabel(mood)}
            </div>
            <div style={{ background: 'var(--paper)', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              {tenses.map((t, i) => {
                const key = `${t.mood}:${t.tense}`
                const on = selected.includes(key)
                return (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', background: on ? '#EBF5FF' : 'var(--paper)', border: 'none', cursor: 'pointer',
                      borderBottom: i < tenses.length - 1 ? '1px solid var(--bg)' : 'none',
                      transition: 'background 0.12s',
                    }}
                  >
                    <span style={{ fontSize: 15, color: on ? 'var(--accent)' : 'var(--ink)', fontWeight: on ? 600 : 400 }}>
                      {t.tense === 'presente' ? (mood === 'indicativo' ? '簡單現在式' :
                        mood === 'condicional' ? '簡單條件式' : '虛擬現在式') :
                       t.tense === 'pretérito-perfecto-simple' ? '簡單過去式' :
                       t.tense === 'pretérito-imperfecto' ? '過去未完成式' :
                       t.tense === 'futuro' ? '簡單未來式' :
                       t.tense === 'afirmativo' ? '肯定命令式' : t.tense}
                    </span>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: on ? 'var(--accent)' : 'var(--bg)',
                      border: `2px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.12s',
                    }}>
                      {on && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginBottom: 16 }}>
          已選 {selected.length} / {SELECTABLE_TENSES.length} 個時態
        </div>

        {/* Per-tense question count */}
        <div style={{ background: 'var(--paper)', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>每個時態題數</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', minWidth: 28, textAlign: 'right' }}>{perTense}</span>
          </div>
          <input
            type="range" min="1" max="20" value={perTense}
            onChange={(e) => setPerTense(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            <span>1 題</span>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>
              預計共 <strong style={{ color: 'var(--ink)' }}>{selected.length * perTense}</strong> 題
            </span>
            <span>20 題</span>
          </div>
        </div>

        <button
          onClick={handleStart}
          style={{
            width: '100%', padding: '14px',
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer',
          }}
        >
          開始測驗 →
        </button>
      </div>
    </div>
  )
}

// ─── Quiz Session ─────────────────────────────────────────────────────────
const MOOD_LABELS = {
  'indicativo': '直說式', 'subjuntivo': '虛擬式',
  'imperativo': '命令式', 'condicional': '條件式',
}
const TENSE_LABELS = {
  indicativo: { 'presente': '簡單現在式', 'pretérito-perfecto-compuesto': '現在完成式', 'pretérito-perfecto-simple': '簡單過去式', 'pretérito-imperfecto': '過去未完成式', 'pretérito-pluscuamperfecto': '過去完成式', 'futuro': '簡單未來式', 'futuro-perfecto': '未來完成式' },
  condicional: { 'presente': '簡單條件式', 'perfecto': '條件完成式' },
  subjuntivo: { 'presente': '虛擬現在式', 'pretérito-imperfecto-1': '虛擬過去未完成式（-ra）', 'pretérito-imperfecto-2': '虛擬過去未完成式（-se）', 'pretérito-perfecto': '虛擬現在完成式', 'pretérito-pluscuamperfecto-1': '虛擬過去完成式（-ra）', 'pretérito-pluscuamperfecto-2': '虛擬過去完成式（-se）', 'futuro': '虛擬未來式', 'futuro-perfecto': '虛擬未來完成式' },
  imperativo: { 'afirmativo': '肯定命令式', 'negativo': '否定命令式' },
}
function getTenseLabel(mood, tense) { return TENSE_LABELS[mood]?.[tense] ?? tense }

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
  return a
}

function QuizSession({ selectedTenses, perTense, onReset }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: cards, isLoading } = useQuery({
    queryKey: ['quiz-due', selectedTenses.join(','), perTense],
    queryFn: () => api.getDue(selectedTenses, perTense),
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

  const card = cards?.[index]
  const questionType = card ? (card.repetitions < 3 ? 'multiple_choice' : 'fill_in') : null

  const choices = useMemo(() => {
    if (!card || questionType !== 'multiple_choice') return []
    const correct = card.correct_form
    const sameTense = cards.filter(c => c.id !== card.id && c.tense === card.tense && c.verb_infinitive === card.verb_infinitive).map(c => c.correct_form).filter((f, i, arr) => f !== correct && arr.indexOf(f) === i)
    const sameVerb = cards.filter(c => c.id !== card.id && c.verb_infinitive === card.verb_infinitive).map(c => c.correct_form).filter((f, i, arr) => f !== correct && !sameTense.includes(f) && arr.indexOf(f) === i)
    return shuffle([correct, ...[...sameTense, ...sameVerb].slice(0, 3)])
  }, [card?.id, questionType]) // eslint-disable-line

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>載入中…</div>

  if (!cards || cards.length === 0 || done) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: 'calc(72px + var(--safe-bot))' }}>
        <div style={{ background: 'var(--accent)', padding: 'calc(var(--safe-top) + 16px) 20px 20px' }}>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>測驗</div>
        </div>
        <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{done ? '🎉' : '✅'}</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
            {done ? '本輪完成！' : '所選時態今日沒有待複習的卡片'}
          </div>
          <div style={{ fontSize: 14, marginBottom: 24 }}>
            {done ? `完成 ${cards?.length || 0} 張卡片` : '可以換選其他時態或去單字庫加入更多動詞'}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onReset} style={{ padding: '11px 20px', background: 'var(--paper)', color: 'var(--ink)', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              重新選擇時態
            </button>
            <button onClick={() => navigate('/vocab')} style={{ padding: '11px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
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
    if (index < cards.length - 1) { setIndex(i => i + 1); setResult(null); setFillAnswer(''); setSelectedChoice(null) }
    else setDone(true)
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(72px + var(--safe-bot))' }}>
      <div style={{ background: 'var(--accent)', padding: 'calc(var(--safe-top) + 16px) 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onReset} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 13 }}>
            ‹ 時態
          </button>
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600 }}>{index + 1} / {cards.length}</div>
        </div>
        <div style={{ marginTop: 10, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }}>
          <div style={{ height: '100%', background: '#fff', borderRadius: 2, width: `${(index / cards.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ background: 'var(--paper)', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '20px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.04em', marginBottom: 8 }}>
            {MOOD_LABELS[card.mood] || card.mood} · {getTenseLabel(card.mood, card.tense)}
          </div>
          <div style={{ fontSize: 24, fontStyle: 'italic', fontFamily: 'Georgia, serif', color: 'var(--ink)', marginBottom: 6 }}>
            {card.verb_infinitive}
          </div>
          <div style={{ fontSize: 15, color: 'var(--ink-2, #3A3A3C)' }}>
            <span style={{ fontWeight: 700 }}>{card.person}</span> 的變化形？
          </div>
        </div>

        {questionType === 'multiple_choice' && !result && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {choices.map((choice) => (
              <button key={choice} onClick={() => handleMultipleChoice(choice)} disabled={mutation.isPending} style={{ padding: '18px 12px', border: `2px solid ${selectedChoice === choice ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12, background: selectedChoice === choice ? '#EBF5FF' : 'var(--paper)', fontSize: 20, fontStyle: 'italic', fontFamily: 'Georgia, serif', color: 'var(--ink)', cursor: 'pointer', transition: 'all 0.12s' }}>
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
                <button key={choice} disabled style={{ padding: '18px 12px', border: `2px solid ${isCorrect ? 'var(--success)' : isWrong ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 12, background: isCorrect ? '#F0FFF4' : isWrong ? '#FFF2F0' : 'var(--paper)', fontSize: 20, fontStyle: 'italic', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>
                  {choice}
                </button>
              )
            })}
          </div>
        )}

        {questionType === 'fill_in' && (
          <form onSubmit={handleFillSubmit}>
            <div style={{ background: 'var(--paper)', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '16px' }}>
              <input style={{ width: '100%', padding: '13px 16px', fontSize: 22, fontStyle: 'italic', fontFamily: 'Georgia, serif', border: `2px solid ${result ? (result.is_correct ? 'var(--success)' : 'var(--danger)') : 'var(--border)'}`, borderRadius: 10, outline: 'none', color: 'var(--ink)', background: result ? (result.is_correct ? '#F0FFF4' : '#FFF2F0') : 'var(--paper)', textAlign: 'center', boxSizing: 'border-box' }}
                placeholder="輸入動詞變化形" value={fillAnswer} onChange={(e) => setFillAnswer(e.target.value)}
                disabled={!!result} autoComplete="off" autoCapitalize="off" spellCheck={false} autoFocus />
              {!result && <button type="submit" disabled={mutation.isPending} style={{ width: '100%', marginTop: 12, padding: '12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>確認</button>}
            </div>
          </form>
        )}

        {result && (
          <div style={{ marginTop: 16, background: result.is_correct ? '#F0FFF4' : '#FFF2F0', border: `1.5px solid ${result.is_correct ? 'var(--success)' : 'var(--danger)'}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: result.is_correct ? 'var(--success)' : 'var(--danger)', marginBottom: 6 }}>
              {result.is_correct ? '✓ 答對了！' : '✗ 答錯了'}
            </div>
            {!result.is_correct && <div style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>正確答案：<span style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif', fontSize: 20 }}>{result.correct_form}</span></div>}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>下次複習：{result.next_due}</div>
            <button onClick={handleNext} style={{ width: '100%', padding: '12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              {index < cards.length - 1 ? '下一題 →' : '完成！'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────
export default function QuizPage() {
  const [session, setSession] = useState(null) // { tenses, perTense }

  if (!session) {
    return <TenseSelector onStart={(tenses, perTense) => setSession({ tenses, perTense })} />
  }

  return <QuizSession selectedTenses={session.tenses} perTense={session.perTense} onReset={() => setSession(null)} />
}
