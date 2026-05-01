import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

const MOOD_LABELS = {
  'indicativo': '直說式', 'subjuntivo': '虛擬式',
  'imperativo': '命令式', 'condicional': '條件式',
}
const TENSE_LABELS = {
  'presente': '現在式', 'pretérito-imperfecto': '未完成過去式',
  'pretérito-perfecto-simple': '簡單完成式', 'futuro-indicativo': '未來式',
  'condicional': '條件式', 'afirmativo': '肯定命令', 'negativo': '否定命令',
}

export default function QuizPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: cards, isLoading, refetch } = useQuery({
    queryKey: ['quiz-due'],
    queryFn: () => api.getDue(20),
    staleTime: 0,
  })

  const [index, setIndex] = useState(0)
  const [result, setResult] = useState(null) // null | {is_correct, correct_form}
  const [fillAnswer, setFillAnswer] = useState('')
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [done, setDone] = useState(false)

  const mutation = useMutation({
    mutationFn: (data) => api.submitAnswer(data),
    onSuccess: (res) => {
      setResult(res)
      queryClient.invalidateQueries({ queryKey: ['quiz-stats'] })
    },
  })

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>載入中…</div>

  if (!cards || cards.length === 0 || done) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: 'calc(72px + var(--safe-bot))' }}>
        <div style={{ background: 'var(--accent)', padding: 'calc(var(--safe-top) + 16px) 20px 20px' }}>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>測驗</div>
        </div>
        <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
            {done ? '本輪完成！' : '今日沒有待複習的卡片'}
          </div>
          <div style={{ fontSize: 14, marginBottom: 24 }}>
            {done ? `完成 ${cards?.length || 0} 張卡片` : '去單字庫加入更多動詞吧'}
          </div>
          <button
            onClick={() => navigate('/vocab')}
            style={{ padding: '11px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            前往單字庫
          </button>
        </div>
      </div>
    )
  }

  const card = cards[index]
  // Use multiple-choice for first 3 repetitions, fill-in after
  const questionType = card.repetitions < 3 ? 'multiple_choice' : 'fill_in'

  // Generate distractors for multiple choice (use other forms from same tense data)
  const getChoices = () => {
    if (questionType !== 'multiple_choice') return []
    // Simple distractor generation on frontend: shuffle forms from same verb if available
    // This is a best-effort approach; backend has full distractor generation
    const otherForms = cards
      .filter(c => c.verb_infinitive === card.verb_infinitive && c.id !== card.id && c.tense === card.tense)
      .map(c => c.correct_form)
    const all = [card.correct_form, ...otherForms].slice(0, 4)
    if (all.length < 4) {
      // Add generic distractors
      const suffixes = ['o', 'as', 'a', 'amos', 'áis', 'an']
      const base = card.correct_form.slice(0, -2) || card.correct_form
      for (const s of suffixes) {
        const f = base + s
        if (!all.includes(f) && f !== card.correct_form) all.push(f)
        if (all.length >= 4) break
      }
    }
    return shuffle(all).slice(0, 4)
  }

  const [choices] = useState(getChoices)

  const handleMultipleChoice = (choice) => {
    if (result) return
    setSelectedChoice(choice)
    mutation.mutate({ card_id: card.id, question_type: 'multiple_choice', user_answer: choice })
  }

  const handleFillSubmit = (e) => {
    e.preventDefault()
    if (result || !fillAnswer.trim()) return
    mutation.mutate({ card_id: card.id, question_type: 'fill_in', user_answer: fillAnswer.trim() })
  }

  const handleNext = () => {
    if (index < cards.length - 1) {
      setIndex(i => i + 1)
      setResult(null)
      setFillAnswer('')
      setSelectedChoice(null)
    } else {
      setDone(true)
    }
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(72px + var(--safe-bot))' }}>
      {/* Header */}
      <div style={{ background: 'var(--accent)', padding: 'calc(var(--safe-top) + 16px) 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>測驗</div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{index + 1} / {cards.length}</div>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 10, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }}>
          <div style={{ height: '100%', background: '#fff', borderRadius: 2, width: `${((index) / cards.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Question card */}
        <div style={{ background: 'var(--paper)', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '20px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.04em', marginBottom: 8 }}>
            {card.verb_infinitive} · {MOOD_LABELS[card.mood] || card.mood} · {TENSE_LABELS[card.tense] || card.tense}
          </div>
          <div style={{ fontSize: 16, color: 'var(--ink)', fontWeight: 500 }}>
            <span style={{ fontStyle: 'italic' }}>{card.person}</span> 的變化形？
          </div>
        </div>

        {/* Multiple choice */}
        {questionType === 'multiple_choice' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {choices.map((choice) => {
              const isSelected = selectedChoice === choice
              const isCorrect = result && choice === result.correct_form
              const isWrong = result && isSelected && !result.is_correct
              return (
                <button
                  key={choice}
                  onClick={() => handleMultipleChoice(choice)}
                  style={{
                    padding: '16px 12px', border: '2px solid',
                    borderColor: isCorrect ? 'var(--success)' : isWrong ? 'var(--danger)' : isSelected ? 'var(--accent)' : 'var(--border)',
                    borderRadius: 12, background: isCorrect ? '#F0FFF4' : isWrong ? '#FFF2F0' : isSelected ? '#EBF5FF' : 'var(--paper)',
                    fontSize: 18, fontStyle: 'italic', fontFamily: 'Georgia, serif',
                    color: 'var(--ink)', cursor: result ? 'default' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {choice}
                </button>
              )
            })}
          </div>
        )}

        {/* Fill in the blank */}
        {questionType === 'fill_in' && (
          <form onSubmit={handleFillSubmit}>
            <div style={{ background: 'var(--paper)', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '16px' }}>
              <input
                style={{
                  width: '100%', padding: '13px 16px', fontSize: 20,
                  fontStyle: 'italic', fontFamily: 'Georgia, serif',
                  border: `2px solid ${result ? (result.is_correct ? 'var(--success)' : 'var(--danger)') : 'var(--border)'}`,
                  borderRadius: 10, outline: 'none', color: 'var(--ink)',
                  background: result ? (result.is_correct ? '#F0FFF4' : '#FFF2F0') : 'var(--paper)',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
                placeholder="輸入動詞變化形"
                value={fillAnswer}
                onChange={(e) => setFillAnswer(e.target.value)}
                disabled={!!result}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {!result && (
                <button type="submit" style={{
                  width: '100%', marginTop: 12, padding: '12px',
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                }}>
                  確認
                </button>
              )}
            </div>
          </form>
        )}

        {/* Result feedback */}
        {result && (
          <div style={{
            marginTop: 16, background: result.is_correct ? '#F0FFF4' : '#FFF2F0',
            border: `1.5px solid ${result.is_correct ? 'var(--success)' : 'var(--danger)'}`,
            borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: result.is_correct ? 'var(--success)' : 'var(--danger)', marginBottom: 4 }}>
              {result.is_correct ? '✓ 答對了！' : '✗ 答錯了'}
            </div>
            {!result.is_correct && (
              <div style={{ fontSize: 14, color: 'var(--ink)' }}>
                正確答案：<span style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif', fontSize: 18 }}>{result.correct_form}</span>
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              下次複習：{result.next_due}
            </div>
            <button
              onClick={handleNext}
              style={{
                marginTop: 12, width: '100%', padding: '11px',
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {index < cards.length - 1 ? '下一題 →' : '完成！'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
