import { useState } from 'react'

const MOOD_LABELS = {
  'indicativo': '直說式 Indicativo',
  'subjuntivo': '虛擬式 Subjuntivo',
  'imperativo': '命令式 Imperativo',
  'condicional': '條件式 Condicional',
  'infinitivo': '不定式 Infinitivo',
  'gerundio': '副動詞 Gerundio',
  'participo': '分詞 Participio',
}

const TENSE_LABELS = {
  'presente': '現在式',
  'pretérito-imperfecto': '未完成過去式',
  'pretérito-perfecto-simple': '簡單完成式',
  'futuro': '未來式',
  'futuro-indicativo': '未來式',
  'futuro-perfecto': '未來完成式',
  'condicional': '條件式',
  'perfecto': '完成式',
  'pretérito-perfecto': '完成式',
  'pretérito-perfecto-compuesto': '複合完成式',
  'pretérito-anterior': '先過去式',
  'pretérito-pluscuamperfecto': '過去完成式',
  'pretérito-pluscuamperfecto-1': '過去完成式 (-ra)',
  'pretérito-pluscuamperfecto-2': '過去完成式 (-se)',
  'pretérito-imperfecto-1': '虛擬未完成式 (-ra)',
  'pretérito-imperfecto-2': '虛擬未完成式 (-se)',
  'afirmativo': '肯定命令',
  'negativo': '否定命令',
  'gerundio': '副動詞',
  'infinitivo': '不定式',
  'participo': '分詞',
}

const PERSON_LABELS = {
  'yo': 'yo',
  'tú': 'tú',
  'vos': 'vos',
  'él': 'él/ella',
  'ella': 'él/ella',
  'nosotros': 'nosotros',
  'vosotros': 'vosotros',
  'ellos': 'ellos/ellas',
  'ellas': 'ellos/ellas',
  'usted': 'usted',
  'ustedes': 'ustedes',
}

export default function MoodSection({ mood, tenses, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const tenseList = Object.entries(tenses)

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Mood header */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: 'var(--accent)', color: '#fff',
          border: 'none', cursor: 'pointer', borderRadius: open ? '12px 12px 0 0' : 12,
          transition: 'border-radius 0.2s',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600 }}>
          {MOOD_LABELS[mood] || mood}
        </span>
        <svg
          width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s' }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* Tenses */}
      {open && (
        <div style={{ background: 'var(--paper)', borderRadius: '0 0 12px 12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          {tenseList.map(([tense, persons], ti) => (
            <TenseGroup
              key={tense}
              tense={tense}
              persons={persons}
              isLast={ti === tenseList.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TenseGroup({ tense, persons, isLast }) {
  const [open, setOpen] = useState(false)
  const preview = persons.slice(0, 2).map(p => p.form).join(', ')

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--bg)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', minWidth: 120, textAlign: 'left' }}>
          {TENSE_LABELS[tense] || tense}
        </span>
        {!open && (
          <span style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {preview}…
          </span>
        )}
        <svg
          width="14" height="14" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div style={{ padding: '4px 16px 12px' }}>
          {persons.map((pf) => (
            <div key={pf.person} style={{
              display: 'grid', gridTemplateColumns: '110px 1fr',
              padding: '7px 0', borderBottom: '1px dotted var(--bg)',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                {PERSON_LABELS[pf.person] || pf.person}
              </span>
              <span style={{ fontSize: 18, color: 'var(--ink)', fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
                {pf.form}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
