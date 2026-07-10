const { query, withTransaction } = require("../db/client");
const { EXAMPLES_JSON_AGG, SENSES_JSON } = require("../db/sqlFragments");
const { canonicalizeSpanishWord, normalize, uniqueNormalized } = require("../utils/text");

function toApiWord(row, examples = []) {
  return {
    id: row.id,
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
    senses: row.senses || [],
    examples
  };
}

async function loadWordBank() {
  const result = await query(
    `select
      w.*,
      ${SENSES_JSON} as senses,
      ${EXAMPLES_JSON_AGG} as examples
     from words w
     left join examples e on e.word_id = w.id
     group by w.id
     order by w.word`
  );
  return result.rows.map((row) => toApiWord(row, row.examples));
}

async function findWord(rawWord) {
  const canonicalWord = canonicalizeSpanishWord(rawWord);
  const result = await query(
    `select
      w.*,
      ${SENSES_JSON} as senses,
      ${EXAMPLES_JSON_AGG} as examples
     from words w
     left join examples e on e.word_id = w.id
     where lower(w.word) = lower($1)
     group by w.id
     limit 1`,
    [canonicalWord]
  );
  if (result.rows[0]) return toApiWord(result.rows[0], result.rows[0].examples);

  const normalizedTarget = normalize(rawWord);
  if (!normalizedTarget) return null;

  const words = await loadWordBank();
  return words.find((word) => {
    const aliases = [word.word, ...(word.acceptedAnswers || []), ...(word.nearAnswers || [])];
    return aliases.some((alias) => normalize(alias) === normalizedTarget);
  }) || null;
}

async function saveWord(item, source = "generated") {
  const canonicalWord = canonicalizeSpanishWord(item.word);
  const acceptedAnswers = uniqueNormalized([
    canonicalWord,
    item.word,
    ...(item.acceptedAnswers || [])
  ]);
  const wordResult = await query(
    `insert into words (word, part, zh, en, ipa, level, tags, accepted_answers, near_answers, source)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     on conflict (word) do update set
       part = excluded.part,
       zh = excluded.zh,
       en = excluded.en,
       ipa = excluded.ipa,
       level = excluded.level,
       tags = excluded.tags,
       accepted_answers = excluded.accepted_answers,
       near_answers = excluded.near_answers,
       updated_at = now()
     returning *`,
    [
      canonicalWord,
      item.part || "unknown",
      item.zh || "",
      item.en || "",
      item.ipa || "",
      item.level || "A1",
      item.tags || [],
      acceptedAnswers,
      item.nearAnswers || [],
      source
    ]
  );

  const wordId = wordResult.rows[0].id;
  const examples = Array.isArray(item.examples) && item.examples.length ? item.examples : null;
  // Senses are only replaced when the caller provides a non-empty list, so
  // saves that don't know about senses (imports, example refreshes) keep the
  // existing ones.
  const senses = Array.isArray(item.senses) && item.senses.length ? item.senses : null;
  if (examples || senses) {
    await withTransaction(async (client) => {
      if (examples) {
        await client.query("delete from examples where word_id = $1 and source = $2", [wordId, source]);
        for (const example of examples) {
          await client.query("insert into examples (word_id, es, zh, en, source) values ($1, $2, $3, $4, $5)", [
            wordId,
            example.es,
            example.zh || "",
            example.en || "",
            source
          ]);
        }
      }
      if (senses) {
        await client.query("delete from word_senses where word_id = $1", [wordId]);
        for (const [index, sense] of senses.entries()) {
          await client.query("insert into word_senses (word_id, part, zh, en, ord) values ($1, $2, $3, $4, $5)", [
            wordId,
            sense.part || "unknown",
            sense.zh || "",
            sense.en || "",
            index
          ]);
        }
      }
    });
  }

  return findWord(canonicalWord);
}

module.exports = { findWord, loadWordBank, saveWord };
