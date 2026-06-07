require("../config/env");
const fs = require("node:fs/promises");
const path = require("node:path");
const { closePool, query } = require("../db/client");

async function upsertWord(item) {
  const wordResult = await query(
    `insert into words (word, part, zh, en, ipa, level, tags, accepted_answers, near_answers, source)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'json import')
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
     returning id`,
    [
      item.word,
      item.part || "unknown",
      item.zh || "",
      item.en || "",
      item.ipa || "",
      item.level || "A1",
      item.tags || [],
      item.acceptedAnswers || [item.word],
      item.nearAnswers || []
    ]
  );

  const wordId = wordResult.rows[0].id;
  await query("delete from examples where word_id = $1 and source = 'json import'", [wordId]);

  for (const example of item.examples || []) {
    await query(
      "insert into examples (word_id, es, zh, en, source) values ($1, $2, $3, $4, 'json import')",
      [wordId, example.es, example.zh || "", example.en || ""]
    );
  }
}

async function main() {
  const words = JSON.parse(await fs.readFile(path.join(__dirname, "..", "data", "words.json"), "utf8"));
  for (const word of words) {
    await upsertWord(word);
  }
  console.log(`Imported ${words.length} words.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closePool);
