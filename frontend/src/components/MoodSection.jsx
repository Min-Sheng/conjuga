import { useState } from 'react'

const MOOD_LABELS = {
  'indicativo': '直說式', 'subjuntivo': '虛擬式', 'imperativo': '命令式',
  'condicional': '條件式', 'infinitivo': '不定式', 'gerundio': '副動詞', 'participo': '分詞',
}

const TENSE_LABELS = {
  indicativo: { presente: '簡單現在式', 'pretérito-perfecto-compuesto': '現在完成式', 'pretérito-perfecto-simple': '簡單過去式', 'pretérito-imperfecto': '過去未完成式', 'pretérito-pluscuamperfecto': '過去完成式', futuro: '簡單未來式', 'futuro-perfecto': '未來完成式' },
  condicional: { presente: '簡單條件式', perfecto: '條件完成式' },
  subjuntivo:  { presente: '虛擬現在式', 'pretérito-imperfecto-1': '虛擬過去未完成式（-ra）', 'pretérito-imperfecto-2': '虛擬過去未完成式（-se）', 'pretérito-perfecto': '虛擬現在完成式', 'pretérito-pluscuamperfecto-1': '虛擬過去完成式（-ra）', 'pretérito-pluscuamperfecto-2': '虛擬過去完成式（-se）', futuro: '虛擬未來式', 'futuro-perfecto': '虛擬未來完成式' },
  imperativo:  { afirmativo: '肯定命令式', negativo: '否定命令式' },
  gerundio:    { gerundio: '副動詞' },
  participo:   { participo: '分詞' },
}

const PERSON_LABELS = {
  yo: 'yo', tú: 'tú', vos: 'vos', él: 'él / ella', ella: 'él / ella',
  nosotros: 'nosotros', vosotros: 'vosotros',
  ellos: 'ellos / ellas', ellas: 'ellos / ellas',
  usted: 'usted', ustedes: 'ustedes',
}

const HIDDEN_TENSES = new Set(['pretérito-anterior'])

const TENSE_ORDER = {
  indicativo:  ['presente', 'pretérito-perfecto-compuesto', 'pretérito-perfecto-simple', 'pretérito-imperfecto', 'pretérito-pluscuamperfecto', 'futuro', 'futuro-perfecto'],
  condicional: ['presente', 'perfecto'],
  subjuntivo:  ['presente', 'pretérito-imperfecto-1', 'pretérito-imperfecto-2', 'pretérito-perfecto', 'pretérito-pluscuamperfecto-1', 'pretérito-pluscuamperfecto-2', 'futuro', 'futuro-perfecto'],
  imperativo:  ['afirmativo', 'negativo'],
}

function sortTenses(mood, tenses) {
  const order = TENSE_ORDER[mood] || []
  return Object.entries(tenses)
    .filter(([t]) => !HIDDEN_TENSES.has(t))
    .sort(([a], [b]) => {
      const ia = order.indexOf(a), ib = order.indexOf(b)
      if (ia === -1 && ib === -1) return a.localeCompare(b)
      if (ia === -1) return 1; if (ib === -1) return -1
      return ia - ib
    })
}

const MOOD_ORDER = ['indicativo', 'condicional', 'subjuntivo', 'imperativo', 'infinitivo', 'gerundio', 'participo']

// Mood accent colors
const MOOD_ACCENT = {
  indicativo:  { bg: 'var(--navy)', text: '#fff', dot: '#93B4E8' },
  condicional: { bg: '#5A3A8C', text: '#fff', dot: '#C4A8E8' },
  subjuntivo:  { bg: '#1A6B4A', text: '#fff', dot: '#7DC4A8' },
  imperativo:  { bg: 'var(--accent)', text: '#fff', dot: '#FFB08A' },
  gerundio:    { bg: '#7A5A28', text: '#fff', dot: '#D4A855' },
  participo:   { bg: '#7A5A28', text: '#fff', dot: '#D4A855' },
  infinitivo:  { bg: '#4A4A4A', text: '#fff', dot: '#A8A8A8' },
}

export default function MoodSection({ mood, tenses, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const tenseList = sortTenses(mood, tenses)
  const accent = MOOD_ACCENT[mood] || MOOD_ACCENT.infinitivo

  return (
    <div style={{ marginBottom: 10, borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 16px', background: accent.bg, border: 'none', cursor: 'pointer',
      }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: accent.text, letterSpacing: '0.01em' }}>
          {MOOD_LABELS[mood] || mood}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: accent.dot, fontWeight: 600 }}>{tenseList.length} 個時態</span>
          <svg width="16" height="16" fill="none" stroke={accent.text} strokeWidth="2.5" viewBox="0 0 24 24"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s ease', opacity: 0.8 }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </button>

      {open && (
        <div style={{ background: 'var(--surface)' }}>
          {tenseList.map(([tense, persons], ti) => (
            <TenseGroup
              key={tense}
              mood={mood}
              tense={tense}
              persons={persons}
              isLast={ti === tenseList.length - 1}
              accentDot={accent.dot}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TenseGroup({ mood, tense, persons, isLast, accentDot }) {
  const [open, setOpen] = useState(false)
  const label = TENSE_LABELS[mood]?.[tense] ?? tense
  const preview = persons.slice(0, 2).map(p => p.form).join(', ')

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center',
        padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', gap: 10,
      }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', minWidth: 0, flex: '0 0 auto' }}>
          {label}
        </span>
        {!open && (
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, color: 'var(--muted)', flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {preview}…
          </span>
        )}
        <svg width="13" height="13" fill="none" stroke="var(--muted-2)" strokeWidth="2" viewBox="0 0 24 24"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s', flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div style={{ padding: '2px 16px 12px' }}>
          {persons.map((pf, i) => (
            <div key={pf.person || i} style={{
              display: 'grid', gridTemplateColumns: '100px 1fr',
              padding: '8px 0', borderBottom: '1px dotted var(--border)', alignItems: 'baseline',
            }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                {PERSON_LABELS[pf.person] || pf.person || '—'}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                {pf.form}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
