function normalizeTarget(target) {
  if (target === "zh" || target === "zh-TW") return "zh-TW";
  if (target === "en") return "en";
  return target;
}

function scoreMyMemoryMatch(match) {
  const quality = Number(match.quality || 0);
  const usage = Number(match["usage-count"] || 0);
  const matchScore = Number(match.match || 0);
  return quality * 100 + usage + matchScore;
}

function isLikelyTargetTranslation(text, target) {
  const value = String(text || "").trim();
  if (!value) return false;
  if (normalizeTarget(target) === "zh-TW") {
    return /[\u3400-\u9fff]/.test(value) && !/[\u0600-\u06ff]/.test(value);
  }
  return true;
}

function chooseMyMemoryTranslation(data, target) {
  const matches = Array.isArray(data.matches) ? data.matches : [];
  const qualityMatches = matches
    .filter((match) => String(match.translation || "").trim())
    .filter((match) => isLikelyTargetTranslation(match.translation, target))
    .filter((match) => Number(match.quality || 0) > 0)
    .sort((a, b) => scoreMyMemoryMatch(b) - scoreMyMemoryMatch(a));

  if (qualityMatches[0]) return qualityMatches[0].translation;
  if (isLikelyTargetTranslation(data.responseData?.translatedText, target)) {
    return data.responseData.translatedText;
  }
  return "";
}

async function translateWithMyMemory(text, target) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `es|${normalizeTarget(target)}`);
  if (process.env.MYMEMORY_EMAIL) {
    url.searchParams.set("de", process.env.MYMEMORY_EMAIL);
  }

  const response = await fetch(url);
  if (!response.ok) return "";
  const data = await response.json();
  return chooseMyMemoryTranslation(data, target);
}

async function translateWithGoogle(text, target) {
  if (!process.env.GOOGLE_TRANSLATE_API_KEY) return "";
  const url = new URL("https://translation.googleapis.com/language/translate/v2");
  url.searchParams.set("key", process.env.GOOGLE_TRANSLATE_API_KEY);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: text, source: "es", target, format: "text" })
  });

  if (!response.ok) return "";
  const data = await response.json();
  return data.data?.translations?.[0]?.translatedText || "";
}

async function translateText(text, target) {
  const provider = process.env.TRANSLATION_PROVIDER || "mymemory";

  if (provider === "google") {
    return translateWithGoogle(text, target);
  }

  return translateWithMyMemory(text, target);
}

module.exports = { translateText };
