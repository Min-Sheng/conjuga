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

// Shared SQL fragment: aggregate a word's senses (multiple meanings across
// parts of speech) into a JSON array ordered by `ord`. Written as a
// correlated subquery so it composes with other joins without producing a
// cartesian product; requires the outer query to alias words as `w`.
const SENSES_JSON = `
  (select coalesce(
     json_agg(json_build_object('part', s.part, 'zh', s.zh, 'en', s.en) order by s.ord),
     '[]'
   )
   from word_senses s
   where s.word_id = w.id)
`;

module.exports = { EXAMPLES_JSON_AGG, SENSES_JSON };
