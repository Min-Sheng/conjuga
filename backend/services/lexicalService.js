const partMap = {
  adjective: "adjetivo",
  adverb: "adverbio",
  conjunction: "conjunción",
  determiner: "determinante",
  interjection: "interjección",
  noun: "sustantivo",
  numeral: "numeral",
  preposition: "preposición",
  pronoun: "pronombre",
  verb: "verbo"
};

function chooseIpa(entries) {
  const pronunciations = entries.flatMap((entry) => entry.pronunciations || []);
  const phonemic = pronunciations.find((item) => item.type === "ipa" && item.text?.startsWith("/"));
  const anyIpa = pronunciations.find((item) => item.type === "ipa" && item.text);
  return phonemic?.text || anyIpa?.text || "";
}

function choosePart(entries) {
  const part = entries.find((entry) => entry.partOfSpeech)?.partOfSpeech;
  return partMap[part] || part || "";
}

// Wiktionary-style "first-person singular present indicative of bancar"
// entries describe inflections, not meanings; keep them out of the sense list.
const INFLECTION_SENSE = /\b(indicative|subjunctive|imperative|participle|gerund|preterite|infinitive|inflection|form)\s+of\b/i;

// Senses carrying these tags never belong in a learning app's meaning list.
const EXCLUDED_TAGS = new Set(["vulgar", "offensive", "obscene", "derogatory"]);
// These are only dropped when the word also has standard senses — a word
// that is itself colloquial (e.g. guay) keeps its meanings.
const INFORMAL_TAGS = new Set(["colloquial", "slang"]);

function sensesFromEntries(entries, maxPerPart = 4) {
  const candidates = [];
  for (const entry of entries) {
    const part = partMap[entry.partOfSpeech] || entry.partOfSpeech || "unknown";
    for (const sense of entry.senses || []) {
      const en = String(sense.definition || "").trim();
      const tags = (sense.tags || []).map((tag) => String(tag).toLowerCase());
      if (!en || tags.includes("form of") || INFLECTION_SENSE.test(en)) continue;
      if (tags.some((tag) => EXCLUDED_TAGS.has(tag))) continue;
      candidates.push({ part, en, informal: tags.some((tag) => INFORMAL_TAGS.has(tag)) });
    }
  }

  const standard = candidates.filter((candidate) => !candidate.informal);
  const chosen = standard.length ? standard : candidates;

  const perPartCount = {};
  const senses = [];
  for (const { part, en } of chosen) {
    perPartCount[part] = (perPartCount[part] || 0) + 1;
    if (perPartCount[part] > maxPerPart) continue;
    senses.push({ part, zh: "", en });
  }
  return senses;
}

async function lookupLexicalInfo(word) {
  const url = new URL(`https://freedictionaryapi.com/api/v1/entries/es/${encodeURIComponent(word)}`);
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    return { part: "", ipa: "", senses: [], source: "FreeDictionaryAPI unreachable" };
  }
  if (!response.ok) {
    return { part: "", ipa: "", senses: [], source: "FreeDictionaryAPI miss" };
  }

  try {
    const data = await response.json();
    const entries = Array.isArray(data.entries) ? data.entries : [];
    return {
      part: choosePart(entries),
      ipa: chooseIpa(entries),
      senses: sensesFromEntries(entries),
      source: "FreeDictionaryAPI"
    };
  } catch (error) {
    return { part: "", ipa: "", senses: [], source: "FreeDictionaryAPI miss" };
  }
}

module.exports = { lookupLexicalInfo, sensesFromEntries };
