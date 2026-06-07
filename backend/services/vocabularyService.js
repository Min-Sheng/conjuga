const { query } = require("../db/client");
const { canonicalizeSpanishWord, normalize } = require("../utils/text");
const { ensureLearner } = require("./learningService");

const FORM_KINDS = new Set(["lemma", "conjugated", "other"]);

function inferFormKind(surfaceForm, lemma, wordPart, requestedKind) {
  if (FORM_KINDS.has(requestedKind)) return requestedKind;
  if (normalize(surfaceForm) === normalize(lemma)) return "lemma";
  return ["verb", "verbo"].includes(normalize(wordPart)) ? "conjugated" : "other";
}

function toVocabularyItem(row) {
  return {
    id: row.vocabulary_id || null,
    learnerId: row.learner_id || null,
    wordId: row.word_id,
    surfaceForm: row.surface_form || row.word,
    lemma: row.lemma || row.word,
    formKind: row.form_kind || "lemma",
    mood: row.mood || null,
    tense: row.tense || null,
    person: row.person || null,
    createdAt: row.vocabulary_created_at || row.word_created_at || null,
    updatedAt: row.vocabulary_updated_at || row.word_updated_at || null,
    word: {
      id: row.word_id,
      word: row.word,
      part: row.part,
      zh: row.zh,
      en: row.en,
      ipa: row.ipa,
      level: row.level,
      tags: row.tags || [],
      acceptedAnswers: row.accepted_answers || [],
      nearAnswers: row.near_answers || [],
      source: row.source || "",
      examples: row.examples || []
    }
  };
}

const VOCABULARY_SELECT = `
  select
    lv.id as vocabulary_id,
    lv.learner_id,
    lv.word_id,
    lv.surface_form,
    lv.lemma,
    lv.form_kind,
    lv.mood,
    lv.tense,
    lv.person,
    lv.created_at as vocabulary_created_at,
    lv.updated_at as vocabulary_updated_at,
    w.word,
    w.part,
    w.zh,
    w.en,
    w.ipa,
    w.level,
    w.tags,
    w.accepted_answers,
    w.near_answers,
    w.source,
    w.created_at as word_created_at,
    w.updated_at as word_updated_at,
    coalesce(
      json_agg(json_build_object('id', e.id, 'es', e.es, 'zh', e.zh, 'en', e.en) order by e.created_at)
      filter (where e.id is not null),
      '[]'
    ) as examples
  from learner_vocabulary lv
  join words w on w.id = lv.word_id
  left join examples e on e.word_id = w.id
`;

async function saveVocabularyEntry({
  learnerId,
  word,
  wordId,
  surfaceForm,
  lemma,
  formKind,
  mood,
  tense,
  person
}) {
  if (!learnerId || (!word?.id && !wordId)) return null;

  await ensureLearner(learnerId);
  const wordRecord = word || (
    await query("select id, word, part from words where id = $1", [wordId])
  ).rows[0];
  if (!wordRecord) return null;
  const canonicalLemma = canonicalizeSpanishWord(lemma || wordRecord.word);
  const canonicalSurface = canonicalizeSpanishWord(surfaceForm || canonicalLemma);
  const resolvedKind = inferFormKind(canonicalSurface, canonicalLemma, wordRecord.part, formKind);

  const saved = await query(
    `insert into learner_vocabulary
      (learner_id, word_id, surface_form, lemma, form_kind, mood, tense, person)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (learner_id, surface_form) do update set
       word_id = excluded.word_id,
       lemma = excluded.lemma,
       form_kind = excluded.form_kind,
       mood = coalesce(excluded.mood, learner_vocabulary.mood),
       tense = coalesce(excluded.tense, learner_vocabulary.tense),
       person = coalesce(excluded.person, learner_vocabulary.person),
       updated_at = now()
     returning id`,
    [
      learnerId,
      wordRecord.id,
      canonicalSurface,
      canonicalLemma,
      resolvedKind,
      mood || null,
      tense || null,
      person || null
    ]
  );

  return getVocabularyEntry(saved.rows[0].id);
}

async function getVocabularyEntry(id) {
  const result = await query(
    `${VOCABULARY_SELECT}
     where lv.id = $1
     group by lv.id, w.id`,
    [id]
  );
  return result.rows[0] ? toVocabularyItem(result.rows[0]) : null;
}

async function listVocabulary(learnerId) {
  if (!learnerId) return [];
  const result = await query(
    `${VOCABULARY_SELECT}
     where lv.learner_id = $1
     group by lv.id, w.id
     order by lv.created_at desc`,
    [learnerId]
  );
  return result.rows.map((row) => toVocabularyItem(row));
}

async function removeVocabularyEntry(learnerId, rawSurfaceForm) {
  if (!learnerId) return { removed: false };
  const surfaceForm = canonicalizeSpanishWord(rawSurfaceForm);
  const result = await query(
    "delete from learner_vocabulary where learner_id = $1 and surface_form = $2",
    [learnerId, surfaceForm]
  );
  return { removed: result.rowCount > 0 };
}

module.exports = { inferFormKind, listVocabulary, removeVocabularyEntry, saveVocabularyEntry };
