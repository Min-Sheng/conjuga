export const TENSE_INFO = {
  indicativo: {
    presente:                      { zh: '簡單現在式',          es: 'Presente' },
    'pretérito-perfecto-simple':   { zh: '簡單過去式',          es: 'Pretérito indefinido' },
    'pretérito-imperfecto':        { zh: '過去未完成式',         es: 'Pretérito imperfecto' },
    'pretérito-perfecto-compuesto':{ zh: '現在完成式',          es: 'Pretérito perfecto compuesto' },
    'pretérito-pluscuamperfecto':  { zh: '過去完成式',          es: 'Pretérito pluscuamperfecto' },
    futuro:                        { zh: '簡單未來式',          es: 'Futuro simple' },
    'futuro-perfecto':             { zh: '未來完成式',          es: 'Futuro compuesto' },
  },
  condicional: {
    presente: { zh: '簡單條件式', es: 'Condicional simple' },
    perfecto:  { zh: '條件完成式', es: 'Condicional compuesto' },
  },
  subjuntivo: {
    presente:                       { zh: '虛擬現在式',              es: 'Presente de subjuntivo' },
    'pretérito-imperfecto-1':       { zh: '虛擬過去未完成式（-ra）',  es: 'Imperfecto de subjuntivo (-ra)' },
    'pretérito-imperfecto-2':       { zh: '虛擬過去未完成式（-se）',  es: 'Imperfecto de subjuntivo (-se)' },
    'pretérito-perfecto':           { zh: '虛擬現在完成式',           es: 'Perfecto de subjuntivo' },
    'pretérito-pluscuamperfecto-1': { zh: '虛擬過去完成式（-ra）',    es: 'Pluscuamperfecto de subjuntivo (-ra)' },
    'pretérito-pluscuamperfecto-2': { zh: '虛擬過去完成式（-se）',    es: 'Pluscuamperfecto de subjuntivo (-se)' },
    futuro:                         { zh: '虛擬未來式',              es: 'Futuro de subjuntivo' },
    'futuro-perfecto':              { zh: '虛擬未來完成式',           es: 'Futuro perfecto de subjuntivo' },
  },
  imperativo: {
    afirmativo: { zh: '肯定命令式', es: 'Imperativo afirmativo' },
    negativo:   { zh: '否定命令式', es: 'Imperativo negativo' },
  },
  infinitivo: {
    infinitivo:             { zh: '不定式',    es: 'Infinitivo' },
    'infinitivo-compuesto': { zh: '完成不定式', es: 'Infinitivo compuesto' },
  },
  gerundio:  { gerundio: { zh: '副動詞', es: 'Gerundio' } },
  participo: { participo: { zh: '分詞',   es: 'Participio' } },
}

export const MOOD_INFO = {
  indicativo:  { zh: '直說式', accent: { bg: 'var(--navy)',   text: '#fff', dot: '#93B4E8' } },
  condicional: { zh: '條件式', accent: { bg: '#5A3A8C',       text: '#fff', dot: '#C4A8E8' } },
  subjuntivo:  { zh: '虛擬式', accent: { bg: '#1A6B4A',       text: '#fff', dot: '#7DC4A8' } },
  imperativo:  { zh: '命令式', accent: { bg: 'var(--accent)', text: '#fff', dot: '#FFB08A' } },
  infinitivo:  { zh: '不定式', accent: { bg: '#4A4A4A',       text: '#fff', dot: '#A8A8A8' } },
  gerundio:    { zh: '副動詞', accent: { bg: '#7A5A28',       text: '#fff', dot: '#D4A855' } },
  participo:   { zh: '分詞',   accent: { bg: '#7A5A28',       text: '#fff', dot: '#D4A855' } },
}

export const MOOD_ORDER = ['indicativo', 'condicional', 'subjuntivo', 'imperativo', 'infinitivo', 'gerundio', 'participo']

export function getTenseZh(mood, tense) {
  return TENSE_INFO[mood]?.[tense]?.zh ?? tense
}

export function getTenseEs(mood, tense) {
  return TENSE_INFO[mood]?.[tense]?.es ?? tense
}

export function getMoodZh(mood) {
  return MOOD_INFO[mood]?.zh ?? mood
}
