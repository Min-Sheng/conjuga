const { findWord, saveWord } = require("./wordBankService");
const { callAiJson } = require("./aiService");
const { translateText } = require("./translationService");
const { containsTargetWord, generateExamples } = require("./exampleService");
const { lookupLexicalInfo } = require("./lexicalService");
const { recordLookup } = require("./learningService");
const { canonicalizeSpanishWord, uniqueNormalized } = require("../utils/text");

function examplesNeedRefresh(word) {
  return (
    word.source === "lookup generated" &&
    (!Array.isArray(word.examples) ||
      word.examples.length === 0 ||
      word.examples.some((example) => !containsTargetWord(example.es, word.word)))
  );
}

// Pair each sense with its Traditional Chinese translation; tolerate a
// partial or malformed translation list by leaving zh empty (the UI falls
// back to showing the English gloss).
function applySenseTranslations(senses, translations) {
  const list = Array.isArray(translations) ? translations : [];
  return senses.map((sense, index) => ({
    ...sense,
    zh: typeof list[index] === "string" ? list[index].trim() : ""
  }));
}

// One AI call translates every English gloss at once; without an AI key the
// callAiJson fallback kicks in and the senses keep zh: "". The AI must answer
// with an object (json_object response format forbids top-level arrays).
async function localizeSenses(word, senses) {
  if (!senses.length) return senses;
  const result = await callAiJson(
    [
      {
        role: "system",
        content:
          'Return only JSON shaped {"glosses": ["…"]} — one Traditional Chinese string per input gloss, same order. Translate each English dictionary gloss of the given Spanish word into a short Traditional Chinese meaning (no explanations).'
      },
      {
        role: "user",
        content: JSON.stringify({ word, glosses: senses.map((sense) => sense.en) })
      }
    ],
    null
  );
  const translations = Array.isArray(result) ? result : result?.glosses;
  return applySenseTranslations(senses, translations);
}

async function lookupWord(rawWord) {
  const input = String(rawWord || "").trim();
  const text = canonicalizeSpanishWord(input);
  const local = await findWord(text);
  if (local) {
    if (examplesNeedRefresh(local)) {
      const examples = await generateExamples(local);
      const savedWord = await saveWord({ ...local, examples: examples.examples }, "lookup generated");
      return { word: savedWord, source: `local word bank + refreshed ${examples.source}` };
    }
    return { word: local, source: "local word bank" };
  }

  const [zh, en, lexical] = await Promise.all([
    translateText(text, "zh-TW"),
    translateText(text, "en"),
    lookupLexicalInfo(text)
  ]);
  const baseWord = {
    word: text,
    part: lexical.part || "unknown",
    zh: zh || "尚無中文翻譯",
    en: en || "No English translation yet",
    ipa: lexical.ipa || "待補",
    level: "A1",
    tags: [],
    acceptedAnswers: uniqueNormalized([text, input]),
    nearAnswers: [],
    examples: []
  };
  const [examples, senses] = await Promise.all([
    generateExamples(baseWord),
    localizeSenses(text, lexical.senses || [])
  ]);

  const generatedWord = {
    ...baseWord,
    senses,
    examples: examples.examples
  };
  const translationSource = process.env.TRANSLATION_PROVIDER === "google" ? "Google Translate" : "AI translation";
  const savedWord = await saveWord(generatedWord, "lookup generated");
  const sources = [
    zh || en ? translationSource : "local fallback translation",
    lexical.part || lexical.ipa ? lexical.source : "lexical fallback",
    examples.source
  ];

  return {
    word: savedWord,
    source: sources.join(" + ")
  };
}

// Parts that don't justify a standalone entry for a conjugated surface form:
// dictionary miss, unknown, or a verb-only reading (the infinitive entry
// already covers those).
const VERB_ONLY_PARTS = new Set(["", "unknown", "verbo"]);

// A conjugated form can double as a standalone word (esposa: wife / esposar,
// vino: wine / venir). Return that word's entry when the word bank or the
// dictionary knows the surface form as a non-verb headword; never fabricate
// entries for forms that only exist as conjugations (fui).
async function lookupStandaloneSurfaceWord(surfaceForm, mainWordId) {
  try {
    const existing = await findWord(surfaceForm);
    if (existing) return existing.id === mainWordId ? null : existing;
    const lexical = await lookupLexicalInfo(surfaceForm);
    if (VERB_ONLY_PARTS.has(String(lexical.part || "").trim().toLowerCase())) return null;
    const generated = await lookupWord(surfaceForm);
    return generated.word;
  } catch {
    return null;
  }
}

async function lookupWithSurfaceForm({ word, surfaceForm: rawSurfaceForm, learnerId }) {
  const result = await lookupWord(word);
  const surfaceForm = String(rawSurfaceForm || word || "").trim().toLowerCase();
  let responseWord = result.word;
  let surfaceWord = null;

  if (surfaceForm && surfaceForm !== result.word?.word) {
    surfaceWord = await lookupStandaloneSurfaceWord(surfaceForm, result.word?.id);
    const generated = await generateExamples({ ...result.word, word: surfaceForm });
    const firstExample = generated.examples.find((example) =>
      String(example.es || "").toLowerCase().includes(surfaceForm)
    );
    if (firstExample) {
      responseWord = {
        ...result.word,
        examples: [
          firstExample,
          ...(result.word.examples || []).filter((example) => example.es !== firstExample.es)
        ].slice(0, 2)
      };
    }
  }

  await recordLookup({
    learnerId,
    wordId: result.word?.id,
    queryText: surfaceForm || word,
    source: result.source
  });

  return { ...result, word: responseWord, surfaceWord };
}

module.exports = { lookupWithSurfaceForm, lookupWord, applySenseTranslations, localizeSenses };
