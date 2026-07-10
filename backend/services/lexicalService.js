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

function sensesFromEntries(entries, maxPerPart = 4) {
  const senses = [];
  for (const entry of entries) {
    const part = partMap[entry.partOfSpeech] || entry.partOfSpeech || "unknown";
    let kept = 0;
    for (const sense of entry.senses || []) {
      if (kept >= maxPerPart) break;
      const en = String(sense.definition || "").trim();
      if (!en || INFLECTION_SENSE.test(en)) continue;
      senses.push({ part, zh: "", en });
      kept += 1;
    }
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
