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

async function lookupLexicalInfo(word) {
  const url = new URL(`https://freedictionaryapi.com/api/v1/entries/es/${encodeURIComponent(word)}`);
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    return { part: "", ipa: "", source: "FreeDictionaryAPI unreachable" };
  }
  if (!response.ok) {
    return { part: "", ipa: "", source: "FreeDictionaryAPI miss" };
  }

  try {
    const data = await response.json();
    const entries = Array.isArray(data.entries) ? data.entries : [];
    return {
      part: choosePart(entries),
      ipa: chooseIpa(entries),
      source: "FreeDictionaryAPI"
    };
  } catch (error) {
    return { part: "", ipa: "", source: "FreeDictionaryAPI miss" };
  }
}

module.exports = { lookupLexicalInfo };
