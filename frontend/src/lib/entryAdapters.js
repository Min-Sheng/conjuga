// Vocabulary entry -> word shape adapter, used when a view needs the flat
// "word" shape (word, lemma, formKind, mood, tense, person, ...) from a
// vocabulary entry (which may wrap the word object under entry.word).
export function quizEntryWord(entry) {
  const base = entry.word && typeof entry.word === "object" ? entry.word : entry;
  return {
    ...base,
    id: entry.id || base.id,
    wordId: base.id,
    canonicalWord: base.word,
    word: entry.surfaceForm || base.word,
    lemma: entry.lemma || base.word,
    formKind: entry.formKind || "lemma",
    mood: entry.mood,
    tense: entry.tense,
    person: entry.person
  };
}
