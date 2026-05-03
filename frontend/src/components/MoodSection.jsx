import { useState } from 'react'
import { MOOD_INFO, getTenseZh, getTenseEs } from '../utils/tenseLabels'

// Tense display order per mood
const TENSE_ORDER = {
  indicativo:  ['presente', 'pretérito-perfecto-compuesto', 'pretérito-perfecto-simple', 'pretérito-imperfecto', 'pretérito-pluscuamperfecto', 'futuro', 'futuro-perfecto'],
  condicional: ['presente', 'perfecto'],
  subjuntivo:  ['presente', 'pretérito-imperfecto-1', 'pretérito-imperfecto-2', 'pretérito-perfecto', 'pretérito-pluscuamperfecto-1', 'pretérito-pluscuamperfecto-2', 'futuro', 'futuro-perfecto'],
  imperativo:  ['afirmativo', 'negativo'],
}

const HIDDEN_TENSES = new Set(['pretérito-anterior'])

// Person merge groups — persons sharing the same form are collapsed to one row
const MERGE_GROUPS = [
  ['yo'],
  ['tú', 'vos'],
  ['él', 'ella', 'usted'],
  ['nosotros', 'nosotras'],
  ['vosotros', 'vosotras'],
  ['ellos', 'ellas', 'ustedes'],
]

function buildPersonRows(persons) {
  const formMap = {}
  for (const pf of persons) {
    if (pf.person) formMap[pf.person] = pf.form
  }

  const processed = new Set()
  const rows = []

  for (const group of MERGE_GROUPS) {
    const present = group.filter(k => k in formMap)
    if (present.length === 0) continue
    present.forEach(k => processed.add(k))

    // Bucket by form value
    const byForm = {}
    for (const k of present) {
      const f = formMap[k]
      if (!byForm[f]) byForm[f] = []
      byForm[f].push(k)
    }
    // Emit one row per distinct form, preserving group order
    const emitted = new Set()
    for (const k of present) {
      const f = formMap[k]
      if (emitted.has(f)) continue
      emitted.add(f)
      rows.push({ label: byForm[f].join(' / '), form: f })
    }
  }

  // Catch-all for persons not in any group (e.g. impersonal gerundio)
  for (const pf of persons) {
    if (!pf.person || !processed.has(pf.person)) {
      rows.push({ label: pf.person || '—', form: pf.form })
    }
  }

  return rows
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

export default function MoodSection({ mood, tenses, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const tenseList = sortTenses(mood, tenses)
  const info = MOOD_INFO[mood] || MOOD_INFO.infinitivo
  const accent = info.accent

  return (
    <div style={{ marginBottom: 10, borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 16px', background: accent.bg, border: 'none', cursor: 'pointer',
      }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, color: accent.text, letterSpacing: '0.01em' }}>
          {info.zh}
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
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TenseGroup({ mood, tense, persons, isLast }) {
  const [open, setOpen] = useState(false)
  const zh = getTenseZh(mood, tense)
  const es = getTenseEs(mood, tense)
  const rows = buildPersonRows(persons)
  const preview = rows.slice(0, 2).map(r => r.form).join(', ')

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center',
        padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', gap: 10,
      }}>
        {/* Tense label: Chinese + Spanish stacked */}
        <div style={{ flex: '0 0 auto', textAlign: 'left', minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', lineHeight: 1.3 }}>
            {zh}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 11, color: 'var(--muted)', lineHeight: 1.3 }}>
            {es}
          </div>
        </div>
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
          {rows.map((row, i) => (
            <div key={row.label} style={{
              display: 'grid', gridTemplateColumns: '130px 1fr',
              padding: '8px 0', borderBottom: i < rows.length - 1 ? '1px dotted var(--border)' : 'none',
              alignItems: 'baseline',
            }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                {row.label}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                {row.form}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
