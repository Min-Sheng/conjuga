// Shared SQL fragment: aggregate a word's examples into a JSON array,
// ordered by creation time, defaulting to '[]' when there are none.
// Used by wordBankService (loadWordBank, findWord) and vocabularyService
// (VOCABULARY_SELECT). Requires the query to `left join examples e on
// e.word_id = w.id` and `group by` the word's primary key column(s).
const EXAMPLES_JSON_AGG = `
  coalesce(
    json_agg(json_build_object('id', e.id, 'es', e.es, 'zh', e.zh, 'en', e.en) order by e.created_at)
    filter (where e.id is not null),
    '[]'
  )
`;

module.exports = { EXAMPLES_JSON_AGG };
