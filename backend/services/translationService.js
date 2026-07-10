const { callAiJson } = require("./aiService");

function normalizeTarget(target) {
  if (target === "zh" || target === "zh-TW") return "zh-TW";
  if (target === "en") return "en";
  return target;
}

// Default translator: the same AI pipeline that powers examples and word
// senses. Returns "" when no AI key is configured or the call fails, so
// callers keep their existing fallbacks (e.g. 尚無中文翻譯).
async function translateWithAi(text, target) {
  const language = normalizeTarget(target) === "zh-TW" ? "Traditional Chinese (zh-TW)" : "English";
  const result = await callAiJson(
    [
      {
        role: "system",
        content: `Return only JSON shaped {"translation": "…"}. Translate the given Spanish text into ${language}: a short, natural dictionary-style rendering with no explanations.`
      },
      { role: "user", content: JSON.stringify({ spanish: text }) }
    ],
    null
  );
  return typeof result?.translation === "string" ? result.translation.trim() : "";
}

async function translateWithGoogle(text, target) {
  if (!process.env.GOOGLE_TRANSLATE_API_KEY) return "";
  const url = new URL("https://translation.googleapis.com/language/translate/v2");
  url.searchParams.set("key", process.env.GOOGLE_TRANSLATE_API_KEY);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: "es", target: normalizeTarget(target), format: "text" })
    });
  } catch (error) {
    return "";
  }

  if (!response.ok) return "";
  try {
    const data = await response.json();
    return data.data?.translations?.[0]?.translatedText || "";
  } catch (error) {
    return "";
  }
}

async function translateText(text, target) {
  if (process.env.TRANSLATION_PROVIDER === "google") {
    return translateWithGoogle(text, target);
  }
  return translateWithAi(text, target);
}

module.exports = { translateText };
