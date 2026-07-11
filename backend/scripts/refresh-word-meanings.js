// Re-enrich auto-generated words with the current translation/sense pipeline.
// Words created while the old MyMemory translator (or the pre-fix senses
// code) was active keep whatever it stored; this rewrites their zh/en and
// senses in place — rows are updated, never deleted, so learner vocabulary
// and review progress that reference them stay intact. Seed words
// (source 'json import') are hand-curated and left untouched.
require("../config/env");
const { closePool, query } = require("../db/client");
const { findWord, saveWord } = require("../services/wordBankService");
const { translateText } = require("../services/translationService");
const { lookupLexicalInfo } = require("../services/lexicalService");
const { localizeSenses } = require("../services/lookupService");

const PAUSE_BETWEEN_WORDS_MS = 1500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const result = await query(
    "select word from words where source = 'lookup generated' order by word"
  );
  if (!result.rows.length) {
    console.log("No generated words to refresh.");
    return;
  }

  let first = true;
  for (const { word } of result.rows) {
    // Each word costs several AI calls; pace them so free-tier rate limits
    // don't silently turn translations into empty strings.
    if (!first) await sleep(PAUSE_BETWEEN_WORDS_MS);
    first = false;
    const existing = await findWord(word);
    if (!existing) continue;

    const [zh, en, lexical] = await Promise.all([
      translateText(word, "zh-TW"),
      translateText(word, "en"),
      lookupLexicalInfo(word)
    ]);
    const senses = await localizeSenses(word, lexical.senses || []);

    const updated = {
      ...existing,
      zh: zh || existing.zh,
      en: en || existing.en,
      senses: senses.length ? senses : existing.senses,
      examples: null
    };
    await saveWord(updated, existing.source || "lookup generated");
    console.log(`${word}: zh "${existing.zh}" -> "${updated.zh}", senses ${senses.length || existing.senses.length}`);
  }
  console.log(`Refreshed ${result.rows.length} generated words.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closePool);
