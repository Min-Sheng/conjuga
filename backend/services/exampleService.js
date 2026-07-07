const { callAiJson } = require("./aiService");
const { translateText } = require("./translationService");

function spanishTokens(text) {
  return String(text || "").toLowerCase().match(/[a-záéíóúüñ]+/gi) || [];
}

function containsTargetWord(sentence, word) {
  const target = String(word || "").trim().toLowerCase();
  if (!target) return false;
  if (target.includes(" ")) return String(sentence || "").toLowerCase().includes(target);
  return spanishTokens(sentence).includes(target);
}

function fallbackExamples(word) {
  return [
    {
      es: `Uso ${word.word} en una frase corta.`,
      zh: `我在一個短句中使用 ${word.word}。`,
      en: `I use ${word.word} in a short sentence.`
    },
    {
      es: `Quiero recordar ${word.word} hoy.`,
      zh: `我今天想記住 ${word.word}。`,
      en: `I want to remember ${word.word} today.`
    }
  ];
}

function extractExamples(result) {
  return Array.isArray(result.examples)
    ? result.examples
    : Array.isArray(result.schema?.examples)
      ? result.schema.examples
      : Array.isArray(result.requiredOutput?.examples)
        ? result.requiredOutput.examples
        : [];
}

async function requestAiExamples(word, retry = false) {
  return callAiJson(
    [
      {
        role: "system",
        content:
          "Return only a JSON object shaped like {\"examples\":[{\"es\":\"...\",\"zh\":\"...\",\"en\":\"...\"}]}. Generate two beginner-friendly Spanish sentences. Every Spanish sentence in es MUST contain the exact target word exactly as written, including accents and ñ. zh must be a natural Traditional Chinese translation, not romanization or pronunciation. en must be a natural English translation. Do not echo the schema or input."
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "Generate Spanish examples for this vocabulary word.",
          targetWord: word.word,
          word,
          outputRules: [
            "top-level examples array only",
            `each es sentence must include the exact token ${word.word}`,
            "zh uses Traditional Chinese",
            "en uses English",
            retry ? "This is a retry because a previous answer omitted the target word." : "No sentence may omit the target word."
          ]
        })
      }
    ],
    { examples: [] }
  );
}

async function generateExamples(word) {
  const fallback = { examples: fallbackExamples(word), source: "local fallback" };
  const firstResult = await requestAiExamples(word);
  let examples = extractExamples(firstResult).filter((example) => containsTargetWord(example.es, word.word));

  if (examples.length < 2) {
    const retryResult = await requestAiExamples(word, true);
    examples = extractExamples(retryResult).filter((example) => containsTargetWord(example.es, word.word));
  }

  const usedAi = examples.length > 0;
  const translatedExamples = await Promise.all(
    examples.slice(0, 2).map(async (example) => ({
      es: example.es,
      zh: example.zh || (await translateText(example.es, "zh-TW")) || "",
      en: example.en || (await translateText(example.es, "en")) || ""
    }))
  );

  return {
    examples: translatedExamples.length ? translatedExamples : fallback.examples,
    source: usedAi ? "Groq AI examples" : fallback.source,
    usedAi
  };
}

module.exports = { containsTargetWord, generateExamples };
